# Question Paper P1 + P2 remediation — 2026-11-18

Local implementation only. Nothing was deployed, committed, pushed, remotely migrated or release-built. This report supplements and supersedes the original verification report's client-controlled expiry, metadata-only backend validation and viewer-lifecycle statements. The supplied P1/P2 issue list was the remediation specification; no separate Phase 5 report was present in this audit directory.

## Findings and evidence

| Finding | Local result | Evidence / acceptance limit |
| --- | --- | --- |
| P1-01 concurrent Admin edits | Fixed | Server-owned integer revision, atomic update/delete RPC predicates, SQLSTATE 40001 conflict, no authenticated direct update/delete grant. Two overlapping Admin connections retain revision 1: exactly one succeeds. Stale republish, old PDF restore and deletion all fail; current-revision replacement/deletion succeed. Form retains its original revision. |
| P1-02 signing expiry | Implemented; hosted verification pending | New `question-paper-access` function resolves the ID using the original user's unchanged RLS, then signs only the resolved module object with a constant 120 seconds. Caller `expiresIn` is ignored. New-bucket restrictive SELECT guard denies all direct client download/sign/list paths even if another permissive policy exists. SQL tests deny SELECT for Admin, student and anonymous roles. Handler tests deny unauthorized/missing accounts and fix expiry at 120. Direct Storage HTTP sign/batch-sign tests have **not** run. |
| P2-01 duplicate race | Fixed | Concurrent inserts use two different UUID object paths, independently normalized type values, one successful commit, one identity-constraint violation, and one persisted row. The test asserts `question_papers_identity`, so object-path uniqueness cannot produce a false positive. |
| P2-02 native download validation | Fixed locally | HTTP 200 required; case-insensitive response headers, PDF MIME, actual non-directory file size 5..52,428,800 bytes, advertised Content-Length when present, and `%PDF-` signature checked before Android directory/export creation or iOS menu. Empty, oversized, bad MIME/signature, mismatched length, failed status and interrupted download all reject and clean temporary files. Device export still pending. |
| P2-03 preview invalidation | Fixed | Edit/replace, successful save and mutating actions invalidate the preview generation and clear the preview. Deferred pre-replacement preview responses are ignored. Rapid duplicate preview actions create only one request. |
| P2-04 backend PDF validation | Implemented; hosted verification pending | Dedicated new function checks the existing Admin/MFA predicate using the original JWT, downloads the new module object server-side and validates actual Blob MIME/size/signature. Only then does its service client insert a receipt. Metadata inserts/replacements require a matching receipt and Storage metadata size. Clients cannot forge receipts. Direct client object overwrite and deletion are denied, preventing reuse of a validated path for different bytes. No existing upload security code changed. |
| P2-05 PDF lifecycle | Fixed/tested locally; device/browser acceptance pending | Module-specific tests cover background/foreground invalidation and reload, expired URL recovery, interrupted download, account switch, superseded callbacks, resource disposal, web fetch failures and embedding fallback. Controlled web fetch replaces unreliable cross-origin iframe error detection. |

The new server boundary is isolated to the new module's function, tables, helpers and bucket-specific policies in its unapplied migration. No shared configuration or existing security implementation needed modification, so no protected-change approval was requested. The service credential stays in the server environment; it is never shipped to either client. Existing authenticated Admin/MFA and subject/year/course predicates are consumed unchanged. There is no purchase, subscription or entitlement dependency.

