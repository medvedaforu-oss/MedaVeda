# Historical security review — product-model correction

Videos and MCQ tests are free. Only PDF Notes are paid.

The paid-MCQ entitlement assumptions in this review are superseded. In
particular, `proposed-database-fixes.sql` and `proposed-quiz-submission.sql`
must not be deployed as current rollout instructions: they would introduce
paid-quiz restrictions that conflict with the product. The reproduction and
verification SQL files are historical fixtures, not the current acceptance
criteria. They have been retained unchanged for audit provenance.

Answer-key protection and server-verified scoring still matter for free tests.
Use the later [quiz/admin MFA rollout procedure](../../audit/MEDVEDA_RELEASE_COMPATIBILITY_STAGING_READINESS_20261023.md)
and current source tests for that boundary. Other historical findings need
their own current-source/deployment verification; this correction does not
invalidate unrelated evidence or certify a production release.
