# MedVeda mobile fix 2 — 14 November 2026

This report covers the current dirty working tree on `mobile-fix-2`, starting at `54c33cb`. It is not release/device/provider certification. Existing user changes remain uncommitted by explicit user choice; fixes that cannot be separated safely are BLOCKED for commit even where local regressions pass. Source outside mobile-app was not edited; audit evidence is the explicit documentation exception.

**Local verification is complete within the limits below.** Eight isolated finding commits were created. Inseparable commits, native tests, backend work and residual dependency advisories remain open. No device/provider acceptance or release readiness is claimed.

| ID | status | commit hash | before-log | after-log | files changed |
|---|---|---|---|---|---|
| MOB-01 | BLOCKED | — | [before](mobile-fix-2/before/MOB-01.log) | [after](mobile-fix-2/after/MOB-01.log) | `mobile-app/src/navigation/AppNavigator.tsx` |
| MOB-02 | BACKEND DEPENDENCY | — | Analysis only | Pending / design note | Design/evidence only or pending |
| MOB-03 | BLOCKED | — | [before](mobile-fix-2/before/MOB-03.log) | [after](mobile-fix-2/after/MOB-03.log) | `mobile-app/src/config/paymentProvider.ts` |
| MOB-04 | BLOCKED | — | [before](mobile-fix-2/before/MOB-04.log) | [after](mobile-fix-2/after/MOB-04.log) | `mobile-app/src/services/playBillingService.ts`, `mobile-app/src/screens/payment/OrderSummaryScreen.tsx` |
| MOB-05 | BLOCKED | — | [before](mobile-fix-2/before/MOB-05.log) | [after](mobile-fix-2/after/MOB-05.log) | `mobile-app/App.tsx` |
| MOB-06 | FIXED - DEVICE TEST PENDING | d94d0ffe6f | [before](mobile-fix-2/before/MOB-06.log) | [after](mobile-fix-2/after/MOB-06.log) | `mobile-app/src/screens/auth/ResetPasswordScreen.tsx`, `mobile-app/src/features/auth/deepLinkStore.ts`, `mobile-app/src/features/auth/recoveryFlow.js`, `mobile-app/src/features/auth/recoveryFlow.d.ts` |
| MOB-07 | BACKEND DEPENDENCY | d4bdd3cb0b | [before](mobile-fix-2/before/MOB-07.log) | [after](mobile-fix-2/after/MOB-07.log) | `mobile-app/app.config.js`, `mobile-app/src/navigation/AppNavigator.tsx`, `mobile-app/src/features/auth/deepLinkStore.ts` |
| MOB-08 | BLOCKED | — | [before](mobile-fix-2/before/MOB-08.log) | [after](mobile-fix-2/after/MOB-08.log) | `mobile-app/src/services/studyReminderService.ts` |
| MOB-09 | FIXED - DEVICE TEST PENDING | e27ae7b8ad | [before](mobile-fix-2/before/MOB-09.log) | [after](mobile-fix-2/after/MOB-09.log) | `mobile-app/src/services/quizAttempts.ts`, `mobile-app/src/services/syncEngine.ts` |
| MOB-10 | BLOCKED | — | [before](mobile-fix-2/before/MOB-10.log) | [after](mobile-fix-2/after/MOB-10.log) | `mobile-app/src/services/pushNotifications.ts`, `mobile-app/src/services/authState.ts` |
| MOB-11 | BLOCKED | — | [before](mobile-fix-2/before/MOB-11.log) | [after](mobile-fix-2/after/MOB-11.log) | `mobile-app/src/utils/downloadManager.ts` |
| MOB-12 | ANALYSIS ONLY | — | Analysis only | Pending / design note | Design/evidence only or pending |
| MOB-13 | BLOCKED | — | [before](mobile-fix-2/before/MOB-13.log) | [after](mobile-fix-2/after/MOB-13.log) | `mobile-app/src/services/authState.ts`, `mobile-app/src/utils/downloadManager.ts` |
| MOB-14 | BACKEND DEPENDENCY | — | [before](mobile-fix-2/before/MOB-14.log) | [after](mobile-fix-2/after/MOB-14.log) | `mobile-app/src/services/syncEngine.ts` |
| MOB-15 | FIXED - VERIFIED (automated) | c7c6d49ac9 | [before](mobile-fix-2/before/MOB-15.log) | [after](mobile-fix-2/after/MOB-15.log) | `mobile-app/src/services/searchService.ts`, `mobile-app/src/hooks/useGlobalSearch.ts`, `mobile-app/src/components/search/SearchResultRow.tsx` |
| MOB-16 | FIXED - DEVICE TEST PENDING | d967f3cbfe | [before](mobile-fix-2/before/MOB-16.log) | [after](mobile-fix-2/after/MOB-16.log) | `mobile-app/src/components/ProgressRing.tsx` |
| MOB-17 | BLOCKED | — | [before](mobile-fix-2/before/MOB-17.log) | [after](mobile-fix-2/after/MOB-17.log) | `mobile-app/src/hooks/useQuizStats.ts` |
| MOB-18 | FIXED - VERIFIED (automated) | b3548fdf34 | [before](mobile-fix-2/before/MOB-18.log) | [after](mobile-fix-2/after/MOB-18.log) | `mobile-app/src/screens/payment/OrderSummaryScreen.tsx` |
| MOB-19 | FIXED - VERIFIED (automated) | 8bdf72c15b | [before](mobile-fix-2/before/MOB-19.log) | [after](mobile-fix-2/after/MOB-19.log) | `mobile-app/src/hooks/useNetworkStatus.ts` |
| MOB-20 | FIXED - DEVICE TEST PENDING | 1f12bb3abf | [before](mobile-fix-2/before/MOB-20.log) | [after](mobile-fix-2/after/MOB-20.log) | `mobile-app/src/screens/auth/ResetPasswordScreen.tsx` |
| CFG-01 | BLOCKED | — | [before](mobile-fix-2/before/CFG-01.log) | [after](mobile-fix-2/after/CFG-01.log) | `mobile-app/package.json`, `mobile-app/package-lock.json` |
| CFG-02 | BLOCKED | — | [before](mobile-fix-2/before/CFG-02.log) | [after](mobile-fix-2/after/CFG-02.log) | `mobile-app/package.json`, `mobile-app/package-lock.json` |

