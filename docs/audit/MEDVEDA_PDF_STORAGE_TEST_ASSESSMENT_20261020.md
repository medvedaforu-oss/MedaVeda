MedVeda PDF storage regression assessment — 2026-10-20

The stale test was **retained and corrected**, not deleted. No production storage policy was changed to make it pass.

`supabase/tests/high_phone_and_notes_checks.sql` previously asserted “buyer can read the exact object,” expecting one directly readable storage object for a purchased PDF. The already-applied `20261020100000_notes_service_reads.sql` intentionally removed the purchased-reader policy and installed the restrictive `notes_service_reads_only` policy. Students, including buyers, must obtain note URLs through the service endpoint, which checks blocked status, note eligibility, and purchases. A purchase alone must not enable direct Storage reads or client-side URL signing.

The original assertion failed identically before and after course-wide browsing: **1 FAIL / 20 PASS**. The first full run during the parent-publication fix reproduced that same isolated failure. This was an obsolete test contract, not evidence that the private-bucket restriction should be weakened.

The same suite now:

- Selects a purchased, active **paid** note rather than accidentally using a free preview.
- Asserts that the buyer cannot directly read the exact storage object, as required by the existing restrictive policy.
- Retains checks denying substring paths, unrelated objects, non-buyers, and anonymous users; bucket privacy and all phone-security tests are retained.
- Adds a positive service-role `user_can_access_note` check for the buyer and a negative check for the unentitled account.

Result: **0 FAIL / 23 PASS**, including the full final runner. No assertion was replaced with a constant or skipped.

The new `content_publication_checks.sql` additionally tests purchased and preview note denial under inactive course, year, subject, and chapter, while checking that the purchase record itself stays unchanged. The new `content-url-publication-selftest.cjs` exercises the actual `get-note-url` handler using real service-role SQL authorization from a disposable database and verifies that denied requests never reach signing or return a URL. Auth and Storage transport are mocked in that handler test; it is not a claim of end-to-end hosted Storage verification.

Staging must still verify real buyer/non-buyer HTTP responses, actual signed PDF delivery, blocked/refunded accounts, client signing denial, and expiry. Already-issued signed URLs normally remain valid for up to 120 seconds; database publication changes do not recall an issued bearer URL or previously downloaded bytes.

Evidence: `docs/audit/evidence/publication-parent-fix-20261020/` contains the initial full-run failure, corrected storage-suite result, final full-run result, and URL-handler results. The earlier pre/post baseline evidence remains in `docs/audit/evidence/course-wide-final-verification-20261020/`.
