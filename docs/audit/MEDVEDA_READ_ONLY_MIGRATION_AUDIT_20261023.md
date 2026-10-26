# MedVeda read-only Supabase migration audit — 2026-10-23 UTC

## Verdict and evidence boundary

**Production NO-GO.** The **exact current pending count cannot be verified** because the live migration-history command failed before retrieving history. The last saved production snapshot (2026-10-20) had **61 recorded versions, 62 local files, 61 version matches, 1 local-only candidate, and 0 remote-only versions**. The candidate was `20261020104000_course_wide_content_browsing.sql`. The local file still has the SHA-256 recorded with that audit: `5d7428d45beeffdbff1ee6bcb3ebdc21d56ed7cbea8111221578530f42aa2b49`. This is a **historical comparison**, not proof that the migration remains pending on 2026-10-23.

The checkout's `supabase/.temp/project-ref` is `xbvenkfmesugrbjuufyw`. `supabase/.temp/linked-project.json` names it **MedVeda**; the existing staging audit and mobile production profile identify that ref as **production**. The separate staging ref in `supabase/staging/README.md` is `nsmsqsogedzohwboripd`. The active admin-panel tab was not used as a credential source. No credential value is included here.

I attempted the requested `npx --no-install supabase migration list` in this checkout; it produced no history and was stopped after waiting. A cached CLI binary was then run with CLI state redirected to `/tmp` and the existing access token passed without printing it: `supabase migration list --linked`. It failed with `DbConfigLoginRoleNetworkError: failed to initialise login role: TransportError`. The first direct cached-CLI attempt also failed locally because its telemetry write targeted a read-only home directory; the `/tmp` retry removed that local error. No remote migration list or live catalog was returned. The CLI may try to initialize a temporary login role; no successful remote operation or migration execution was observed. No database writes, deployments, file edits to migrations, service installation, or local database creation were performed.

## History comparison

| Category | Current, 2026-10-23 | Last saved production snapshot, 2026-10-20 |
| --- | --- | --- |
| Local SQL migration files | **62** | 62 |
| Remote recorded versions | **Unknown** | 61 |
| Applied, by matching version | **Unknown** | 61 (list below) |
| Pending local files | **Unknown** | 1: `20261020104000_course_wide_content_browsing.sql` |
| Remote-only versions | **Unknown** | 0 |
| Same-version content/name mismatches | **Unknown** | 1 historically documented collision: version `20260801` |

The saved CLI history JSON in `docs/audit/evidence/publication-parent-fix-20261020/remote-migration-history-readonly.json` lists versions, not remote SQL checksums. Thus **61 matching versions does not establish 61 identical migration bodies**. The separate `supabase/staging/MIGRATION_SAFETY_AUDIT.md` records that production's `20260801` was named `razorpay_webhook_atomic_grant` and contained Razorpay SQL already recorded again under `20260801150000`, whereas local `20260801_auth_verified_identities.sql` contains different Auth/profile SQL. Treat this as a **historically documented same-version mismatch**, even though version-only comparison reports it applied. The multi-course migration subsequently adds the missing profile columns idempotently, but this does not make the local `20260801` file applied. No other mismatch can be certified or excluded without live definitions/history. By version, there were zero remote-only entries; by filename/content, the historical remote `20260801_razorpay_webhook_atomic_grant` differs from local `20260801_auth_verified_identities.sql`.

Historical matching-version local filenames (not asserted to have identical remote SQL):

```text
20260701000000_baseline_live_schema.sql
20260718_payment_backend.sql
20260721_admin_orders_purchases_access.sql
20260801150000_razorpay_webhook_atomic_grant.sql
20260801_auth_verified_identities.sql [VERSION COLLISION; DIFFERENT REMOTE CONTENT]
20260919120000_multi_course_and_referrals.sql
20260919130000_referral_history_rpc.sql
20260920120000_null_year_course_fallback.sql
20260920130000_app_config.sql
20260920140000_default_new_profile_course.sql
20260921120000_analytics_retention.sql
20260921130000_account_deletion_support.sql
20260922100000_phase1a_sync_and_order_security.sql
20260923100000_signup_profile_fields.sql
20260924100000_critical1_lock_settlement_functions.sql
20260924110000_critical2_orders_server_only.sql
20260924120000_critical3_storage_profiles_rls.sql
20260924130000_signup_name_phone_and_backfill.sql
20260924140000_auth_rate_limits.sql
20260924150000_free_preview.sql
20260925100000_phase2_referral_config_and_product_type.sql
20260925110000_phase2_wallet_ledger.sql
20260925120000_phase2_orders_pricing_and_settlement.sql
20260925130000_drop_debug_whoami.sql
20260925140000_phase2_single_use_friend_discount.sql
20260926100000_batch1_refund_dispute_revoke_access.sql
20260926110000_batch1_settle_wallet_and_flags.sql
20260926120000_batch1_block_owned_product.sql
20260926130000_batch1_hygiene.sql
20260927100000_f7_drop_legacy_admin_policies.sql
20260927110000_f8_revoke_excess_grants.sql
20260927120000_batch3_referral_hardening.sql
20260927130000_batch3b_antifarming.sql
20260928100000_referral_settings_limits_and_audit.sql
20260928110000_referral_off_blocks_wallet.sql
20260929100000_high_phone_change_rpc_and_notes_storage.sql
20260930100000_medium_db_hardening.sql
20260930110000_low_grants_tightening.sql
20261001100000_admin_mfa_aal2.sql
20261012100000_google_play_ucb.sql
20261012110000_google_play_refunds.sql
20261012120000_ucb_partial_refunds.sql
20261013090000_ucb_atomic_completion.sql
20261013100000_wallet_reservations.sql
20261013110000_play_void_cursor.sql
20261014100000_payment_audit_capture_inbox.sql
20261014110000_payment_job_leases.sql
20261015100000_play_payment_jobs.sql
20261015120000_play_entitlement_order_snapshot.sql
20261016090000_free_video_access.sql
20261016100000_play_catalog_sync.sql
20261018100000_verified_quiz_attempts.sql
20261018110000_trusted_note_uploads.sql
20261018120000_note_upload_deleted_retry.sql
20261018130000_note_pdf_quarantine.sql
20261019150000_play_catalog_queue_fences.sql
20261019151000_play_duplicate_settlement_result.sql
20261020100000_notes_service_reads.sql
20261020101000_maintenance_mode_read.sql
20261020102000_correct_stale_store_url.sql
20261020103000_first_purchase_identity_retention.sql
```