## Findings and verification

### MOB-01 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Recovery and authentication routes have a constant navigation group; protected routes retain the owner key. Route declaration regression passes. Commit overlaps existing user navigation work.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

### MOB-02 — BACKEND DEPENDENCY

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
B03 remains open. Download and viewer persist readable PDF bytes; the dormant vault is not activated. See offline vault design note.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-02 note](mobile-fix-2/after/MOB-02.md).

### MOB-03 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Historical restoration eligibility is independent of configured sales provider; checkout still requires explicit Play provider and existing UCB gates. Config/disabled-sales history probes pass; existing provider work prevents an isolated commit.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

### MOB-04 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
30-second uncertain-outcome recovery keeps listeners and blocks replacement checkout. Auth lifetime checks reject stale owner callbacks. Existing untracked billing service and dirty checkout prerequisites prevent isolated commit; the final correction has independent approval.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-04 note](mobile-fix-2/after/MOB-04.md).

### MOB-05 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
GestureHandlerRootView encloses the entire app with flex:1. Root-hierarchy probe passes; existing App.tsx edits overlap the commit and Android swipe acceptance is pending.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

[Owner notes](mobile-fix-2/checkpoints/MOB-05/notes.md).

### MOB-06 — FIXED - DEVICE TEST PENDING

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
New recovery revisions synchronously dispose previous controllers, serialize SDK operations and guard stale UI/auth continuations. Separate initial-read generation preserves cleanup ordering. Deferred import/update and existing cold/warm-link tests pass.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-06 note](mobile-fix-2/after/MOB-06.md).

