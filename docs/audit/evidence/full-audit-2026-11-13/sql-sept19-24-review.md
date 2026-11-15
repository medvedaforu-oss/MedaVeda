# Sept 19–24 SQL historical tranche — complete unique-source review

Read-only; 15 actual migration files, 226,427 bytes, 5,208 lines. Exact per-file SHA-256 and complete line coverage are in `sql-sept19-24-reviewed.txt`. No SQL, provider request, deploy, or application edit was performed. The tranche includes all timestamps 20260919000000 through 20260924999999 inclusive. No filename or search result is counted as a full read.

The 102 KB Phase1A consolidation repeats seven complete migrations. Its prefix and unique hardening suffix were read directly. Its seven folded blocks were compared in full against the separately fully read original files; every exact matching text span has original/actual line mapping and SHA-256 in the ledger. The complete differences were read: removed nested transaction boundaries, a deliberately retained legacy storage policy, and the new `delete_my_account()` wrapper. Thus no changed body/DDL/policy/grant was skipped under a claim that the file was merely similar. Other 14 files were read fully, without dedup; Critical2 had also been read fully in the earlier admin/service contract audit.

## Coverage and security reasoning

- `20260919120000_multi_course_and_referrals.sql` (1–1412): reviewed full transaction, preflight, course seeds, column/FK additions, every data backfill and fallback, NOT NULL assertions, every hierarchy/index, all derive/propagate trigger bodies, profile guard and bypass, course/year access helpers, course/year setter, policies and retirement of permissive legacy SELECT rules, Storage note substring matching, complete Razorpay settlement, referral schema/code generation/application, all grants and final checks. Course IDs are derived from actual immediate parents, bundles check all IDs/course consistency, profile setter checks active selected course/year and auth.uid. Original grants revoked PUBLIC only and must not be assumed server-only under Supabase's direct default grants.
- `20260919130000_referral_history_rpc.sql`: full own-referrer filter and first-name-only projection, SQL definer and grants. Later Sept27 replacement explicitly revokes anon and blocks inappropriate access; do not treat the earliest ACL as final.
- `20260920120000_null_year_course_fallback.sql`: full temporary NULL-year branch; it broadens same-course free metadata, not PDF storage entitlement. Later Oct20 course-wide browsing deliberately supersedes year restriction.
- `20260920130000_app_config.sql`: complete public key/value table, check constraints, touch trigger, explicit role grants and separate read/insert/update/delete policies. Stored values are public by design. Incorrect old package store URL is corrected by `20261020102000_correct_stale_store_url.sql`; not a current fresh finding.
- `20260920140000_default_new_profile_course.sql`: complete insert-only BAMS fallback; it does not change explicit other-course values. This is a compatibility behavior, not an admin authorization source.
- `20260921120000_analytics_retention.sql`: full service-only purge functions/indexes, extension-availability handling, two named daily jobs. Failure to enable pg_cron only raises NOTICE, so repository presence does not prove a scheduled retention job. Live job state/overdue aggregates remain an operational evidence requirement.
- `20260921130000_account_deletion_support.sql`: full nullable SET NULL payment/order FKs; full deleted-user settlement branch; all erase_user_data deletes/anonymization/admin guard/service grants; original drops legacy self-delete. Later Phase1A restores a wrapper (candidate below); later wallet/antifarming migrations replace erasure and must be used for final retention conclusions.
- `20260922100000_phase1a_sync_and_order_security.sql`: complete actual unique source plus exact-span dedup; snapshot count/bucket/policy preflight; all B1–B5 RPC checks, untrusted order guard, own-profile policies and self-checks; complete legacy wrapper. Payment sessions are a temporary settlement prerequisite, subsequently removed in Critical2's server-only order creation flow. Stored row counts alone are not proof that values or contents did not change.
- `20260923100000_signup_profile_fields.sql`: complete signup trigger reading full_name/name and normalized mobile metadata. Later Sept24 fallback/backfill and Sept29 phone RPC tighten the identity path. Unverified phone signup metadata does not establish phone ownership.
- `20260924100000_critical1_lock_settlement_functions.sql`: full catalog introspection pattern-based EXECUTE revocation, explicit settlement grants, table write revocation and non-SELECT policy removal, role-aware write-block triggers and trusted GUC, postgres default privilege changes, idempotency unique indexes and failclosed self-checks. This closes earlier client grant exposure in the intended chain, subject to final deployed inventory.
- `20260924110000_critical2_orders_server_only.sql`: full client order-write removal, immutable columns, complete settlement replacement with deleted-user handling and explicit null amount validation, service-only grants, narrow admin cancel/fail RPC and self-checks. It grants product data from the then-current catalog: the later November snapshot commitment migrations are required for final behavior; do not report an obsolete September settlement body as current.
- `20260924120000_critical3_storage_profiles_rls.sql`: full private bucket update, policy catalog filtering, warning on non-bucket policies, admin/thumbnails policies, every protected profile field and insert/update guard/self-heal, own-profile update policy and self-checks. The check is lexical, so actual final policy/role inventory is necessary; no proof of a live arbitrary-policy bypass is claimed.
- `20260924130000_signup_name_phone_and_backfill.sql`: complete function prerequisite checks, trigger fallback chain, one-time empty-only name backfill, oldest-metadata phone claimant selection, collision skip, row-count assertions. Existing nonempty phone/name retained.
- `20260924140000_auth_rate_limits.sql`: full service-only fixed-window counter RPC/table and opportunistic cleanup. Window start is calculated before explicit validation, so p_window_seconds=0 would throw division-by-zero; only trusted callers can invoke and no public exploit is established. Fixed-window boundary bursts are an inherent chosen design, not a new vulnerability by themselves.
- `20260924150000_free_preview.sql`: full note/video flag additions, first-active-item backfill, indexes, both explicit-user access helpers and service grants. Later Oct20 publication/course/MFA helper replacements fix overly broad preview/admin branches; quizzes/videos being free is the current product rule, not a paid-video defect.

