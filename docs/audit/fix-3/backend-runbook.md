# Free-only minimum deploy set — OWNER ACTION REQUIRED

Nothing in this task was deployed. Owner executes first in staging, then production after review. Keep all app billing flags unchanged and `purchase_settings.new_orders_enabled=false`. The wallet allocation candidate under fix-4/candidates is BLOCKED and must never be applied. Live credit_expiry_days was read as 30 on 2026-11-14; BACK-11/13 remain unresolved. New-sales denial does not repair historical wallet expiry.

## Exact order for the owner

1. Preserve a reviewed release artifact and database backup; verify the target project is MedVeda (`xbvenkfmesugrbjuufyw`) versus the inactive staging project (`nsmsqsogedzohwboripd`). Resume/qualify staging first. Check Dashboard > Database > Migrations against the file list below; apply only absent migrations, in this order, using the owner's normal migration-history workflow. Do not use a blanket push that also activates retention before approval. Do not edit any applied migration.

| Order | Exact migration | Security scope | Post-apply read-only check | Rollback |
|---|---|---|---|---|
| 1 | `20261112104610_audit_batch1_refund_revocation.sql` | BACK-01/02 reversal/PDF authority | Staging duplicate/refund/reversal replay denies refunded PDF | Stop affected entrypoints, retain inbox/ledger, corrective forward migration |
| 2 | `20261112150427_audit_checkout_publication_guard.sql` | BACK-07/17 publication/checkout boundary | Unpublished product cannot be priced/granted | Keep sales disabled; corrective forward migration |
| 3 | `20261114040000_fix3_content_push_and_delete_guards.sql` | BACK-10/15/17 blocked access, push cap, deprecated deletion RPC | Blocked JWT denied video/content; token cap test; old RPC has no effective EXECUTE | Correct forward; never reopen broad access/deletion RPC |
| 4 | `20261114040100_fix3_flag_resolution_row_count.sql` | BACK-12 exact affected row result | Missing/already resolved flag returns accurate count/result | Correct forward; retain audit history |
| 5 | `20261114050000_fix4_new_sales_disabled.sql` | Server new-order kill switch | `select new_orders_enabled from public.purchase_settings where id=true;` must return false | Keep false; do not restore old unguarded routes |
| 6 | `20261114050200_fix4_notification_requests.sql` | ADM-03 atomic reservation/feed/replay | Synthetic staging duplicate requestId creates one feed entry; no provider send in local tests | Disable admin sending; retain request records; forward correction |
| 7 | `20261114050300_fix4_snapshot_rpcs.sql` | ADM-08/MOB-17 snapshot/owner aggregate | Student/admin/AAL checks; concurrent insert snapshot; foreign quiz rows invisible | Disable affected UI or forward correction; no broad grants |

For each migration, owner opens the exact file under `supabase/migrations/`, reviews its transaction and ACL changes, applies it through the target's migration workflow, and confirms its version in `supabase_migrations.schema_migrations`. Compare approved dry-run output to this exact set before applying. The Supabase CLI was not installed here; run your installed CLI's `--help` before choosing version-specific migration commands. A SQL Editor execution alone must not be mistaken for a recorded migration version.

2. Deploy the compatible Edge Function/shared-source bundle in the following order. On the owner machine, authenticate/link the correct project first. Commands below are NOT run by agents. A `verify_jwt=false` command includes `--no-verify-jwt`; true uses config.toml's true setting and omits that flag. Recheck deployed metadata after each command.

