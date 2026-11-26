# MedVeda — final production Question Paper preflight

Date: 2026-11-19 UTC. Recommendation: **NO-GO / BLOCKED**. This is a read-only production assessment, not a deployment authorization. Staging is excluded by the owner's current instruction; older reports requiring staging do not govern this assessment.

Only two new audit documents were added: this report and the applied-migration inventory beside it. No existing workspace files were changed by the preflight. No database migration was applied anywhere, no function was deployed, no backup was created/restored, and no commit, push or APK/AAB build was performed. Production SQL used explicit read-only transactions and catalog/configuration reads. No user records or credentials were exported.

## 1. Production target verification

| Check | Evidence and result |
| --- | --- |
| Project | Supabase get_project: ID/ref **xbvenkfmesugrbjuufyw**, name **MedVeda** |
| Organization | wkqgfqmqukvhyyrlarzg |
| Region | ap-northeast-2 |
| API origin | https://xbvenkfmesugrbjuufyw.supabase.co |
| Database endpoint | db.xbvenkfmesugrbjuufyw.supabase.co |
| Platform state | ACTIVE_HEALTHY |
| Database | PostgreSQL 17, reported build 17.6.1.147, GA |
| Connection | Successful read-only SQL; database postgres, role postgres, pg_is_in_recovery() false |
| Sample time | Database observed_at 2026-11-19T16:35:49.550513+00:00 |
| Health advisor | No lints returned |
| New resources | No Question Paper tables, helper functions, index/name collisions, policies or bucket found |
| Edge inventory | 22 existing functions; question-paper-access absent |

Health means the observed platform state and successful connection. It is not a sustained availability, load, Auth, Storage or device certification.