### MOB-07 — BACKEND DEPENDENCY

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Config, navigator and store share the installed build scheme and exact recovery route. Production identifiers remain unchanged. Build-specific hosted bridge and Auth redirect allowlist remain external requirements.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-07 note](mobile-fix-2/after/MOB-07.md).

### MOB-08 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Foreground banner/list/sound consult validated category preferences. Muted/unmuted/untyped handler tests pass. Existing reminder-handler work is inseparable; background preference enforcement requires the sender.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-08 note](mobile-fix-2/after/MOB-08.md).

### MOB-09 — FIXED - DEVICE TEST PENDING

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Quiz result and enqueue-only outbox insertion share one synchronous SQLite transaction; drain starts after commit. Injected outbox failure rolls back the local result. Real native SQLite/process-death testing remains pending.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-09 note](mobile-fix-2/after/MOB-09.md).

### MOB-10 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Failed signout rolls back push suppression only for the frozen owner/generation handle and unchanged auth epoch. Reused/stale handles and ABA are tested. Existing push/auth prerequisites prevent isolated commit.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

[Owner notes](mobile-fix-2/checkpoints/MOB-10/notes.md).

### MOB-11 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Pause/cancel serialize; cancellation deletes only a validated app-owned partial path and retains cleanup metadata after deletion failure. Overlap/traversal/failure-retry probes pass. Existing download changes prevent an isolated commit; native file measurements are pending.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-11 note](mobile-fix-2/after/MOB-11.md).

### MOB-12 — ANALYSIS ONLY

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
No encryption dependency or code was added. SDK57 AES-GCM option, strict v3 authenticated envelope, validated legacy/v2 migration and publication/tamper risks are documented; v2 remains unauthenticated.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-12 note](mobile-fix-2/after/MOB-12.md).

### MOB-13 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Offline ownership is serialized and epoch-checked around awaits; transfer admission waits for ownership. ABA read/purge/write and signout-cleanup/admission probes pass. Existing auth/download changes prevent isolated commit.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-13 note](mobile-fix-2/after/MOB-13.md).

### MOB-14 — BACKEND DEPENDENCY

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Every entity is owner-filtered; failed rows remain pending. Correction adds retry cooldown before batch selection and captured-owner bearer dispatch. Non-atomic progress upsert is disabled pending an authorized atomic server operation. The final client correction has independent approval; auth lifetime prerequisite is uncommitted.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-14 note](mobile-fix-2/after/MOB-14.md).

### MOB-15 — FIXED - VERIFIED (automated)

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Free previews are free and unlocked in search. Downloaded badges/filters require completed status and localUri. Service, row and hook fixtures pass.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

[Owner notes](mobile-fix-2/checkpoints/MOB-15/notes.md).

### MOB-16 — FIXED - DEVICE TEST PENDING

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Complementary clipped semicircles paint continuous ring percentages. Independent emitted-geometry sampling passes 0/1/25/50/51/75/100; native raster/animation acceptance is pending.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

[Owner notes](mobile-fix-2/checkpoints/MOB-16/notes.md).

### MOB-17 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Bounded stable ID cursor scan, exact counts and all-row aggregation replace capped lifetime totals. Lifecycle/error fixtures cover ABA, unmount, refresh and partial scans. New auth epoch helpers belong to uncommitted MOB13 prerequisites; lifecycle/error verification and final review pass.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

[Owner notes](mobile-fix-2/checkpoints/MOB-17/notes.md).

### MOB-18 — FIXED - VERIFIED (automated)

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
already_owned quote renders an Open My Purchases action instead of Retry. Actual quote/action test passes; disabled-sales gates remain first.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-18 note](mobile-fix-2/after/MOB-18.md).

### MOB-19 — FIXED - VERIFIED (automated)

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Connected with unknown reachability stays online; explicit disconnection/unreachability stays offline. Hook state matrix passes.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