| Order | Owner command (project ref explicit) | verify_jwt | Scope and post-deploy check | Rollback |
|---|---|---|---|---|
| 1 | `supabase functions deploy create-order --project-ref xbvenkfmesugrbjuufyw` | true | Kill switch: authenticated synthetic request returns 403 `sales_disabled`; verify no order/provider work in staging | Keep new switch false; disable route until qualified guarded bundle restored |
| 2 | `supabase functions deploy create-play-order --project-ref xbvenkfmesugrbjuufyw` | true | BACK-07 + kill switch. Disabled request 403; when separately enabled in disposable tests malformed body 400 before writes | Same guarded bundle/false switch |
| 3 | `supabase functions deploy create-order-play-choice --project-ref xbvenkfmesugrbjuufyw` | true | Kill switch before reservation/provider calls; no sales enablement | Same guarded bundle/false switch |
| 4 | `supabase functions deploy verify-payment --no-verify-jwt --project-ref xbvenkfmesugrbjuufyw` | false | BACK-16: no JWT/other owner denied; signed callback HMAC checked before lookup | Qualified authenticated-recovery/HMAC bundle only |
| 5 | `supabase functions deploy verify-play-purchase --project-ref xbvenkfmesugrbjuufyw` | true | BACK-01/07 historical owned receipt reconciliation stays distinct from new orders | Qualified owned-receipt verifier; no sales flag flip |
| 6 | `supabase functions deploy razorpay-webhook --no-verify-jwt --project-ref xbvenkfmesugrbjuufyw` | false | BACK-01/02: invalid HMAC before writes; synthetic duplicate/reversal inbox replay in staging | Retain inbox/capture facts; qualified HMAC/idempotent bundle only |
| 7 | `supabase functions deploy send-push-notification --no-verify-jwt --project-ref xbvenkfmesugrbjuufyw` | false | BACK-05/06 + ADM-03: target request denied before persistence; AAL rules; duplicate request replay, no blind retry after unknown provider outcome | Disable sending; preserve request result/feed; qualified guarded bundle only |
| 8 | `supabase functions deploy get-note-url --project-ref xbvenkfmesugrbjuufyw` | true | BACK-01/06/10: refunded/blocked/foreign owned content denied; free preview and valid historical owner obey authority | Qualified guard bundle only |
| 9 | `supabase functions deploy get-video-url --project-ref xbvenkfmesugrbjuufyw` | true | BACK-06/10 blocked-user denial and admin AAL rules | Qualified guard bundle only |
| 10 | `supabase functions deploy upload-note-pdf --project-ref xbvenkfmesugrbjuufyw` | true | BACK-06: nonadmin/AAL1 when MFA required denied; trusted PDF boundary | Qualified admin/AAL/upload validation bundle only |
| 11 | `supabase functions deploy delete-account --project-ref xbvenkfmesugrbjuufyw` | true | BACK-17 compatibility: repository client uses Edge route; inspect contract and stage synthetic-account test only after owner approves deletion test | Never restore unrestricted destructive client RPC; corrective bundle |

3. Publish the matching admin client only after notification reservation and analytics RPCs exist. Preserve its requestId across uncertain outcomes; “unknown outcome — check the feed before retrying” requires reconciliation, not a new automatic send. Publish a qualified mobile binary only after MOB-02 device checks and policy approval. RPC missing errors alone permit the bounded old quiz scan; authorization/network errors do not.
4. MFA: deploy/verify every guard first, enroll and test recovery for every admin, then owner explicitly approves `set_admin_mfa_required(true)` after confirming every factor. Test AAL1 denial/AAL2 success across UI, RPC and Edge Functions. Do not flip this flag incidentally with deploy.
5. Retention is a SEPARATE approved activation: review/apply `20261114050400_fix4_identity_retention_schedule.sql` only after staging boundary tests and explicit owner approval. It schedules the named job only if pg_cron already exists; it does not install extensions. If absent, Dashboard > Database > Extensions > pg_cron is a separate owner action, then apply a reviewed new scheduling migration. Monitor job metadata and run success counts without selecting command secrets. Purged data cannot be rolled back; rollback only unschedules this named job.

```sql
select version from supabase_migrations.schema_migrations order by version;
select new_orders_enabled from public.purchase_settings where id=true;
select credit_expiry_days from public.referral_settings where id=true;
select jobname,schedule,active from cron.job where jobname='first-purchase-identity-retention';
select status,count(*),max(end_time) from cron.job_run_details
where jobid in(select jobid from cron.job where jobname='first-purchase-identity-retention') group by status;
```

Check `pg_extension` before querying cron tables. These are owner-run metadata checks; no production changes are implied. Don't select user/payment rows, token contents, cron.command or Vault secrets for routine deployment verification.

## Paid release only — BACK-03/04 OWNER ACTION REQUIRED

Payment workers/UCB/catalog schedules are excluded from the free-only minimum set. Keep every existing disabled-sales guard and schedule state unchanged. The paid-only rollout, provider/Play Console checks and monitoring are below; they are not prerequisites to enabling free videos/MCQs and must not be activated to make a readiness script green.

# Backend staged rollout — nothing deployed

RELEASE_MODE **free-only**. These are review instructions, not authorization to run deployments, provider requests, production SQL, retention purges or schedules. Provider/build flags remain unchanged. Historical reconciliation is a separate owner decision and never permission to start new sales.

## Source/migration dependency order

