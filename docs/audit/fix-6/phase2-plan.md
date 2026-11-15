# Fix 6 approved Phase 2 implementation plan

Spec: owner's A1–A5 approval message and phase1-findings.md. Execute inline; preserve existing dirty files. No commit, native build, hosted action, migration execution or financial policy change is part of this plan. The owner-approved specification settles implementation scope; no further design gate is inferred.

- [x] Snapshot source, protected dependency metadata, manifests and migrations; record baseline full lint.
- [ ] Add failing composer→actual sender→actual foreground tests, payload conflict/unknown-category/replay/broadcast guard checks and screen wording assertion. Overwrite `data.type` with validated type, bind the request's original payload identity to preserve old replay keys, and check the final pushed data size. Run existing notification suites unchanged.
- [ ] Add failing isolated-order gate tests using fake DB/provider: false/missing/error/exception deny before body, eligibility RPC, order/provider calls; auth/method boundaries retained. Add shared gate before eligibility. Update only the local DB test adapter to supply an explicitly synthetic enabled setting for existing creation tests, without changing tests/assertions or persisted flags.
- [x] Add scheduling scanner test before script, then implement read-only filename/line-number scanner. No SQL execution.
- [ ] Apply only approved tooling ESLint 10.15.0 installation; compare full lint and effective rule config before/after, run tooling-dependent tests and all requested source checks. On breakage restore only tooling manifests from exact copied pre-Phase-2 contents, report the failure without weakening tests/rules.
- [ ] Run fresh three audits/trees; copy mobile to new /tmp directory excluding all .env* and .git, isolate installed dependencies, run prescribed offline Android export/map inspection and retain raw exits/hashes/maps.
- [ ] Owner authorized Fix 5 only in synthetic local full-suite execution. Attempts reached batch-refund integration but were interrupted before final exit; full completion remains blocked. Optional/quarantined SQL remains prohibited. No failed/missing/incomplete verification is a pass.
- [x] Write deferred encryption/server-preference decisions, unsigned risk acceptance and final report with exact v1 manifest, excluded wallet/retention migrations, unperformed device/external gates, safe explicit staging suggestions and evidence.

Handoff: approved source regressions passed; tooling update/lint and requested compiler/Deno/admin/recovery/link results retained. Full SQL and Android export completion remain blocked/inconclusive after interruptions; two unrelated stale analytics fixtures remain red. No release readiness or whole-suite pass is claimed. See MEDVEDA_FIX_6_2026-11-14.md for the complete register.
- [ ] Verify protected hashes/dependency metadata, review only this phase's delta, and record actual results. Stop without commits/push/deploy.

Review focus: old requestId replay identity; final data size after canonical category; false sales before rate-limit eligibility writes; unchanged historical tests with a new setting dependency; export source-map completeness and no dependency writes outside tooling.
