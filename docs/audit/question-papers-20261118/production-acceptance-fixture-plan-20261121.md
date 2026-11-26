# MEDVEDA production Question Paper acceptance fixture plan

2026-11-21 UTC · Project `xbvenkfmesugrbjuufyw` · Plan v1

**AWAITING SEPARATE EXPLICIT OWNER APPROVAL. Phase 1 only.** No production fixtures, sessions, uploads, receipts, publication changes or deletions have been performed by this acceptance review. No UI release is authorized. Question Papers must remain free for authorized signed-in students, including students with zero purchases.

## Read-only production observations

- `question-paper-access` is ACTIVE, version 1, `verify_jwt=true`; deployed bundle hash `7232dbbd507fd24b8e517351ca3b2a7aeaa6763ba1a51d735e6e880d4444ccf6`. Its deployed source authenticates the user, checks metadata visibility under the original user's RLS, and signs with a constant 120 seconds. Validation uses the existing `am_i_admin()` predicate and actual downloaded MIME, size and `%PDF-` signature.
- `question-papers` is private, allows `application/pdf`, maximum 52,428,800 bytes. Live module metadata count: **0**; validation-receipt count: **0**; bucket-object count: **0**. These are observations, not reservations; recheck before execution.
- Live FK: `question_papers_subject_id_fkey`, `FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE`.
- Storage restrictive guards deny direct client SELECT, UPDATE and DELETE in this bucket. Both live INSERT-policy path expressions accept the proposed UUID PDF format, as checked by read-only SQL expression evaluation.
- `am_i_admin()` checks membership in `admins` and, when `admin_mfa_required()` is true, JWT `aal2`. Current `admin_settings.require_mfa=false`. No configuration changes are proposed.
- Subject access uses `has_content_access(course_id, year_id)` plus a restrictive published-ancestry policy. A matching profile course can qualify without purchases. Existing purchase fallback in that shared predicate is preserved, not exercised or modified.
- Aggregate discovery found 3 Admin memberships and 21 nonblocked BAMS non-Admin profiles with no purchase rows. The selected student candidate also has a non-anonymous Auth user. Counts do not establish owner control, credentials or usable sessions. No nonblocked student profile from another course was identified in the grouped inventory.
- Earlier November 18–21 audit reports contain historical local/pre-deployment evidence. They do not substitute for current authenticated production acceptance.

## Existing catalog selected, unchanged

| Record | Exact ID | Existing description |
| --- | --- | --- |
| Course | `bams` | BAMS Marathi Medium |
| Year | `d712b0cd-7f84-4873-b963-28a916d0ae58` | BAMS 3rd Year |
| Subject | `543cdeb6-d903-4d8e-91d5-069d7dc47a58` | Kayachikitsa |

All three are active and have matching ancestry. No course/year/subject edits are authorized by the base plan. Reconfirm activity and ancestry using the real Student session before uploads; stop if access is unsuitable. Do not alter catalog or account data to make a test pass.

## Exact proposed sessions

| Alias | Proposed existing account ID | Required owner confirmation / conditions |
| --- | --- | --- |
| A | `730100ba-afe9-450a-bc30-502f849f2af0` | Owner must confirm this is an account they control and authorize its use. Ordinary sign-in through existing authentication; no reset, role changes, token fabrication or factor enrollment. |
| S | `ac9162ca-1d6a-41b4-bdf6-ab30e139c532` | Owner must confirm control and authorize use. Observed nonblocked, non-Admin, non-anonymous; profile course `bams`, year matches the selected year, zero purchase rows. Recheck those facts immediately before and after testing. |
| U | None safely identified | BLOCKED. No new account, profile-course reassignment, blocking/unblocking, impersonation or manufactured JWT is proposed. Another exact owner-controlled account requires an amended inventory and explicit approval before use. |

No test accounts will be created. If A or S is not owner-controlled or cannot use normal authentication, dependent tests remain BLOCKED; do not substitute an arbitrary real user. The owner should use an approved local secure sign-in surface; never put passwords, JWTs, refresh tokens, MFA secrets or signed URLs into chat, files, shell history or evidence. Retain tokens and signed URLs only in transient process/browser memory. Ordinary sign-in can create Auth session/audit records; their IDs and counts must be recorded without token material. No session has been opened in Phase 1. Availability of a secure executable session channel remains a prerequisite.