1. Review the full dirty-tree source as one release; source-only fixes are not deployed fixes. Preserve the owner's earlier migrations and guard work. Apply pending canonical migrations in timestamp order, particularly **20261112104610_audit_batch1_refund_revocation.sql** before settlement/webhook bundles, then **20261112150427_audit_checkout_publication_guard.sql**, **20261114040000_fix3_content_push_and_delete_guards.sql**, **20261114040100_fix3_flag_resolution_row_count.sql**. Do not apply a subset out of order or edit an applied migration. Local scratch data only was changed here.
2. Stage schema first: durable provider inbox, capture/reversal/compensation RPCs and paid-PDF authority. Existing 20261112104610 already fixes BACK-01; no duplicate refund migration added. Local tests must pass before staging. Rollback: stop affected workers/entrypoints and use a reviewed forward corrective migration; preserve immutable ledger, inbox and capture history. Do not restore the old refund authority defect.
3. Stage authentication/guard handlers: `send-push-notification`, `verify-payment`, `create-play-order`, `verify-play-purchase`, plus the source tree's compatible `_shared` dependencies. Stage `razorpay-webhook` with settlement after the inbox migration. Preserve disabled-sales/platform/product/ownership checks. Rollback to a qualified compatible handler only; otherwise disable the affected route while correcting it, never downgrade auth or reversal safety.
4. Stage free-content and deletion behavior. Confirm blocked user's JWT cannot read videos on either registration-course or purchase branch; admin remains governed by the existing admin/AAL rule. Confirm current mobile deletion uses the Edge Function and the deprecated RPC has no authenticated/anon effective EXECUTE. Old external clients require owner compatibility review before production revocation. Edge handler uses its existing erase/Auth-admin path; no deletion was executed here. Rollback requires reviewed forward changes; never re-enable an unlimited destructive client RPC as an incidental workaround.
5. Candidate overlay for BACK-09 (new-files-only rule): deploy `supabase/functions/report-external-transaction/index.fix3.ts` as the route's `index.ts` and `supabase/functions/_shared/paymentQueueFix3.ts` as an additional shared file. Keep its `paymentQueueFix3.ts` import intact. Existing canonical handler/helper are intentionally not overwritten. The candidate checks an invocation deadline before each queued job and void-sweep iteration; unstarted claimed jobs keep their lease and are not marked successful. It is not a hard cancellation of in-flight provider/DB calls. Qualify worst-case serial-call paths before enabling workers. Rollback: stop the schedule, retain work/leases, and restore only a qualified worker; do not lose deferred work.
6. Use **supabase/checks/ucb_postdeploy_checks.fix3.sql** instead of the old readiness script. It accepts generated price/revision SKUs only with current ready, active, freshly verified India/INR evidence. Readiness SQL cannot prove Play authorization or a successful purchase. Its cron checks will intentionally fail in free-only mode; do not enable jobs just to turn the report green.

## JWT flags (from current config.toml; do not deploy in this task)

| Function | gateway verify_jwt | Independent handler boundary |
|---|---|---|
| create-order, create-order-play-choice, create-play-order, verify-play-purchase, attach-external-token | true | Verified user + disabled-sales/platform/product/owned-order checks |
| verify-payment | false | Recovery requires verified user + owned order; signed callback verifies HMAC before lookup |
| razorpay-webhook | false | Raw-body provider HMAC; durable inbox before provider work |
| send-push-notification | false | Same-token verified Auth, admin membership, fail-closed MFA policy/AAL2 when required; CORS retained |
| get-note-url, get-video-url, delete-account | true | Existing explicit owner/access/admin/deletion guards |
| report-external-transaction | false | x-ucb-cron-secret, exact configured secret; no public user invocation |
| play-payment-worker | false | x-play-payment-cron-secret |
| sync-play-catalog | false | Existing catalog cron secret |

The old config comments about verify-payment lacking a JWT describe its signed-callback lane, not its authenticated recovery lane. Never infer route authorization from the gateway flag alone. Diagnostic routes retain their existing mandatory admin/AAL2 checks; no diagnostics called Google here.

## MFA rollout order (BACK-06)

1. Deploy and stage **all handler guards first**, including push, signed URLs and upload; test missing/invalid policy returns failure, AAL1 denies when required, AAL2 succeeds, non-admin denies.
2. Enroll and verify factors/recovery for **every** administrator. Test refresh, sign-in and recovery without locking anyone out.
3. Only then owner approves switching require_mfa. **No flag changed here.** Test Data API/RPC and every service-role handler together.
4. Rollback: use the preapproved admin recovery procedure and investigate the offending handler. Any temporary policy rollback requires owner approval; do not weaken code or bypass MFA to hide a failed rollout.

## Payment gates (BACK-03 / BACK-04) — OWNER ACTION REQUIRED