The storage boundary follows the documented [SELECT authorization requirement for signing](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl) and [Storage RLS access control](https://supabase.com/docs/guides/storage/security/access-control). Expiry is fixed by the new server function rather than a client convention.

Previously issued URLs are **not immediately revoked**. They remain usable until their encoded expiry; URLs issued by the former client-controlled flow could have a longer expiry than 120 seconds. Downloaded copies cannot be revoked. Signing authorization is checked when issuing a URL, not continuously during its lifetime.

PDF validation checks MIME, byte size and signature; it is not full PDF structural parsing, malware scanning or content disarm. The new private upload bucket retains objects after paper replacement/deletion, including failed/ambiguous saves. There is no client deletion or orphan-cleanup path; adding cleanup requires a separate review so validation receipts cannot be reused unsafely.

## Verification

| Command | Final result |
| --- | --- |
| `python3 scripts/question-papers-scope-check.py` | PASS, exit 0 |
| `node admin-panel/scripts/question-papers-selftest.cjs` | PASS, exit 0 |
| `node admin-panel/scripts/question-papers-ui-selftest.cjs` | PASS, exit 0 |
| `node admin-panel/scripts/question-papers-form-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/question-papers-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/question-papers-ui-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/question-papers-download-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/question-papers-lifecycle-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/question-papers-web-preview-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/navigation-lazy-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/audit-navigation-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/pdf-lifecycle-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/pdf-remote-retry-selftest.cjs` | PASS, exit 0 |
| `node supabase/tests/question-paper-access-selftest.cjs` | PASS, exit 0 |
| `npm test --prefix admin-panel` | PASS, exit 0 |
| `node mobile-app/node_modules/typescript/bin/tsc -p mobile-app/tsconfig.json --noEmit --pretty false` | PASS, exit 0 |
| `node admin-panel/node_modules/typescript/bin/tsc -p admin-panel/tsconfig.app.json --noEmit --pretty false` | PASS, exit 0 |
| `python3 supabase/tests/question-papers-local.py --regression` | PASS, exit 0; five existing SQL suites also pass |
| `DENO_DIR=/tmp/qp-remediation-deno deno check supabase/functions/question-paper-access/index.ts` | PASS, exit 0 |
| `deno check --no-remote supabase/functions/question-paper-access/handler.ts` | PASS, exit 0 |
| `git diff --check` | PASS, exit 0 |

See `remediation-test-results.json` for exact module/Admin/mobile commands, exit codes and output, and `remediation-sql-results.txt` for disposable PostgreSQL output. The local SQL runner rebuilds the complete existing migration chain, then the new unapplied migration, in a fresh PostgreSQL 17 cluster. It never reads a remote connection string or project credentials.

The sandbox denied PostgreSQL's local Unix socket. The authorized local test was rerun outside the sandbox, using only its disposable cluster. A first concurrency-fixture run collided with the duplicate winner's object path; a later run exposed leaked test Admins in `admin_mfa_checks`. Both fixture issues were corrected by deleting the duplicate row before the next test and cleaning test Admins before existing suites. No existing test or product MFA implementation was modified.

`deno check --no-remote .../index.ts` initially could not resolve its uncached SDK. `DENO_DIR=/tmp/qp-remediation-deno deno check supabase/functions/question-paper-access/index.ts` subsequently passed using a temporary dependency cache; no deployment occurred. `deno check --no-remote supabase/functions/question-paper-access/handler.ts` also passed.

Independent review: [remediation-review.md](remediation-review.md). The reviewer found a web embedding P2; the author reproduced and fixed it with controlled fetch and fallback coverage.

## Remaining findings and release decisions

- P0: none identified in the scoped local review.
- P1: P1-02 remains an acceptance blocker until actual Storage HTTP tests prove ordinary Admin/student tokens cannot sign directly (single and batch, including requested long expiry), read privately, copy/move/upsert/reuse an existing path, or access drafts/unpublished/inactive-catalog papers. Verify the dedicated function's returned token expiry is at most 120 seconds on the target runtime.
- P2: hosted byte-validation integration and native/browser acceptance remain open. Verify wrong MIME/signature, oversized/truncated/interrupted upload, missing/forged receipts, account change during download, Android folder export, iOS menu, background/foreground, expired preview, unsupported browser PDF embedding, CSP and CORS. Tests are component/injected-client/local-SQL tests, not device or browser E2E evidence.
- Staging: **NO-GO for acceptance or module rollout** until the isolated backend and HTTP/byte-validation checks are verified in a separately authorized staging session. The implementation is ready for that verification; this task did not authorize provisioning or deployment.
- Production: **NO-GO**, pending staging acceptance and real device/browser verification. No production readiness claim is made.

## Preservation and exact changed-file inventory

See `remediation-preservation.json` for preservation counts, Git-status comparison and every changed/added path relative to the start of this remediation. Original project files, existing integration files, dependencies/configuration, existing migrations and protected implementations remain byte-identical to the remediation baseline. The original module scope check also verifies all 3,088 original file states, with only the five previously authorized integration insertions.

The inventory below records this remediation only, excluding pre-existing unrelated edits and the module's unchanged files.

Changed existing module/audit files (19):

- `admin-panel/scripts/question-papers-selftest.cjs`
- `admin-panel/scripts/question-papers-ui-selftest.cjs`
- `admin-panel/src/features/question-papers/QuestionPapersPage.tsx`
- `admin-panel/src/features/question-papers/service.ts`
- `admin-panel/src/features/question-papers/types.ts`
- `docs/audit/question-papers-20261118/verification.md`
- `mobile-app/scripts/question-papers-download-selftest.cjs`
- `mobile-app/scripts/question-papers-selftest.cjs`
- `mobile-app/scripts/question-papers-ui-selftest.cjs`
- `mobile-app/src/features/question-papers/download.native.ts`
- `mobile-app/src/features/question-papers/download.web.ts`
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.web.tsx`
- `mobile-app/src/features/question-papers/service.ts`
- `mobile-app/src/features/question-papers/usePaperPdf.ts`
- `mobile-app/src/features/question-papers/usePaperResource.ts`
- `scripts/question-papers-verify.py`
- `supabase/migrations/20261118172019_question_papers.sql`
- `supabase/tests/question-papers-local.py`
- `supabase/tests/question_papers_checks.sql`

Added files (12):

- `docs/audit/question-papers-20261118/remediation-plan.md`
- `docs/audit/question-papers-20261118/remediation-preservation.json`
- `docs/audit/question-papers-20261118/remediation-review.md`
- `docs/audit/question-papers-20261118/remediation-sql-results.txt`
- `docs/audit/question-papers-20261118/remediation-test-results.json`
- `docs/audit/question-papers-20261118/remediation.md`
- `mobile-app/scripts/question-papers-lifecycle-selftest.cjs`
- `mobile-app/scripts/question-papers-web-preview-selftest.cjs`
- `mobile-app/src/features/question-papers/usePaperWebPreview.ts`
- `supabase/functions/question-paper-access/handler.ts`
- `supabase/functions/question-paper-access/index.ts`
- `supabase/tests/question-paper-access-selftest.cjs`
