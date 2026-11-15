# Fix-4 final verification and limits

Final canonical source excludes the blocked wallet candidate. Current logs, rather than earlier passing narrow candidates, determine status. Device/staging/provider/production actions were not performed.

| Check | Result | Evidence |
|---|---|---|
| Mobile tsc / ESLint | Completed fresh reruns EXIT 0 after earlier batch timeouts | final-mobile-tsc.log, final-eslint.log; earlier final-batch-progress.log |
| Admin app/node tsc + tests | EXIT 0 | final-admin-tsc.log, final-admin-node-tsc.log, final-admin-tests.log |
| Mobile existing commands | 103/103 passed; final named-RPC error narrowing additionally passed targeted tests | final-mobile-fresh.log, final-mobile-fresh-results.json, after/MOB-17-rpc.log, after/MOB-17-fallback.log |
| Admin/web finding contracts | 13/13 passed | admin-web-results.json, after/ADM-*-current.log, after/WEB-*-current.log |
| Deno check | EXIT 0 | final-deno-check.log |
| Deno units | 46 passed, 0 failed | final-deno-unit.log |
| Canonical SQL | See final-sql.log for complete ALL SUITES PASSED / EXIT 0; new FK removal regression separately included in final per-ID run | final-sql.log, final-sql-findings-results.json, after/ADM-03.log |
| New SQL finding before/after | MOB-17, ADM-03, ADM-08, BACK-08 fail before and pass after; BACK-11/13 remain red without candidate | final-sql-findings-results.json, before/ and after/ corresponding ID logs |
| MOB-02 unchanged prior red test | Passed; file was not weakened | after/MOB-02.log |
| MOB-02 added behavior | Paid admission/resume denial, free transfer, repeat cleanup, deletion retry, cross-note path protection, traversal, account-switch fencing passed | after/MOB-02-behavior.log; full mobile suite includes free-preview native-transfer mock lifecycle tests |
| Server new-sales gate | Default/missing/invalid/error denies; explicit enable only; source gate before order work | after/server-kill-switch.log, after/server-kill-switch-source.log; before/server-kill-switch.log reconstructed from initial safety patch |
| Admin request/aggregate clients | requestId retained, unknown outcome/feed reconciliation, single course RPC passed | after/admin-rpcs.log |
| Concurrency | Synthetic independent SQL duplicate requests and concurrent-insert snapshot passed; wallet result does not accept abandoned design | after/concurrency.log |
| Recovery | 26/26 plus 24 policy checks passed | final-password-recovery.log |
| Expo Doctor | 21/21 passed EXIT 0 | final-expo-doctor.log |
| npm audits | Mobile 3 moderate, tooling 9 moderate, admin 0; no high/critical in fetched graphs | final-mobile-app-npm-audit.log, final-tooling-npm-audit.log, final-admin-panel-npm-audit.log |
| Dependency metadata | Compatible parent queries resolve to installed releases; no dependencies or overrides changed | dependency-parent-*.log, dependency-*-tree.log, CFG-02.md |
| Android JS export | One completed export EXIT 0; /tmp maps disappeared on interruption. Immediate-map-check rerun timed out; package exclusion NOT VERIFIED | final-bundle-export.log, final-bundle-and-dependency-check.log, bundle-dependency-check.json |
| Build config | Public config completed with dotenv disabled EXIT 0; raw /tmp artifact not staged | final-build-config.log |
| Website links | 17 pages, no problems | final-website-links.log |
| Protected flags | Provider/build diffs match pre-work copy | protected-flags.json |

Baseline environment failures and limits remain in baseline.log: default PostgreSQL was unavailable, restricted DNS prevented first audits/Doctor; approved local/network reruns were used. First supplemental SQL baseline overlapped source edits and is not pristine. Repeated interruptions removed /tmp state and terminated some runners; logs without completion are never called passing. The final local runner recreates a socket-only disposable cluster and stops it after checks.

Wallet cap: original failures in after/full-sql-attempt1.log, after/full-sql-attempt2.log and after/full-sql-final.log. Candidate moved outside canonical migrations and never deployed. Earlier narrow passing wallet logs are abandoned-attempt evidence, not final acceptance. Current canonical probes remain red. See wallet-blocked.md.

No independent executable agent verification was possible: dispatched sessions exposed no tools. A summary-only adversarial review identified cross-note deletion risk; note-bound path checks and a rejection test were added. No session-envelope implementation was attempted without an installed native AEAD primitive.

Automatic approval review rejected the combined wallet-source/PDF-assertion edit; the narrower source-only attempt was approved and subsequently failed wallet verification, so it was quarantined. The PDF assertion stayed unchanged; its free-preview grace expectation now matches accurate UI wording, while paid notes explicitly remain online-only. Later automatic review deadlines were retried only once; environment failures and final outcomes are preserved.

Final cleanup association regression: before/MOB-02-path-association.log fails on a row-bound free-1.pdf being interpreted as a distinct paid-note ID. after/MOB-02-path-association.log passes after making durable row/resume associations outrank orphan filename guesses. Current metadata confirmation protects legacy preview flags; cross-note pointers remain rejected. These guards preserve unknown/free content rather than making unsafe cleanup guesses.

Final completion: final-mobile-fresh-progress.log reports TOTAL 103 PASS 103 FAIL 0 after the last association guard. Compiler/lint logs end EXIT 0. The last canonical SQL log ends ALL SUITES PASSED / EXIT 0, with the notification admin-removal regression green. Isolated BACK-13 before/after logs both explicitly fail “held credit expired before first availability”; no unrelated wallet assertion masks that finding. git diff --check reports only the pre-existing StoreScreen.tsx:133 whitespace, preserved. Report validation confirms 53 unique IDs and all linked/staging paths.