Qualify the complete Notes choice route as one revision: `create-order-play-choice`, `attach-external-token`, `create-order`/shared handler, `verify-payment`, `razorpay-webhook`, `report-external-transaction`, `create-play-order`, `verify-play-purchase`, `play-payment-worker`, `sync-play-catalog`, and their shared SQL/provider modules. Missing deployed routes cannot be repaired by client hints. JWT flags follow the matrix above. Production headers are not device attestation.

Do not execute `supabase/ucb_cron_setup.sql` or `supabase/play_payment_cron_setup.sql` in this task. Existing prepared UCB names are **ucb-reports, ucb-refunds, ucb-consume, ucb-reconcile, ucb-compensate, ucb-events**; these call `report-external-transaction` with matching phase. Play names are **play-consume, play-reconcile, play-voids** calling `play-payment-worker`; catalog schedule is separate. Scripts use minute cadence and 90-second HTTP timeout. Their existing Vault/header secrets must match without ever selecting or printing decrypted secrets.

Future authorized sequence: reviewed migration dependencies -> guard handlers/webhook -> unscheduled workers -> isolated provider/catalog qualification -> licensed exact-package/track acceptance (India/UCB enrollment and both billing choices) -> monitoring/dry-run backlog review -> owner approval of each named schedule. Free-only does not authorize enabling any of them. Rollback for each schedule: unschedule only that job by name, keep all queue/cursor/inbox state, assess leases/backlog and correct forward before replay.

## Play 403 checklist — OWNER ACTION REQUIRED; no Google calls

- Identify failing API operation and exact package **in.medveda.app** from sanitized diagnostic output.
- Confirm configured service-account email and intended Cloud project using approved metadata; never print private keys or access tokens.
- Verify Android Publisher API enabled in that project; service account has Play Console access for this exact app and operation, account/app scope and expiry. Cloud IAM roles do not establish Play Console permission.
- Verify Android Publisher OAuth scope and intended service identity without logging tokens. Match purchase/subscription/external-transaction resource and API version.
- Independently confirm UCB/external-transactions program enrollment and permissions; ordinary purchase verification permission is insufficient.
- Future separately authorized per-call evidence: UTC timestamp, operation, package, HTTP status, redacted provider reason/message and correlation ID. No receipt/purchase tokens or full raw request/response logs.
- After configuration review, owner authorizes one exact diagnostic in the correct environment. One successful API response does not qualify paid release.

## Read-only monitoring (schema reviewed; synthetic/local use only so far)

```sql
select event_type,status,count(*) from public.provider_events group by event_type,status;
select kind,backlog_count,oldest_queued_at,oldest_deadline_at,estimated_drain_seconds,parked_count
from public.payment_queue_metrics;
select unchecked_count,oldest_unchecked_at,cursor_lag_seconds from public.play_void_sweep_metrics;
select jobname,schedule,active from cron.job
where jobname in ('ucb-reports','ucb-refunds','ucb-consume','ucb-reconcile','ucb-compensate','ucb-events',
 'play-consume','play-reconcile','play-voids','play-catalog-sync','first-purchase-identity-retention');
```

Do not select cron.command, vault contents, raw provider payloads, credentials, tokens or student/payment row identifiers for routine monitoring. Alert on parked jobs, age/deadline lag, unresolved reversals, conflicting event hashes and expired leases. Ensure estimated drain includes deferrals; the existing SQL metrics estimate also needs owner review before worker qualification.

## Staging acceptance

- Duplicate verified event -> one grant/reversal; same ID/different hash rejects before side effects.
- Reversal before capture; capture after full refund/lost dispute never restores PDF authority; partial refund/won dispute follows policy.
- Crash after inbox commit; replay resumes pending work and marks only the processed event applied.
- Missing/mismatched local capture evidence remains retryable except a proven durable compensation/reversal disposition; no permanent unexplained ACK.
- Concurrent duplicate reversal restores wallet once for refund, never for lost dispute; historical stale success purchase is denied when order/capture is reversed.
- No JWT/invalid JWT fails recovery; other owner/missing order indistinguishable; invalid callback HMAC before lookup.
- Invalid JSON/null/array/primitive Play bodies return 400 before provider/order work.
- Targeted push rejected before public-feed persistence; AAL1/missing MFA policy/non-admin denied; AAL2 obeys exact configured policy.
- Ten tokens + new token; two concurrent registrations; refresh at cap; direct eleventh write denied. Direct ownership-changing UPDATE is prohibited by existing WITH CHECK; verify admin policy exceptions too.
- Worker multi-call slow success, deadline exit, lease-expiry replay and cursor recovery; no dropped or falsely completed jobs.
- Free-only app cannot start purchase; account-bound historical restore remains separate. No real payment/refund/email/push/deletion was performed here.