## Base inventory proposed for approval

Run marker: `qa-qp-20261121-a7c39e12`. All names below are reserved in this plan only. Recheck exact IDs, paths and identities for collisions; if any exists, stop and revise the plan. Never upsert or overwrite.

One deterministic, structurally valid one-page synthetic PDF source is proposed: visible text `MEDVEDA QUESTION PAPER ACCEPTANCE TEST — qa-qp-20261121-a7c39e12 — SYNTHETIC, NOT AN EXAM PAPER`. It contains no real exam content or personal data. Generate locally after approval; record its SHA-256 and byte count before upload. Two byte-identical copies are necessary because metadata has a UNIQUE object_path constraint.

| Alias | Exact bucket object path | Payload / intended receipt |
| --- | --- | --- |
| V1 | `a1d98b9c-c139-4de6-a2a2-c33212e3bc91.pdf` | Valid synthetic PDF; `application/pdf`, 5..52,428,800 bytes; one server-created receipt after validation. |
| V2 | `d502658f-9b62-4df0-b908-89173dcc9818.pdf` | Same valid PDF bytes; independent immutable path and server-created receipt. |
| I1 | `70e4d59c-1de2-4c3b-864f-67e16f76fa32.pdf` | Exactly UTF-8 `NOT_A_PDF\n` (10 bytes), uploaded declaring `application/pdf` to exercise server byte validation; **no receipt expected**. Storage may reject before persistence; record actual result. |

All object paths are in bucket `question-papers`, at its root. A prefixed folder path would violate the deployed UUID-only format. Traceability comes from this exact manifest, metadata marker and synthetic PDF text. Set `upsert=false`; no object replacement or removal.

| Alias | Exact metadata ID | Initial values |
| --- | --- | --- |
| P | `f272d239-d24a-4fcb-8be5-66b1fd7c5f23` | selected existing subject; exam_year=2026, exam_month=11, paper_type=`qa-qp-20261121-a7c39e12`, paper_number=`published`, object_path=V1, published=false; server revision=1. |
| D | `173fdd70-e771-4929-abed-7ba65e91c2f6` | same subject/year/month/type; paper_number=`draft`, object_path=V2, published=false; server revision=1. |
| N | `1a706c44-0612-4457-aef9-e67d5f51bfb7` | Rejected INSERT attempt only: same subject/year/month/type; paper_number=`invalid`, object_path=I1, published=false. No persisted row expected. |

Expected base retained inventory: **2 metadata rows, 2 valid PDF objects, up to 1 invalid object, 2 validation receipts, 0 new accounts/catalog records**. If rejection unexpectedly persists N or an invalid receipt, record FAIL, stop further mutation and retain it for separately reviewed cleanup. Never auto-delete unexpected state.

Publishing P makes synthetic metadata visible to authorized students through any existing backend consumers, even though the UI is not being released. Owner approval must explicitly accept that temporary production visibility and retention until separate cleanup approval.

## Bounded base operations after approval only

