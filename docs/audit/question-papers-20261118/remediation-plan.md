# Question Paper P1/P2 remediation plan

Authorized scope: only new Question Paper files, unapplied migration, tests and audit documentation. Preserve all pre-existing changes; no remote operations, commits, deployments or release builds.

1. Add regression cases, then revision-based compare-and-swap update/delete RPCs. Revoke direct authenticated update/delete on the new table; keep existing Admin/MFA predicate unchanged. Server increments revisions; old forms retain their original revision.
2. Assess signing and byte validation together. A dedicated Question Paper server boundary must be the sole signing authority and must verify bytes before metadata registration. No global Storage setting, existing policy, authentication or entitlement implementation may change. Record any approval boundary explicitly before touching it.
3. Correct duplicate races with distinct immutable objects and normalized identity variants, asserting the identity constraint and one committed winner.
4. Validate native download HTTP status, MIME, actual file size, signature and advertised length before any export; clean temporary failures.
5. Invalidate Admin previews at edit/save and guard pending preview callbacks. Add Question Paper lifecycle tests, including account switch, background/foreground, expiry, interrupted downloads, stale callbacks and web embedding failure.
6. Run all module checks, Admin/mobile regressions, complete disposable SQL authorization suite, exact file preservation comparison and independent read-only review. Report hosted/device limitations separately and inventory every changed file.
