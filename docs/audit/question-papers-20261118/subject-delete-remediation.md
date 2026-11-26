# Question Paper subject-delete blocker remediation — 2026-11-19

The confirmed compatibility blocker is resolved locally. **Production remains NO-GO** pending the regression reconciliation and hosted/device acceptance below. No deployment, configured database migration, production access/change, commit or push was performed. SQL execution used fresh disposable PostgreSQL 17 clusters with the repository stub and test fixtures; those clusters were stopped and removed.

## Root cause and decision

`supabase/migrations/20261118172019_question_papers.sql` originally declared `subject_id text not null references public.subjects(id) on delete restrict`. PostgreSQL rejects deletion of a referenced subject regardless of the paper's publication state. The unchanged Admin path is `Subjects.handleDelete` → `useSubjects.removeSubject` → `subjectService.deleteSubject`, which issues `from('subjects').delete().eq('id', id).select('id').single()`. It does not first delete child resources.

The existing subject write policy consumes `am_i_admin()`; the existing MFA implementation remains authoritative. Historical foreign keys cascade to chapters, quiz tests and videos, and set the subject reference to NULL on products, purchases and quiz scores. Their existing downstream rules and any existing deletion failures remain unchanged. The new module must not add another veto.

The minimal correction is **ON DELETE CASCADE on the new Question Paper foreign key only**. A paper belongs to a subject, so removing its metadata is appropriate when that subject is removed. SET NULL would require changing the non-null metadata contract and handling papers without subjects throughout the new module. Dropping the FK would retain stale references. Changing the existing Admin flow or adding cleanup triggers is unnecessary. PostgreSQL documents these deletion actions in its [foreign-key documentation](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK).

## Exact implementation changes

- New unapplied migration: replace `on delete restrict` with `on delete cascade`, with two comments explaining metadata deletion and retained private resources. No other SQL statement changed.
- `supabase/tests/question_papers_subject_delete_checks.sql`: new transactional test, run against both the historical schema and the Question Paper schema. It exercises the same DELETE/RETURNING as Admin, with student, MFA-deficient Admin and authorized Admin sessions. It compares all rows of every other public/storage table, all remaining subjects, unrelated paper metadata, retained objects and receipts, and verifies access denial after deletion.
- `supabase/tests/question-papers-local.py`: invoke that test immediately before and after constructing the new module schema. All existing authorization, concurrency and regression checks remain in place.
- This report and the accompanying `subject-delete-*` evidence files are Question Paper audit artifacts.

No existing subject implementation, historical migration, policy, trigger, function, shared configuration, payment, entitlement, authentication, MFA, encryption, Notes, Quiz or Videos implementation was edited. No client or Edge Function implementation change was necessary. A read-only reviewer confirmed the migration reconstructs its exact starting hash by reversing this FK correction and removing the two comments; no blocking findings were reported.

## Before/after behavior

| Subject deletion | Historical schema | Original Question Paper migration | Corrected migration |
| --- | --- | --- | --- |
| Authorized Admin, no papers | Existing behavior | Existing behavior | Existing behavior |
| Authorized Admin, published paper | Existing behavior | FK violation | Subject and its paper metadata removed atomically |
| Authorized Admin, draft paper | Existing behavior | FK violation | Subject and its paper metadata removed atomically |
| Student or MFA-deficient Admin | Denied by existing rules | Denied | Denied |
| Unrelated records | Existing behavior | Existing behavior | Existing behavior; no additional cascade outside matching Question Paper rows |

The historical comparison uses the same subject fixtures without paper rows. It proves the deletion and authorization conditions before this module exists. The test does not separately populate every historical child relationship; those definitions are unchanged. Any subject deletion reached through the existing year/course cascade also removes matching Question Paper metadata. Existing transaction failures still roll back all changes.

## Data lifecycle and access