## Pending-candidate SQL review, chronological order

There was **one** pending file in the saved history, so this is the full pending-candidate table. If current history differs, inspect every newly pending file before making a deployment decision.

| Migration | Purpose | Required objects and earlier migrations | Risks and checks | Status |
| --- | --- | --- | --- | --- |
| `20261020104000_course_wide_content_browsing.sql` | Let signed-in students browse every active year in their course; add ancestor-publication guards to six content/product SELECT policies; replace note/video URL and quiz authorization helpers. | `courses`, `years`, `subjects`, `chapters`, `notes`, `videos`, `quiz_tests`, `products`, `profiles`, `purchases`, `admins` from baseline/multi-course; `am_i_admin`/MFA; `verified_quiz_attempts` and `rate_limit_hit`; service-only note/video grants and private notes policy. | `CREATE POLICY` names are unique in local files but are not rerunnable; live duplicate/drift unverified. Six policy additions take table locks until commit. `CREATE OR REPLACE FUNCTION` changes authorization immediately. No top-level DML/backfill, table drop, column drop, or price/purchase change. Transaction gives atomic SQL rollback on error; reverting deployed behavior needs a new forward migration, and issued signed URLs/offline copies are not revoked. Runtime and live schema checks unavailable. | **BLOCKED** for production; static source review passes core dependency/order and access checks. |

I read all 278 lines of this candidate. It starts with `BEGIN` and ends with `COMMIT`; statements are balanced and use existing local signatures. No dynamic SQL or unqualified table lookup appears in the new definer functions. `content_is_published` and replaced SQL helpers use fixed `search_path = public`, schema-qualified tables/functions, and no caller-supplied relation names. `submit_quiz_attempt` uses `search_path = public, pg_temp`. No `DROP`, `TRUNCATE`, `ALTER TABLE`, data update, or cron scheduling appears in this file. Its quiz attempt insert is runtime behavior when users call the RPC, not migration-time DML. A prior 2026-10-20 scratch-database full-chain run in `docs/audit/evidence/publication-parent-fix-20261020/full-suite-final.log` reported all suites passed, including publication, RLS, Play, and payment checks; the current run did **not** replay migrations, and there was no available disposable PostgreSQL instance (`pg_isready` reported no server). The local migration hashes match all 62 entries of `supabase/staging/reviewed-source-sha256.json`, including the candidate, but that manifest is a local review artifact, not remote attestation.

### Access and application findings