Security advisor baseline: 33 INFO findings for RLS tables without policies; WARN findings for 3 anon-executable and 29 authenticated-executable security-definer functions; 1 leaked-password-protection warning. These predate the module, which is absent. No remediation was attempted. References: [RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anon function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## 2. Backup and recovery — BLOCKED

| Required evidence | Finding |
| --- | --- |
| Current managed backup availability/type | **UNKNOWN / BLOCKED** |
| Most recent successful managed backup UTC time | **UNKNOWN / BLOCKED** |
| Most recent fully verified recoverable production point | **Not established** |
| Current PITR enabled flag and recoverable WAL interval | **UNKNOWN / BLOCKED** |
| Successful complete restore test | **Not demonstrated**; retained evidence records a full-restore failure |
| Coordinated Storage byte backup | **Not demonstrated** |
| Accepted/measured recovery loss and recovery time | **Not established** |

The connected Supabase tools expose no backup-list/PITR inspection endpoint. No Supabase CLI is available on PATH, and no Supabase/DB credential environment variable names were present. The connector's internal authorization cannot be reused as a Management API credential. No attempt was made to extract it.

The authorized read-only evidence still required is the production Dashboard Backups/PITR view, or a securely authenticated **GET /v1/projects/xbvenkfmesugrbjuufyw/database/backups** response, including backup status/type/completion times, PITR flag and available recovery interval. A backup listing alone does not prove a successful restore. Obtain the signed full restore-test result and matching Storage inventory separately; do not create or restore a backup during this task.

Historical evidence was read from Git HEAD without restoring deleted files:

- docs/audit/MEDVEDA_PRODUCTION_BACKUP_RESTORE_READINESS_20261023.md records checksum-verified logical files roles.sql/schema.sql/data.sql and a restore attempt. The full restore failed on managed Auth schema compatibility: auth.audit_log_entries.ip_address was absent in the cached target image. A partial public-schema restore verified 46 COPY sections / 645 rows and minimal Auth IDs; it did not restore complete Auth or Storage state.
- docs/audit/p0-critical-remediation-20261111_131014/PRODUCTION_RECOVERY_READINESS.md records older findings of pitr_enabled=false and empty managed/physical backup inventories, but explicitly labels current settings unknown. These are historical findings, **not current cloud facts**.
- docs/audit/payment-migration-preflight/closure/RESTORE_REHEARSAL.md is a plan, not evidence closing the full recovery gate.

Database recovery must cover managed Auth compatibility, roles/ACL/RLS, functions, sequences, extensions and migration history. Database backups exclude Storage object bytes; restoring metadata cannot recreate deleted PDFs. Edge source/dependencies/JWT settings, runtime secrets and external configuration also require separate recovery records. A whole-project database restore can discard unrelated writes after the recovery point and cannot reverse external payment/provider events. [Supabase backup limitations and PITR](https://supabase.com/docs/guides/platform/backups).

Rollback options, for separate future owner authorization:

1. Before commit: an error aborts the migration transaction; ON_ERROR_STOP and connection termination are required so no later commands continue.
2. After commit, before client release: withhold module UI and the new function; retain additive schema/private bucket while investigating.
3. After release: roll back only the new module's client exposure and disable only its signing/validation endpoint. Already issued URLs may survive 120 seconds, in-flight requests may complete, and downloaded copies remain.
4. A separately reviewed forward containment migration can restrict only new module entry points. Do not drop shared Storage policies or remove the private read guard while objects remain.
5. Removing new objects later requires a separate exact dependency/object manifest and authorization. Never use broad DROP CASCADE, alter historical ledger records, or delete PDFs/receipts casually. Whole-project restore is a last resort with a verified coordinated recovery point, not a module rollback.

## 3. Pending migration inventory

Production contains **85 applied versions**; the local active migrations directory contains **86 files**, all with distinct version prefixes. Full read-only production inventory: [production-preflight-applied-migrations-20261119.json](production-preflight-applied-migrations-20261119.json).

| Comparison | Result |
| --- | --- |
| Local-only version | **20261118172019 — question_papers** |
| Production-only versions | None |
| Latest applied version | 20261114090000 — fix5_wallet_expiry_facts |
| Historical name mismatch | Version **20260801**: local auth_verified_identities; production razorpay_webhook_atomic_grant |
| Separate applied webhook version | 20260801150000 — razorpay_webhook_atomic_grant, present locally and remotely |

Only the Question Paper version is pending **by version comparison**. A matching version/name is not proof that historical SQL bytes match; no blanket historical equivalence claim is made.

Approved migration candidate SHA-256:

`6811f8573487c4d0e4f55716a7cbb1051f2ac2d0f8189165178a585b54ce9359`

Path: supabase/migrations/20261118172019_question_papers.sql.

## 4. Final migration security assessment

The current file, rather than superseded descriptions in verification.md/remediation reports, was reviewed.

| Requirement | Assessment |
| --- | --- |
| Anonymous SELECT | **Absent.** Both new tables explicitly revoke PUBLIC/anon/authenticated privileges before narrowly granting required permissions. No subsequent anon grant exists. |
| Authenticated metadata | SELECT/INSERT only; RLS enabled. Student SELECT requires publication, a user ID, non-anonymous JWT and visible active subject/year/course ancestry. Admin INSERT requires the existing predicate through RLS and validation. |
| Mutations | No authenticated direct UPDATE/DELETE grant. New security-definer RPCs require auth.uid() and am_i_admin(), use an empty search_path, fully qualified objects, and atomic revision matching. Stale edits/deletes raise 40001. |
| Validation receipts | No client read/write grant or RLS policy. Service role receives SELECT/INSERT. Metadata writes require a matching immutable object, PDF MIME and matching stored size. |
| Helper execution | PUBLIC/anon execution is revoked for all new helpers/RPCs. Authenticated users can call only the validation predicate and guarded mutation RPCs. The boolean helper reveals only existence of a validated path, not bytes or a signed URL. |
| Private bucket | New question-papers bucket, public=false, 52,428,800-byte cap, application/pdf allowlist. INSERT has no conflict overwrite. |
| Direct Storage access | New restrictive SELECT denies bucket read/list/sign for every ordinary client, including Admin. INSERT permits only authorized Admin UUID.pdf paths. UPDATE/DELETE guards deny path replacement/reuse. |
| Other Storage buckets | Each new restrictive guard evaluates true outside question-papers. Existing policy definitions/grants are not replaced. The former cross-bucket paper-table subquery is absent, so no anon table grant is required. |
| Subject deletion | FK is ON DELETE CASCADE on the new child only. Deleting a subject removes its matching draft/published paper metadata atomically, including deletion reached through existing ancestry cascades. Storage objects and receipts remain private. |
| Existing protected objects | No ALTER/REPLACE/DROP of an existing public table/function/policy/grant. Additions to shared storage.objects are limited to new named bucket guards. One new storage.buckets row is inserted. |
| Payments/entitlements | No existing payment/entitlement routine or policy is modified; no new purchase requirement is added. |
| Isolation/transaction | Explicit BEGIN/COMMIT, only new resources; no seeds, extension installation, concurrent index creation, remote calls or historical SQL execution. Name collisions fail rather than overwrite. |

Live dependencies exist: subjects.id is a text primary key; subjects.year_id, years.id/course_id, courses.id and all active fields match; auth.uid(), auth.jwt(), gen_random_uuid(), storage.objects metadata/name/bucket fields and bucket configuration fields exist. Authenticated catalog SELECT grants are present. Service role has BYPASSRLS; production postgres default function privileges include service_role EXECUTE.

Live event triggers were inspected. Auto-RLS enables RLS on newly created public tables; the PostgREST DDL watcher notifies schema reload. Bucket insert triggers enforce name/control fields; lifecycle wakeup returns without work when the new bucket's lifecycle configuration is NULL. Nothing reviewed requires changing these dependencies.

Compatibility limits: the FK adds a reference lock on subjects and matching child deletions add work to existing deletion transactions. No live lock/load rehearsal was performed. Existing subject-deletion failures remain possible. A metadata authorization lookup racing with unpublish/delete can still complete a signing request; previously issued links remain valid to expiry.

Free access is within the **existing catalog visibility contract**. Live has_content_access permits an unblocked profile's own active course without purchases; it also retains a purchase-based cross-course fallback. Therefore the module adds no payment gate, but it does not promise unrestricted cross-course access.

**MFA finding:** production admin_mfa_required() returned **false**. am_i_admin() requires AAL2 only when that setting is true. The module faithfully preserves that behavior; it does **not** independently enforce mandatory MFA. If mandatory AAL2 is required for acceptance, this is a blocker requiring an explicit owner decision and separately authorized resolution. No MFA setting was changed.

Fresh verification: **17/17** checks passed via python3 scripts/question-papers-verify.py, covering module/Admin/mobile/injected-handler regressions, existing selected navigation/PDF regressions, Admin tests and both TypeScript projects. deno check --no-remote on handler.ts passed. No SQL migration harness was executed because this preflight prohibits applying migrations.

Earlier disposable SQL results are historical evidence only. The retained subject-delete report describes an older anon grant; it cannot certify the current file's full SQL regression result. That report also records pre-existing account-deletion expectation failure and a missing retired diagnostic harness. The current corrected migration needs SQL regression evidence tied to its exact hash under separate authorization that permits a disposable local database; this preflight does not claim a fresh SQL pass.

## 5. Edge Function readiness

Candidate: supabase/functions/question-paper-access/{index.ts,handler.ts}.

| Area | Reviewed behavior / remaining gate |
| --- | --- |
| Authentication | POST requires Bearer header and server-verified getUser(); missing/invalid users and anonymous Auth users are rejected. OPTIONS is a public CORS preflight. |
| Authorization | Signing resolves id/object_path through the caller's RLS client. Caller-supplied paths do not authorize signing. Draft/inactive/deleted/inaccessible rows cannot produce a fresh URL for students. |
| Admin validation | Existing am_i_admin() RPC evaluated with original user JWT. Service client is separate and receives no caller Authorization override. |
| URL lifetime | createSignedUrl uses literal **120** seconds; expiresIn input is ignored. Download filename derives from the resolved paper ID. |
| Byte validation | Server downloads actual Blob, checks PDF MIME, 5..52,428,800 bytes and %PDF- prefix, then inserts receipt. This is not complete PDF parsing or malware scanning. |
| Receipt security | Duplicate receipt is tolerated only after rechecking object bytes. Safety relies on immutable paths; privileged service writes must never replace validated bytes. |
| Runtime variable names | **SUPABASE_URL**, **SUPABASE_ANON_KEY**, **SUPABASE_SERVICE_ROLE_KEY**. Values were not requested or printed; availability for the new runtime is not independently verified. |
| Dependencies | Pinned direct import https://esm.sh/@supabase/supabase-js@2.47.10 and local handler.ts; Deno.serve/Request/Response/Blob. No function-local lockfile is present; transitive resolution and hosted bundling remain deployment checks. |
| JWT gateway | No question-paper-access stanza exists in current config.toml. No deployed function exists to inspect. Explicit **verify_jwt=true** must be attached to this new function's deployment and confirmed afterwards; do not rely on a default. |
| Browser behavior | Handler sets CORS headers and Cache-Control:no-store. Real gateway preflight, Storage response CORS, production CSP and supported browser PDF embedding remain unverified. |

Hashes:

- handler.ts: `25adb9e3ae00ade518094fc74e9657abe6e367b9c93b18b9b052656fd06bc345`
- index.ts: `4e9d11ae1b26455c53c54abbb50722df45692d9db26e04ea63e04c42517a60d5`

Do not deploy with --no-verify-jwt. Verify a real production session JWT works with the chosen gateway configuration without changing Auth/signing configuration. Modern key compatibility must be established for the existing clients; do not migrate API keys as part of this module. [Supabase function authorization](https://supabase.com/docs/guides/functions/auth), [signed URL expiry parameter](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).

## 6. Historical drift risk

The 20260801 name/content discrepancy is real and remains unresolved. Replaying that local file could modify profiles/auth-related behavior, which is forbidden here.

For a genuinely isolated execution, historical files must be physically absent from the execution package. The package should contain exactly one migration, the two new function files, and a minimal new-function-only deployment config. The execution candidate set is then one file, independently checked against the production ledger. No historical discrepancy can cause another file to be applied from that package.

Isolation does not eliminate semantic dependency drift. The live catalog/helper/grant/trigger inspection above addresses known dependencies; no exhaustive historical source reconciliation or live migration rehearsal was performed. If an execution tool rejects missing local history, **stop**. Do not repair, fetch/replay historical SQL, fabricate placeholder migrations, add --include-all, or switch to a broad checkout deployment.

## 7. Exact isolated execution sequence — FOR LATER APPROVAL ONLY

No step below was executed. This is an ordered operator runbook, conditional on blocker closure.

1. Obtain owner approval naming project, three hashes, controlled fixture scope, recovery evidence and the Admin MFA decision. Freeze the reviewed candidate; recheck all hashes and fresh production identity/inventory immediately before execution. Abort if anything differs.
2. Prepare a new local execution directory outside this checkout. Copy **only** 20261118172019_question_papers.sql into supabase/migrations/. Copy only the new function's index.ts/handler.ts. Use a minimal isolated config containing project_id="xbvenkfmesugrbjuufyw" and [functions.question-paper-access] verify_jwt=true. Never copy the workspace's shared config, seeds, roles, other migrations or other functions.
3. Inventory that package: exactly one migration with the approved hash; exactly one function with the two approved hashes. Pin the operator's installed CLI version, inspect its --help, migration up --help and functions deploy --help, and retain the supported target syntax. CLI is unavailable here, so no CLI executable/version has been validated by this preflight.
4. Use the supported version-preserving migration runner with the explicit production target and only that package. Current published CLI syntax is: **supabase migration up --remote=xbvenkfmesugrbjuufyw** while running from the isolated directory. Do not use --include-all or --yes. Require the confirmation/candidate list to contain only **20261118172019_question_papers.sql**. If the installed CLI differs, lacks a reviewable candidate list, or rejects historical-file absence, stop for a revised reviewed executor; do not guess flags or bypass validation. [Current CLI reference](https://supabase.com/docs/reference/cli/supabase-migration-up).
5. The runner must preserve version **20261118172019** and record only the new migration. Require stop-on-error. A plain psql file execution does not record Supabase migration history and is not a substitute. The connected apply_migration tool accepts no explicit version; do not assume it preserves the filename's version. Do not manually edit historical history or run repair. Confirm the chosen runner's handling of the file's explicit BEGIN/COMMIT; do not promise atomic history recording without verifying that runner.
6. After successful migration, verify ledger delta = exactly that version, new bucket private/capped/PDF-only, expected new ACL/RLS/RPC definitions, no anon grant and no changed existing definitions. If commit outcome is ambiguous, read catalog/history first; never blindly retry a non-idempotent migration.
7. Deploy only the new function. Current documented syntax in the isolated package is **supabase functions deploy question-paper-access --remote=xbvenkfmesugrbjuufyw**, with verify_jwt=true in its minimal config and without --no-verify-jwt. Confirm supported syntax with installed help first. Do not deploy all functions or push configuration. Verify deployed slug, source/dependencies, ACTIVE status and verify_jwt=true; all existing function versions/JWT settings must match the preflight baseline.
8. Verify runtime environment names through approved secure operator access without logging values. Execute the read-only acceptance group below, then only separately authorized controlled-fixture tests. Keep student rollout withheld until security gates pass. Browser/device exposure is a separate release step; no APK/AAB build is part of this runbook.
9. Record outcomes, redacted request/status evidence, UTC times, migration version, function version and owner sign-off. If any gate fails, stop rollout and use only separately approved module containment.

This sequence cannot be certified executable until the CLI/runner gate in steps 3–5 is satisfied. A history rejection is a safe stop, not permission to repair drift. Backend migration, function deployment and fixture acceptance are separate operations and cannot form one database transaction.

## 8. Exact post-deployment acceptance checklist

**R** = can run without deliberate production application-data/schema/configuration writes, using already provisioned identities and already authorized paper fixtures. Operational request logs may be generated. **F** = requires separately authorized controlled fixtures/mutation scope. A negative write test is F because a regression could allow the write. Login, MFA enrollment/challenges and account provisioning may write Auth state; use existing sessions for R checks. No acceptance tests below were run against production in this preflight.

Use API=https://xbvenkfmesugrbjuufyw.supabase.co. Hold tokens/keys and signed URLs in memory; record only statuses, expiry numbers and redacted identifiers. Never log Authorization headers or full signed URLs.

| ID / class | Exact procedure and pass condition |
| --- | --- |
| A01 R — anonymous metadata/signing | With no session and separately with the public API key, GET /rest/v1/question_papers?select=id. Expect permission denial (no anon SELECT), never metadata. POST /functions/v1/question-paper-access with {"action":"sign","id":PUBLISHED_ID} without a valid user JWT must deny, usually gateway/handler 401. Repeat with an existing anonymous-Auth session if available: deny signing and no metadata rows. |
| A02 R — free student | Use an existing unblocked non-anonymous student whose profile course matches active fixture ancestry. Verify purchase count for that account is zero via an authorized count-only check. GET metadata filtered to the paper and POST {"action":"sign","id":PUBLISHED_ID}; expect visible metadata, 200 signed URL, PDF retrieval, and no checkout. No purchase/entitlement creation. Missing zero-purchase account means F provisioning is needed. |
| A03 R — visibility/ID tampering | As student, request known draft, inactive-ancestry, removed and random IDs; metadata absent and signing 403, no signed URL. Existing blocked-account session must not see/sign papers. Caller object_path or another bucket/path in sign input must not change the ID-resolved object. If fixtures/sessions are missing, prepare them only under F approval. |
| A04 R — direct single signing | For public-key/no-session, student, Admin AAL1 and Admin AAL2 tokens, POST /storage/v1/object/sign/question-papers/OBJECT_PATH with {"expiresIn":86400}. All ordinary callers must receive no usable URL for an existing object, even Admin. Repeat at expiresIn=120. An error or authorization-filtered result is acceptable; a working signed URL is failure. |
| A05 R — direct batch signing | Same identities: POST /storage/v1/object/sign/question-papers with {"paths":[OBJECT_PATH,SECOND_OBJECT_PATH],"expiresIn":86400}. Every protected entry must fail with no usable signedURL. A batch-level 200 is not proof of denial; inspect each entry. Repeat with mixed known/missing paths and 120 seconds. |
| A06 R — raw read/list/public path | GET /storage/v1/object/authenticated/question-papers/OBJECT_PATH; GET /storage/v1/object/public/question-papers/OBJECT_PATH; POST /storage/v1/object/list/question-papers with {"prefix":"","limit":100}. No ordinary identity may obtain private bytes or object listing. A locally constructed public URL must not make the private bucket readable. |
| A07 R — fixed expiry | POST function with {"action":"sign","id":PUBLISHED_ID,"expiresIn":86400} and with expiresIn=1. Decode returned Storage token locally without printing it: encoded expiry must reflect 120 seconds, not caller input. Fetch immediately: valid PDF. Start a new uncached network fetch after encoded exp plus clock tolerance (e.g. 5 seconds): deny. Refetch a fresh function link: success. A previously downloaded Blob or already-open stream is not an expiration test. |
| A08 R — Admin predicate/MFA | With existing ordinary student, Admin AAL1 and Admin AAL2 sessions, POST /rest/v1/rpc/am_i_admin with {}. Student false. Under current mfa_required=false both Admin sessions may return true. If the owner requires mandatory MFA, acceptance remains blocked; an AAL1 denial cannot be claimed in the current configuration. Under a separately approved MFA-required configuration AAL1 must be false and AAL2 true. Do not toggle settings for this test. |
| A09 R — browser/gateway | Browser OPTIONS with Origin and access-control-request-headers authorization,apikey,content-type must succeed for the new endpoint; a valid session POST must work with CORS. Actual Admin preview opens the known PDF without exposing service credentials, and HTTP/auth failure has useful retry/download guidance. Check production CSP and Storage CORS with supported browsers. |
| A10 R — student web | Navigate Quick Access → academic year → subject → exam year/month → PDF. Preview actual pages; download PDF and compare expected fixture byte count/hash. Test unsupported embedded PDF fallback, failed request, expired URL refresh, account switch and navigation away. No stale PDF from the previous account. |
| A11 R — Android | On an already installed approved candidate with the module, render the PDF, choose Android destination folder and export; verify opening exported bytes, cancellation, offline/interrupted fetch, expired-link retry, background/foreground, account change and temporary-file cleanup. No new APK/AAB build is authorized here. Missing candidate/device = unrun acceptance gate. |
| A12 R — iOS | On an existing approved candidate/device, render the PDF and export through the native menu; open exported bytes, test cancellation, interruption, expiry/retry, background/foreground and account change. The OS-managed temporary file must remain usable while the menu consumes it. Missing device/candidate = unrun gate. |
| A13 F — valid receipt flow | In a disposable module fixture namespace and an existing approved test subject, Admin uploads a fresh UUID.pdf with application/pdf and upsert:false; POST function {"action":"validate","object_path":PATH}; expect 200 validated:true and one matching receipt. Insert metadata through Admin flow; expect revision=1, unpublished default, then explicitly publish. Student can see/sign only after publish. |
| A14 F — invalid PDF/receipt | Try empty, <5-byte, >52,428,800-byte, wrong MIME, MIME-spoofed non-%PDF-, truncated and interrupted uploads. Bucket or validation must reject invalid cases, never produce a validating receipt/metadata row. A minimal %PDF- prefix with otherwise invalid content may pass backend validation: full parsing is outside implementation, so separately verify reader behavior. Missing object/receipt, mismatched recorded size and client-forged receipt insertion must fail metadata creation/replacement. |
| A15 F — immutable Storage bypass | Using only fixture paths, ordinary student/Admin tokens attempt upsert/overwrite/delete/move/copy of a validated object and both standard/resumable/signed-upload routes supported by production. No route may replace bytes at a validated path or provide readable/signed protected bytes. A fresh valid Admin path may be uploaded but needs validation before metadata. Verify bytes/receipt unchanged after denied attempts; do not use real content. |
| A16 F — Admin writes and concurrency | Student and deficient-MFA sessions under the approved MFA contract must fail upload/validate/insert/update/delete. Authorized Admin can save/edit/replace/publish/unpublish/delete through module UI/RPCs. Two edits using one revision yield one winner and one 40001; stale republish/PDF restore/delete fail. Direct authenticated table UPDATE/DELETE fail. Duplicate normalized identity produces one row. |
| A17 F — publication lifecycle | Unpublish/delete only a fixture paper; new student signs fail. An old signed URL can work until its original 120-second expiry, then fail. Replacement uses a new immutable path, invalidates Admin preview and does not resurrect stale content. Receipts/old private bytes remain. |
| A18 F — subject deletion compatibility | Create separate disposable active subjects with no paper, a draft and a published fixture paper, plus unrelated sentinel subject/paper. Use the unchanged Admin Subjects delete path. Authorized deletion succeeds under existing rules, removing matching paper metadata only. Student/deficient-MFA deletion must fail under the approved MFA setting. Compare unrelated records, retained Storage objects/receipts and existing-child behavior. Fresh signs for removed paper IDs deny; stale update/delete RPCs conflict. Never delete a real academic subject to test this. |
| A19 R — existing-feature read preservation | Compare before/after existing table/column/ACL/RLS/function/bucket fingerprints and all existing Edge versions/JWT settings. Browse existing Notes, Quiz lists, Videos, purchases and entitlement display using existing test sessions; check thumbnails, existing content access and current authentication session/MFA behavior. No new failures versus captured baseline. |
| A20 F — existing-feature mutation coverage | If full write-flow preservation is required, separately authorize controlled existing-feature fixtures for Quiz submission, content mutation or payment testing. A read-only smoke cannot certify settlement/webhooks, new purchases, password recovery/MFA enrollment or encrypted offline writes. Do not transact real payments or alter protected implementations as part of Question Paper acceptance. |
| A21 R — postflight scope | Ledger delta exactly one approved version; new private bucket only; zero new anon metadata grants; exact new guards/RPCs; existing definitions unchanged. No unrelated deployment/configuration drift. Capture cleanly redacted evidence. |

Fixture authorization must enumerate existing test accounts, disposable subject IDs, paper IDs/object UUIDs, allowed operations and retention. Record a baseline manifest before mutation tests. Invalid uploads, replacement and deletion can leave private orphans by design. Cleanup is separate; never recycle a validated path or delete a receipt while stale operations could reference it.

## 9. Remaining blockers

1. **Backup/recovery BLOCKED:** no current managed backup inventory/type/completion point or PITR window; no successful complete restore evidence; no coordinated Storage-byte recovery evidence.
2. **Admin MFA decision:** live enforcement is conditional and disabled. Mandatory MFA acceptance cannot pass as currently configured; no Auth/MFA changes are authorized here.
3. **Execution runner gate:** no installed CLI was validated. A version-preserving one-file executor, candidate allowlist and explicit transaction/history behavior must be confirmed without repairing historical drift.
4. **Gateway/runtime readiness:** explicit verify_jwt=true for the new function and required runtime variables are not deployed/verified. They must be fixed in the scoped deployment artifact and confirmed after separately authorized deployment.
5. **Current-hash SQL evidence:** fresh SQL regression for the corrected anon-grant/CASCADE file is unavailable in this migration-prohibited task. Retained reports describe earlier versions and known broad-suite failures; do not report the full SQL suite green.
6. **Hosted security acceptance:** direct Storage single/batch signing, path immutability, byte-validation/receipt integration and actual expiry are untested on production.
7. **Browser/device acceptance:** Admin browser, student web, Android and iOS outcomes remain unverified; approved existing candidates/devices and controlled fixtures are needed.

Items 6–7 are post-deployment gates for student release, not tests that this read-only preflight can complete before the module exists. Backend deployment must remain a controlled owner-approved step even after backup and preparation gates are closed.

## 10. Recommendation and approval boundary

**NO-GO for production migration now.** The current module is additive and its static authorization design passes the scoped review, but production recovery is not established, mandatory MFA is not currently enforced, and execution/deployed acceptance evidence is incomplete.

No deployment was executed. Stop here and wait for owner approval of the concrete scope and unresolved gates. Approval alone is not evidence that recovery or security tests passed.