1. Confirm project and approved A/S identities; obtain genuine sessions through existing Auth. Recheck no purchases for S, catalog visibility and immutable-path/ID collisions. Use end-user JWTs for acceptance requests, not SQL role simulation or service-role reads masquerading as Student results.
2. Capture scoped read-only fingerprints/counts for existing catalog/module rows and security definitions, without data dumps or backups. Record only non-secret evidence. Existing financial/account records are read-only.
3. As A, upload V1 and V2 once each, validate each via the existing Edge Function, and confirm exactly matching receipt path/actual size through read-only privileged inspection. Try client receipt INSERT/UPDATE and unvalidated N INSERT; expect denial. No privileged receipt insertion is authorized.
4. Insert P and D as drafts through A's authenticated Data API. Test draft isolation before publishing. Publish **only P** with `question_papers_update` at its current revision. D remains unpublished throughout.
5. Read P and request its signed PDF as S with zero purchases. Verify metadata, PDF response and bytes. Test anonymous and Student write/validate denial. Use A/S/anonymous requests for direct Storage single signing, batch signing, private read and listing. A 200 empty list or per-item batch errors can constitute denial; no object information, valid signed URL or bytes may leak. Reject long caller expiry overrides on direct paths; do not persist returned secrets if a bypass succeeds.
6. Sign P through the Edge Function using requested expiresIn values 1 and 3600; verify both actual encoded lifetimes are 120 seconds (without storing tokens). Fetch immediately and after expiry using fresh network requests with caches bypassed; record server times/status and `exp-iat` only. A new signed URL after expiry is a separate authorization request. Never interpret a cached/downloaded copy as an expiry failure.
7. As A, unpublish P using its current revision; verify new S metadata/sign requests are denied while D remains hidden. A previously issued URL may work until its original expiry. Restore P to published using the current revision; this is approved-fixture-only publication mutation.
8. Exercise concurrency on **P only**: two parallel `question_papers_update` calls with the same revision and identical `published=true` changes; exactly one success and one SQLSTATE 40001, revision increases once. Submit stale update and stale `question_papers_delete`; expect 40001 and no deletion. Successful deletion is not in the base scope. If any stale deletion unexpectedly succeeds, stop and record FAIL; no automatic recreation.
9. As A, upload I1 once and call validate if it persists: expect 422, no receipt. Retry N INSERT after rejection; expect validation denial and no metadata. If Storage itself rejects the upload, validation of uploaded invalid bytes stays BLOCKED rather than being falsely passed. No oversized uploads or additional negative-test objects are in this inventory.
10. Test A versus S Admin authorization, validation and metadata operations. Preserve `require_mfa=false`; record the current predicate's behavior. Test aal2 only if A already has an enrolled factor and the owner can complete the existing challenge. **The require_mfa=true enforcement branch stays BLOCKED**; no configuration changes/factor resets/enrollment are allowed.
11. Test OPTIONS and POST from the actual intended Admin/Student web origins using a real browser, including signed Storage PDF fetch, MIME, bytes, cache headers, disposition for download=true, and browser PDF handling. Gateway auth/CORS behavior must be observed over HTTP. Missing origin/browser/session information makes that portion BLOCKED. No UI deploy/build or unrelated feature navigation is required.
12. Stop and inventory all retained rows/objects/receipts and fixture revisions. No retries with new paths, broader fixtures, permissions or catalog edits without a revised approved inventory. No cleanup is automatic.

Use read-only receipt inspection solely to corroborate validation; it cannot replace Student/Admin end-to-end tests. Every request must be scoped to these IDs/paths. Any unexpected access success is FAIL, not BLOCKED. Preserve only redacted status, error code, response-header facts, hashes, counts and timestamps; suppress raw auth responses, URL-bearing JSON and network logs.

## Separate optional CASCADE inventory and approval

This option is **excluded from base approval**. It requires explicit approval to create and delete exactly one disposable subject. Existing subjects must never be deleted or modified. If this option is not approved, test 11 remains BLOCKED despite the live FK definition.

- New `subjects.id`: `qa-qp-20261121-a7c39e12-cascade`; title `TEMP QA QUESTION PAPERS CASCADE qa-qp-20261121-a7c39e12`; course/year as above; active=false; order=2147483000; icon/color=NULL. No chapters, Notes, Quiz, Videos, products, purchases or other child data.
- New metadata C: ID `198c1219-67cd-49d9-8c69-899582960407`; subject_id equals that disposable subject; exam_year=2026, exam_month=11, paper_type=`qa-qp-20261121-a7c39e12`, paper_number=`cascade`, published=false.
- New valid PDF V3: `d48cc888-1bbf-4165-903a-9e7fb1f4c0ea.pdf`, byte-identical to V1, uploaded and validated once; one receipt. Use V3 for C.
- Before subject creation, inspect all live subject INSERT/DELETE triggers and reverse FK dependencies read-only. Proceed only if this exact inactive subject can be created/deleted without side effects in unrelated modules. If required fields or triggers force a broader inventory, stop and revise approval; never improvise.
- Assert the new subject has only C as a dependent row and no unrelated references immediately before deletion. As authorized A, delete exactly this subject by ID (never SQL `TRUNCATE` or broad `DELETE`). Assert C cascades, existing subjects/papers remain unchanged, V3 and its receipt remain private and retained. No fallback privileged deletion is authorized.
- The subject and C are intentionally destroyed by the approved acceptance action, not automatic cleanup. Expected additional retained inventory: **1 valid object + 1 receipt**, no subject/C row after success. If deletion is blocked, retain the exact fixture state and report BLOCKED; do not widen permissions.

## Cleanup procedure for separate later approval