### MOB-20 — FIXED - DEVICE TEST PENDING

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Password reset has keyboard-avoiding scrolling with handled taps; rejected support URL opening has a fixed fallback. Native keyboard/large-text acceptance remains pending.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

Detailed root cause, verification and residual limits: [MOB-20 note](mobile-fix-2/after/MOB-20.md).

### CFG-01 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Installed Expo57.0.33, Constants57.0.24, SQLite57.0.5 and Updates57.0.28 through the compatible installer. Online compatibility check passes and Doctor passes21/21. Commit remains blocked because existing package/lock changes are inseparable; a rebuilt Android binary still needs acceptance.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

[Owner notes](mobile-fix-2/checkpoints/CFG-01/notes.md).

### CFG-02 — BLOCKED

Root cause: confirmed by source and the retained reproduction; MOB02/12 are design-only open findings.
Compatible parent patches blob-util0.24.13 and fingerprint0.20.16 remove the glob advisory chain. Three moderate minimatch-chain findings remain in the full online audit. No unsafe major overrides or force fix was used; the offered Expo downgrade is outside SDK57 scope. Existing lockfile work is inseparable, and lint-tooling changes remain outside mobile scope.
Residual risk: the automated evidence covers the stated local behavior; native/provider/deployed acceptance is unverified. Blocked commits retain working-tree fixes pending their original prerequisites.

[Owner notes](mobile-fix-2/checkpoints/CFG-02/notes.md).

## Device test checklist

### MOB-06

- [ ] Install the exact Android build. While signed out, open a valid reset link; complete non-MFA recovery and verify Login appears after cleanup.
- [ ] Repeat warm/cold start and A→B recovery with an enrolled authenticator. Confirm the reset controller survives session import while protected history resets.
- [ ] Leave an expired/reset screen mounted, open a fresh link while an earlier import or password update is slow, and complete only the latest recovery. Confirm no late signout or old form reappears.

### MOB-09

- [ ] Use an Android development build with an injected failure on the outbox INSERT; complete a quiz and inspect SQLite: neither durable row may exist.
- [ ] Repeat without failure: one attempt and one outbox row exist before connectivity drain. Kill/relaunch around commit, reconnect, and verify one authorized server attempt.

### MOB-16

- [ ] On Android render 0,1,25,50,51,75,100 percent rings side by side. Confirm clockwise arc coverage matches the percentage and animation ends at the shown value.
- [ ] Background/resume and change the value mid-animation; inspect final arc and cleanup, including large text.

### MOB-20

- [ ] On a small Android screen, enable large system text, rotate to landscape and open the keyboard on both password fields. Scroll to and activate Update Password.
- [ ] Exercise MFA and cleanup states with the keyboard open. Disable/remove a support-link handler and tap Contact support; verify a fallback appears without an unhandled rejection.

Native acceptance is also required for blocked patches before any eventual release: MOB01 mounted NavigationContainer cold/warm and A→B recovery; MOB03 historical Play receipt in a disabled-sales production build with checkout denied; MOB04 lost callback at30s followed by late success, blur/refocus, process restart and account ABA; MOB05 populated notification swipe archive in development/release; MOB08 actual foreground muted push; MOB10 delete-token/signout-failure and account-switch token registration; MOB11 measure partial-file cleanup and failure retry; MOB13 pause ownership cleanup during account switch and confirm no new download admission. No such device/provider verification was performed.

## Backend dependencies

- MOB02/B03: reviewed authenticated acquisition permit/offline license, owner/content binding, revocation and native encrypted streaming/view integration; legacy cleanup acceptance remains open.
- MOB07: hosted HTTPS reset bridge must target each build scheme and corresponding Auth redirect allowlist. Production bridge must retain production identity.
- MOB08: background category mutes require persisted preferences enforced before OS notification delivery; the client fix covers foreground only.
- MOB14: authorized atomic monotonic max-progress operation with owner/content binding, explicit operation/delete semantics, retry safety and database concurrency tests. The client retains progress rows and performs no non-atomic read/upsert.
- Website generated recovery controller parity: mobile shared controller changed but the generated website copy was not synchronized because website changes are outside scope. Existing parity assertion remains visible; a separate website build/review is needed.