- **Metadata:** Matching published and draft rows disappear in the subject deletion transaction. There is no subjectless paper or dangling server-side catalog reference. Stale Admin update RPCs return a conflict. Cached client IDs become unavailable on a fresh lookup.
- **Private PDFs:** Storage objects are retained, with their bytes and metadata unchanged. There is no storage deletion cascade, public bucket change, or widening of RLS. Direct object read/list/sign access remains denied to Admins, students and anonymous clients. The dedicated signing handler resolves paper metadata under the caller's RLS; fresh lookups for removed IDs cannot issue a URL. Existing handler tests prove an unavailable row returns 403 without calling signing.
- **Existing access window:** Already issued URLs remain usable until expiry (120 seconds from issuance). An in-flight request that resolved metadata before deletion can complete under this existing access model. Downloaded copies cannot be revoked. This change does not promise immediate revocation of previously authorized access.
- **Validation receipts:** Receipts remain with the retained immutable object paths. Keeping them avoids introducing a path-reuse/receipt mismatch. They grant no student catalog or signing access by themselves. Admins retain their existing ability to validate/upload and explicitly create metadata.
- **Orphan cleanup:** Deleted-subject PDFs become private retained orphans, as already happens with replacement/paper deletion. No cleanup process was added or executed. Any later cleanup needs separate authorization/review, a grace period for signed URLs and in-flight saves, and coordinated receipt/path handling so stale receipts can never authorize replacement bytes. UUID paths must not be recycled unsafely. Retention has a storage-cost implication, not a public-access implication.
- **Free access:** Remaining published PDFs stay free for students authorized by the existing catalog/account rules. No payment, purchase, subscription or entitlement check was added.

## Verification and evidence

| Verification | Result |
| --- | --- |
| New subject deletion regression, before fix | Expected FK violation on published subject after historical-schema test passed; see `subject-delete-red.txt` |
| `python3 scripts/question-papers-verify.py` | **17/17 PASS**, exit 0; includes Admin tests, module/mobile lifecycle/download tests, scope check and both TS projects |
| `python3 supabase/tests/question-papers-local.py --regression` | **PASS**, exit 0: historical/new deletion cases, metadata/object/receipt isolation, authorization, duplicate-save race, overlapping Admin edits, stale writes and five existing SQL suites |
| Existing `supabase/tests/run-all.sh` in a separate disposable cluster | **38/40 SQL suites PASS; overall exit 1**. Two SQL failures and one pre-existing missing harness file detailed below |
| `deno check --no-remote supabase/functions/question-paper-access/handler.ts` | **PASS**, exit 0 |
| `DENO_DIR=/tmp/qp-subject-delete-deno deno check --cached-only supabase/functions/question-paper-access/index.ts` | **PASS**, exit 0, after fetching the pinned SDK to a temporary cache |
| Original scope and current-session preservation | **PASS**; see `subject-delete-preservation.json` |
| `git diff --check` | **PASS**, exit 0 |

The test-first run caught the actual database error, rather than a source-text mismatch. The passing SQL test compares all other public/storage row contents, including receipts and private objects, before/after deleting the three target subjects. Direct access and metadata lookup tests run under real database roles. Storage HTTP behavior and browser/device UI behavior remain acceptance limits of the local harness.

The full existing runner reported:

1. `low_grants_checks`: **1 FAIL, 18 PASS**, specifically its assertion that no table outside four existing tables grants anon SELECT. This also fails with the **exact original Question Paper migration hash**, before the FK fix. The original module grants anon SELECT on `question_papers` for Storage policy subqueries; it has no anon metadata policy, so RLS returns zero rows (verified locally). Removing that grant would change the module's established cross-bucket compatibility design and is outside this minimal deletion fix. This assertion/design reconciliation remains open; it must not be reported as a green full SQL run.
2. `account_deletion_checks`: its legacy expectation that authenticated users can execute `delete_my_account()` fails both before Question Papers and with the original module. Historical Fix 3 explicitly revokes that grant in favor of the existing Edge Function. Neither the protected implementation nor this existing suite was changed.
3. `play-service-account-diagnostic-selftest.cjs`: the broad runner still invokes this missing file (`MODULE_NOT_FOUND`). It was already deleted in the starting worktree. It was not restored or edited. The runner completed its remaining harnesses, including concurrency and webhook checks, and returned nonzero.

The baseline comparison rebuilt the historical schema and then the exact pre-fix Question Paper migration in a second disposable cluster. `subject-delete-baseline-regressions.txt` records both SQL failures and the original FK definition. Initial sandbox attempts could not bind a PostgreSQL socket or resolve the SDK host; the authorized checks subsequently completed with local-socket/network access. No hosted testing occurred.

## Remaining production blockers and recommendation

**GO for the scoped FK correction as a local remediation; NO-GO for production rollout.** No protected implementation change or additional approval is needed to make the deletion fix concrete.

Before a separately authorized rollout, reconcile the broad regression failures above; complete actual Storage HTTP single/batch signing and direct read/copy/move/upsert/path-reuse denial checks; verify the dedicated handler's 120-second token lifetime and byte-validation integration on the target runtime; and complete browser/CORS/CSP and native PDF preview/export/lifecycle acceptance. These hosted and device gates were already open in `remediation.md`. No migration/deployment action is authorized by this report.
