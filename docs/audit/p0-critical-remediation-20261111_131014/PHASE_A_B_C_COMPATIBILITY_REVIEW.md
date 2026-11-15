# A/B/C compatibility review and P0 forward dependency

Date: 2026-11-11 UTC. P0 only. Local synthetic PostgreSQL/provider evidence; no production/staging connection, deployment, financial transaction, credential change, worker/schedule activation, Android build upload or payment activation. Existing approved artifacts and financial history were preserved. **Local verification is not production protection or acceptance.**


The exact original A wrapper and separately corrected C candidate passed a fresh reconstructed 66-source baseline rehearsal. All 126 pinned function preimages matched; 43 recorded rehearsal groups passed. `evidence/atomic.log` and `atomic/rehearsal-results.json` include results, exact 73-source ledger validation, final ACLs and trigger order. Retained production-normalization fixtures reproduce known preimages; they are not fresh production drift evidence.

| Stage | Contract and fresh result |
|---|---|
| A1 | Strong exact Razorpay proof, service-only; historical fingerprint preserved |
| A2 | Terminal/captured order transition guard; late failure races rejected |
| A3 | Keyed success ownership lock/trigger; grandfathered history readable; conflicting future grants refused |
| B1/B2/B3 | Original pinned verify-payment/webhook/create-order run on A and final C for legacy website purchases; real HMAC/auth/SQL/conditional-write regressions pass |
| C1 | Notes-choice owner/product/token reservation and immutable scope contracts; no authorization-time grant |
| C2 | Recovery, authorization/reporting/refund/compensation queues, durable inbox and time facts; must remain atomic with final proof |
| C3 | Strong exact MV003 proof restored; newly discovered nonblocking-pending recovery defect requires D |
| C4 | Play entitlement snapshot/proof and duplicate/replay protections; no weakening of Play choice/consumption requirements |
| D (new) | Additive final proof classification correction, separately reviewed; all exact MV003 predicates retained; 73→74 |

Original C SHA identity remains unchanged. It incorrectly compares untrimmed function definitions against trimmed collector hashes, then uses invalid `FOREACH t IN ARRAY[...]`. Fresh tests reproduce both, including hash-only correction before the syntax failure. Corrected derivative SHA-256 is **93dc2a645aa3ec0b266c8fc9356243fa83026b007b73399e90ae0948d4a23b72**. Validation asserts only 126 trim expressions and two ARRAY keywords change. C1–C4 ledger sources remain exact originals. No previously approved artifact was edited.

Forced failure after each C stage, A-ledger/function drift, partial-C schema and duplicate-token index failure all roll back. Paused C2 remains uncommitted: an observer sees strong A and 69 ledger versions, readers are blocked with bounded timeout, a competing wrapper hits the 2s lock timeout. Killing the local client restores pre-state; verified precommit rollback can retry; known successful commit refuses retry. Hosted network loss exactly at COMMIT and real workload capacity are not simulated acceptance.

Original B lacks new authorization/reporting/refund fact writes. The pinned compatible post-C closures are therefore necessary for choice traffic; unchanged function signatures alone do not establish semantic compatibility. New five-archive P0 package includes complete compatible helper dependencies and strict result classification. Website create-order retains its reviewed B entrypoint; Android headers/future choice bypasses are refused. Headers are routing, not device attestation.

Gateway settings are pinned per archive: verify-payment=false and webhook=false with HMAC/Auth in handlers; website create-order=true; reporting-worker=false with independent cron secret; notification=false with Auth/admin/MFA checks. All 22 extracted original/new archives pass Deno checks, exact source/archive hashes, configs and lock equality (`archive-validation.json`). Literal financial RPC roots and local imports exist on D-final schema (`release-dependency-checks.json`). External npm imports remain frozen by the included lock.

Final original C proof MD5 is `49b01fbcc7a5e71bd527366fd342a6e9`; final D proof MD5 is `c213bcd1e3f131e1f730c96789e97296`. Both retain identical signatures. Exact new source/SQL/archive SHA-256 hashes are in the new manifest and checksums. A/B/C ledger sequence remains **66→69→73**; new D is a separately disclosed **73→74** forward step. There are now 75 local migration files including the excluded isolated test installer; final intended production count is 74. Never silently mark a version applied, repair the ledger or use a broad timestamp push.

Historical public rows/Notes access, wallet/referral behavior, RLS/service ACLs and trigger order remain compatible in tested synthetic states. Dedicated C Play/choice/Notes function archives remain separately pinned dependencies with default-deny gates. No worker/schedule was run against a service. Independent source approval, full recovery, current production drift and quiescence remain required.

The final D wrapper additionally checks the predecessor proof owner/definer/volatility/search path and exact source arrays for all seven A/C versions. Synthetic owner/security and ledger-source drift each refuse before mutation; final `forward-ledger.log` records the successful guarded rerun.