## Candidate requiring backend final-chain decision

### SQL-S19-01 — Low/Medium hardening — authenticated legacy self-delete bypasses Edge rate limiting

Evidence: `20260922100000_phase1a_sync_and_order_security.sql:1985–2013`:
```sql
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_res jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform set_config('app.trusted_order_write', 'true', true);
  v_res := public.erase_user_data(v_uid);
  if v_res->>'status' = 'admin_blocked' then
    perform set_config('app.trusted_order_write', 'false', true);
    raise exception 'Admin accounts cannot be deleted from the app';
  end if;
  delete from auth.users where id = v_uid;
  perform set_config('app.trusted_order_write', 'false', true);
end; $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
```
No later migration text references `delete_my_account`. Backend reviewer reports live metadata still marks the RPC SECURITY DEFINER and authenticated executable. Current delete-account Edge adds failclosed IP/account rate limits; this compatibility RPC avoids that entrypoint. Ownership is correctly auth.uid-only and admin_blocked is checked; this is NOT BOLA or demonstrated privilege escalation. The wrapper calls the current erase_user_data function, so it does not inherently restore September's old deletion semantics. Latest financial/retention behavior must be resolved by backend reviewer before final severity/issue inclusion. Current Edge apparently also does not require fresh auth, so no claim that only this wrapper bypasses a recent-auth requirement.

Proposed retirement (only after old-client inventory confirms no required callers):
```diff
-grant execute on function public.delete_my_account() to authenticated;
+revoke all on function public.delete_my_account() from public, anon, authenticated;
```
Alternative compatibility proposal: make the legacy RPC perform the same account-level deletion limiter and authoritative erase path, with a carefully owned service implementation. An RPC cannot reproduce a trusted gateway IP rule from arbitrary client input. No ACL change was run.

Manual verification: use a synthetic staging user to compare valid/current JWTs across legacy RPC and Edge, including rate-limited conditions, deleted account, expired session, admin account, and an in-flight settlement. Confirm retained anonymous accounting/identity rows and no cross-owner deletion. Inspect live function definition/ACL and last migration metadata without printing user records/tokens.

## Historical issues closed or operationally conditional, not new final defects

1. September pre-Critical1 SECURITY DEFINER ACLs using only REVOKE PUBLIC: explicit anon/authenticated revocation and default privilege hardening follow in Critical1; final callable-function inventory decides residual exposure.
2. Phase1A deliberately retains public notes/thumbnails access: Critical3 makes bucket private and removes non-admin note policies; Oct trusted-upload paths further harden storage. It is incorrect to label the Phase1A exception as current without final policy evidence.
3. Original settlement trusts mutable product scope at grant time: November immutable commitment/snapshot repairs supersede those bodies.
4. Original previews ignore course/publication and admin MFA: Oct20 helper and restrictive publication migrations supersede them; current admin code uses AAL-aware service paths.
5. Original profile trigger permits direct email/phone changes: Sept29 protected-column and phone RPC migration supersedes it.
6. First referral application and random-code generation lack later rate/concurrency bounds: Sept27 hardening/antifarming replaces those functions. Parent/backend verifies final chain.
7. Automatic retention is unqualified if pg_cron unavailable: source deliberately permits success without scheduled jobs; compare live job active state/last run and overdue counts instead of inferring compliance from successful migration application.

No new confirmed High/Critical final-state SQL defect was established by this historical tranche. This says nothing about unreviewed later bodies; backend reviewer owns complete ordered replay/deployed-parity synthesis.