## Verification results and raw output

- [Baseline](mobile-fix-2/baseline.log): TypeScript, mobile ESLint and password recovery passed. Initial86 command sweep:81 passes and5 failures caused by wrong working directory or subprocess restrictions. Corrected original-snapshot reruns are appended; wrapper fixture limitation is retained.
- [Batch4 full sweep](mobile-fix-2/batch-4-tests.log):101 commands,89 pass/12 fail while fixes and fixture corrections were still in progress. This is not the final result.
- [Independent targeted evidence](mobile-fix-2/independent-verification.json), per-finding before/after logs and [initial](mobile-fix-2/reviews/initial.md)/[full code review](mobile-fix-2/reviews/final.md) records preserve successful checks and rejected attempts. Corrected [payment](mobile-fix-2/reviews/correction-04.md), [sync](mobile-fix-2/reviews/correction-14.md), [statistics](mobile-fix-2/reviews/correction-17.md) and [dependency](mobile-fix-2/reviews/dependencies.md) reviews all approve their stated client changes, with the documented remaining limits.
- Final TypeScript: [raw output](mobile-fix-2/final-tsc.log) — PASS, EXIT0. An earlier resource-bound100-second attempt timed out; the final180-second serial run exited0.
- Final mobile ESLint: [raw output](mobile-fix-2/final-eslint.log) — PASS, EXIT0.
- Final full suite: [raw output](mobile-fix-2/final-tests.log), [results](mobile-fix-2/final-test-results.json) —102/103 commands pass. The remaining password-recovery.test.cjs command reports25/26 tests passing; its one failure is the generated website controller parity assertion, left unchanged outside scope. All18 finding regressions plus the two supplemental payment/sync tests pass. The timing-sensitive Android validator passes when run separately before the pool.
- Expo Doctor: [raw output](mobile-fix-2/after/expo-doctor.log) —21/21, EXIT0. [Online Expo compatibility](mobile-fix-2/after/CFG-01.log) —PASS. [Full online npm audit](mobile-fix-2/after/CFG-02.log) —EXIT1, three moderate findings remain.

- Whole working-tree `git diff --check` reports pre-existing trailing whitespace at `mobile-app/src/screens/store/StoreScreen.tsx:133`; that unowned user change was left untouched. This does not change the TypeScript/ESLint results.

## Commit isolation and evidence boundary

[Commit ledger](mobile-fix-2/commits.json) records actual finding commits. [Isolation analysis](mobile-fix-2/commit-isolation.json) identifies overlap with existing work. Separate temporary Git indexes project each finding delta onto HEAD; no git add -A, stash, reset of user work, secret commit or history rewrite was used. HEAD projections and working-tree verification are distinct: uncommitted prerequisites mean the branch alone is not a release candidate.

Original /tmp snapshots were lost at an interruption. Initial01/03/08 source checkpoints were reconstructed from recorded small patches;06 clean-baseline files were recovered from initial HEAD, corroborated by initial-status.txt. Original failing logs were retained. Reconstructed source images are not newly observed before runs. Invalid15 fixture output is separately preserved; corrected before15 uses the durable before source overlay and fails the actual assertions.

## Total counts by status

- FIXED - VERIFIED (automated): 3
- FIXED - DEVICE TEST PENDING: 4
- NOT REPRODUCED: 0
- BLOCKED: 11
- BACKEND DEPENDENCY: 3
- ANALYSIS ONLY: 1

22 findings total. Counts describe the final local report state; open work is explicitly blocked or dependency-bound, not silently marked fixed.