- **Course and year browsing:** `has_content_access` checks the caller's profile course without using profile year. Active target course/year is required by `content_is_published`; the existing successful-purchase branch remains scoped to the purchase course/year/scope. This is intended to expose all active years to a student in that course while retaining earlier paid access to a prior course. Mobile repositories query active content broadly and rely on RLS for course and ancestor filtering; the admin panel uses the same client role but admin policies and `am_i_admin` gate editing.
- **Published ancestors:** New restrictive policies for subjects, chapters, notes, videos, tests, and products add active ancestor checks to existing permissive course/entitlement policies for `authenticated`. The helper checks actual parent IDs and course/year consistency. The older 2026-10-20 local reproduction of an inactive-parent leak was fixed; the revised local suite recorded 1,384 assertions. Actual remote policy set and `relrowsecurity` cannot be confirmed now. Policies are scoped to `authenticated`; anonymous access still depends on the earlier removal of legacy public SELECT policies and must be checked live before rollout.
- **Paid notes:** `user_can_access_note` requires a nonblocked profile, an active note and ancestors, then an eligible free preview, admin, or successful scoped purchase. The `get-note-url` Edge handler obtains the caller from verified Auth, calls the helper using service role, and signs a private-bucket object for 120 seconds only if allowed. The earlier `notes_service_reads_only` restrictive Storage policy blocks direct student reads. This migration keeps service-role-only EXECUTE on note/video helpers. Hosted bucket/policy/function deployment and real signed URL behavior remain unverified. Previously signed URLs and downloaded files remain valid under their existing lifetimes/offline policy.
- **Free videos:** `user_can_access_video` requires a nonblocked profile, active video and ancestors, and same-course registration, admin, or an existing scoped prior-course purchase. It does **not** require buying the video. The Edge handler derives identity from Auth and calls the service-only helper; YouTube links already learned cannot be revoked by RLS.
- **Quizzes:** New `submit_quiz_attempt` checks profile, publication, course access and subject relationship before a fresh scored insert; it preserves same-user idempotent retry. Its grant to `authenticated` persists from `20261018100000`. **Pre-existing answer exposure:** `quiz_tests.questions` stores each question's `answer`, while authenticated catalogue SELECT permits `select("*")` and mobile `getQuizTestById` fetches that JSON. Any authorized student can inspect correct answers before submission; server scoring cannot prevent that. This is quiz-integrity/data exposure, not a purchase entitlement grant, and the pending migration does not fix it.
- **Admin MFA gap:** the new note/video helper admin exception checks membership in `public.admins` directly, while the normal admin RLS gate `am_i_admin()` can require AAL2 when the switch is enabled. An authenticated admin account lacking AAL2 can still obtain note/video URLs through those handlers if it meets the other helper conditions. This follows the pre-existing helper design and should be aligned with the intended MFA rule before claiming MFA covers all admin content paths.
- **Google Play:** This candidate does not touch Play price, orders, tokens, payments, purchases, or settlement functions. `create-play-order` and `verify-play-purchase` authenticate the bearer user in the Edge handler; the latter checks the order owner/product/provider and Google purchase/account/order identifiers before calling a service-only settlement RPC. Earlier SQL revokes client EXECUTE on `create_play_order` and `settle_play_purchase`. The local 2026-10-20 full suite exercised these paths; hosted Google credentials, deployment version, and live grants cannot be verified now. An administrative Play SKU/permission problem discussed in other audits is outside this SQL change.
- **Earlier migration interactions:** `20260919120000` installs course-scoped RLS; `20260927100000` removes legacy broad content policies; `20260927110000` revokes excess grants; `20260930100000` limits helper grants; `20261001100000` adds optional admin AAL2; `20261016090000` makes videos free; `20261018100000` adds verified attempts; `20261020100000` makes notes service-read-only. The pending file depends on all of these being actually present remotely. The documented `20260801` history collision is a separate migration-history integrity issue.

### Deployment, lock, data, and rollback risks

The pending candidate contains no migration-time row updates, deletes, seed writes, or destructive DDL. It adds six policies and replaces five functions inside one transaction. Policy creation and function replacement may wait on concurrent catalogue reads and block new reads/writes until commit; no production-size lock timing was measured. A pre-existing policy with any of the six names would abort the transaction; the file does not use `DROP POLICY IF EXISTS` or `CREATE POLICY IF NOT EXISTS`, which is appropriate for history-controlled application but not idempotent for manual reruns. Existing malformed content ancestry will become hidden, so a read-only aggregate check of active children beneath inactive/mismatched parents is needed before rollout. No data is migrated; successful purchases remain stored but publication can temporarily hide their content. Failed application should roll back atomically; after a successful application, rollback requires a reviewed forward migration and cannot recall signed URLs, cached data, or downloaded bytes.

## Minimal safe next steps

1. Restore read-only remote access and rerun `supabase migration list --linked`; compare every local version with live history. Read the remote migration metadata/definitions for the `20260801` collision rather than equating matching version strings with identical SQL. Stop if the pending set differs from the historical single candidate.
2. Inspect live catalog **with read-only SELECTs** for the six policy names and their permissive/restrictive composition, table RLS/grants, five affected function definitions/owners/EXECUTE grants, private notes Storage policies, and parent/child consistency aggregates. Check for any manually created duplicate policy names and verify the actual Edge deployment/configuration.
3. Validate the exact pending SQL and application paths on the already prepared **isolated staging project or a disposable local Supabase-compatible database**, with synthetic users/content only. Test all years, inactive ancestors, cross-course isolation, paid/refunded/blocked note access, free videos, quiz submissions, admin AAL1/AAL2 behavior, and Play purchase authorization. The 2026-10-20 local suite is useful prior evidence but cannot replace current hosted acceptance.
4. Resolve the quiz answer disclosure and decide the admin MFA rule for note/video URLs; record explicit acceptance if those are allowed product behaviors. Reassess production only after current history and staging checks are complete. This audit authorizes **no push, migration up/repair/reset, SQL write, or deployment**.

## Sources inspected

Local migrations (all filenames and review-manifest hashes; complete pending candidate), `supabase/config.toml`, relevant mobile repositories/services, admin-panel Supabase config/year/quiz paths, `get-note-url`, `get-video-url`, `create-play-order`, `verify-play-purchase`, the 2026-10-20 history JSON and validation logs, and the 2026-10-23 staging safety audit. No `.env` value was printed or copied into this report.
