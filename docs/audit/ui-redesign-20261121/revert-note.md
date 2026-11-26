# UI redesign revert — 2026-11-22

Reverted Steps 1–4, polish-1, and the Home/web-frame changes on `audit-5`.
The revert is uncommitted; nothing was pushed. The seven original reports in
this directory remain byte-identical to the backup.

## Backup

- Branch: `ui-redesign-backup`
- Commit: `e2fe83b2182757a371cbfaef3e0b2be18b933a41`
- Full binary-capable patch, including originally untracked files:
  `/home/ganeshp8545/AyurPulse-backups/ui-redesign-20261122T222358Z/full-working-tree.patch`
- Backup verification: `backup.json` beside that patch. Original branch HEAD
  remains `d5536ed075422ccb54c7cfd609dfc829f9757fe1`; staged entries are unchanged.

## Restoration and limits

**Exact:** all 102 redesign-only modified files restored from HEAD, whose hashes
match the recorded pre-redesign state. Twelve mixed files also match their
recorded pre-redesign SHA-256 values: the earlier Question Papers verification
report, MV012 and Razorpay internal-test scripts, Home, About, Downloads,
OrderSummary, PaymentFailed, both Notes PDF viewers, Privacy and MyPurchases.
Earlier billing retirement, no-iap-v1 expectations, payment/account guards,
Question Papers Home entry and corrected offline/legal copy are retained.

**Functionally equivalent; original contents unavailable:**

- `mobile-app/src/navigation/AppNavigator.tsx`: HEAD presentation plus the four
  earlier lazy Question Papers routes. Original paper-header titles cannot be
  independently verified; route names, params and guards are preserved.
- `mobile-app/src/features/question-papers/PaperLayout.tsx` and
  `PaperReaderToolbar.tsx`: original theme modules and feature-local controls;
  loading/error/retry/offline, download/share/status and stale-link guards kept.
- All five Question Papers screen implementations: restore the documented
  Year → Subject → exam-session/paper → reader flow; retain scoped loaders,
  validated web preview, PDF events and error handling. Exact earlier JSX,
  helper copy, typography details and reader layout cannot be verified.
- `mobile-app/scripts/question-papers-{ui,lifecycle,redesign}-selftest.cjs`:
  adapt presentation mocks/assertions while retaining behavior coverage.
  The last script is retained because it also tests earlier interactions.

Both newly reclassified files were untracked. The earlier Question Papers
verification report names neither; the pre-Step-1 visual audit names the toolbar,
and Step 1 lists the interaction selftest as existing. Their exact earlier
contents were unavailable, so neither is claimed byte-exact.

Removed 25 redesign-created source/test/plan files, checking for zero remaining
importers before each removal. No redesign theme barrel, layout module, shared
component or test-support compatibility file remains. App.tsx and all global
theme modules equal HEAD; the 480px web frame is gone. No dependencies added.

## Verification

- Strict TypeScript: PASS (`tsc --noEmit --strict -p mobile-app/tsconfig.json`).
- ESLint on all 105 changed TS/TSX files: PASS. Full mobile-source lint retains
  the pre-existing `usePaperResource.ts:26` unnecessary `revision` dependency
  error; that hook matches both the backup and the pre-redesign hash.
- All 92 existing mobile selftest/test scripts were run: **90 PASS, 2 FAIL**.
  `android-vault-preflight-selftest.cjs` and `firebase-config-selftest.cjs` expect
  provider `disabled`, whereas the earlier configuration uses `razorpay`.
  Both tests and their config inputs match the pre-redesign hashes. No payment
  configuration or assertions were changed to hide these existing failures.
  Closed-testing initially hit sandbox child-process EPERM; its authorized rerun
  passed all 30 constituent suites. All Question Papers tests pass.
- Offline Expo web export: PASS, three bundles plus index.html/metadata.
- Removed-import grep and dependency scan: zero remaining references in live
  mobile source/test/config code. Whitespace check: PASS.
- Independent read-only review: no important actionable issues; preservation
  counts and exact restorations independently verified.
- Backup comparison: 2,811 of 2,961 backup paths unchanged; the other 150 are
  exactly the authorized restored/reconstructed/removed paths. No out-of-scope
  changes. Earlier app config, navigation types, payment-provider/live-test/
  payment-summary scripts, paper services/hooks, migration and admin feature
  samples remain byte-identical to the backup.

Evidence, per-file preview diffs, classifications and check logs:
`/tmp/medveda-ui-revert/`. Web export: `/tmp/medveda-ui-revert/web-export/`.
No browser/device screenshots or live auth/payment/backend checks were performed;
exact visual equivalence is not claimed for the reconstructed Question Papers UI.