No deletion approval is requested for cleanup now. Prepare a final manifest of actual row IDs/revisions, paths, SHA-256/size, receipts, subject state and any unexpected retained records after execution. The owner must review and separately approve exact deletion operations.

1. Re-read the exact manifest objects and reference graph. Stop on any unapproved reference or changed ownership/content. In a reviewed maintenance window, unpublish retained P with its current revision and wait beyond the last issued 120-second URL lifetime before object removal.
2. Remove only approved P/D (and N/C if unexpectedly retained) through the existing Admin revision-checked RPC. Never touch pre-existing Question Papers. Subject deletion, if still needed, requires its own explicit approval and dependency check.
3. Client Storage DELETE is intentionally denied. If later approved, an authorized privileged backend must remove only the exact unreferenced manifest paths through the Storage API, never by deleting `storage.objects` directly. No credentials in evidence. No new function/deployment or grant change is proposed.
4. Recheck absence of objects and references, then remove only the corresponding approved orphan receipts using a separately authorized privileged operation. If that privilege is unavailable or deletion fails, retain and report exact receipt paths. Never reuse a previously validated path, even after cleanup.
5. Preserve this plan and redacted results; report retained rows, objects and receipts explicitly. No account deletion is needed because none is created. Any explicit session revocation must be narrowly scoped to test sessions and separately authorized, not account-wide.

## Acceptance / release ledger at this stop

All statuses below are **BLOCKED: not executed, fixture/session approval pending**. Read-only source/config observations are not acceptance PASS results.

| # | Acceptance test | Additional blocker / required evidence |
| --- | --- | --- |
| 1 | Authenticated authorized Student, zero purchases | Owner-controlled S session; published P; actual PDF retrieval with no purchase mutation. |
| 2 | Unauthorized course denial | No safe U identified; requires amended exact account inventory and approval. |
| 3 | Draft / unpublished isolation | D hidden throughout; P hidden before publication and after unpublication; new sign requests denied. |
| 4 | Direct single / batch Storage signing bypass | A/S/anonymous real Storage HTTP responses; no valid URLs issued. |
| 5 | Private PDF read / listing denial | A/S/anonymous direct reads/list attempts reveal no bytes/object inventory. |
| 6 | Server-enforced 120-second expiry | Override attempts, encoded lifetime and uncached post-expiry HTTP denial. |
| 7 | Admin / existing MFA | A/S behavior pending; require_mfa=true enforcement separately BLOCKED by unchanged current configuration. |
| 8 | Valid PDF upload / receipt | End-user upload, Edge validation, exact size receipt, accepted metadata; receipt forgery denied. |
| 9 | Invalid PDF rejection | I1 byte validation, no receipt, N rejected. This covers bad signature, not every possible malformed/oversized PDF. |
| 10 | Revision conflicts | One concurrent winner; stale update/delete denied; exact revision delta. |
| 11 | Subject CASCADE | Optional inventory/deletion approval and side-effect preflight required; existing subjects excluded. |
| 12 | CORS / PDF response | Real intended origins/browser, Edge gateway and Storage response checks required. |

**Production objects created/modified by this review: none.** Only this new local plan file was added. Existing uncommitted work, payment/purchase/entitlement/subscription data, Auth/MFA/security configuration and unrelated modules were not modified. No staging, backups, deployments, migrations, commits, pushes or release builds were performed.

Remaining security acceptance gaps: all authenticated/runtime tests above, safe unauthorized-course session, enforced-MFA branch and optional CASCADE execution. No authenticated security success or failure is claimed. Observed byte validation is MIME/size/signature checking, not full PDF parsing or malware scanning; signed URLs are bearer capabilities usable until expiry and downloaded copies cannot be revoked.

**Admin UI: NO-GO. Student UI: NO-GO.** Acceptance is incomplete; no UI release is authorized.

## Owner approval requested

Approve **Plan v1 base inventory and bounded operations** explicitly, including temporary publication/retention, and confirm owner control of exact A/S account IDs. This approval excludes new accounts, U substitution, account/catalog edits, successful metadata deletion, cleanup and CASCADE. If A/S are unsuitable, provide authorized account IDs for a revised read-only eligibility review and approval rather than credentials.

Approve the **optional CASCADE inventory and its exact subject-deletion acceptance operation** separately if desired. Otherwise it remains BLOCKED. Cleanup always requires a later reviewed manifest and separate approval.

STOP: owner approval has not been received.
