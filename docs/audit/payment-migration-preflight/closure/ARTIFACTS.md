# Frozen staged package review

Status: approval candidate, NO-GO for production. All checks below are fresh offline/synthetic evidence; no deployment is authorized. The original ten-file review is unchanged.

## Exact SQL delivery units

Paths below are relative to `supabase/releases/p0-critical-20261111_131014/sql/`.

| Unit | SHA-256 | Expected ledger |
|---|---|---|
| `01-phase-a.sql` | `1473150ed92b6ee08b18e66be2042e99d19e0e66e8ef957f61f4f78fa20bcb05` | 66→69 |
| `03-phase-c-atomic-compatible.sql` | `93dc2a645aa3ec0b266c8fc9356243fa83026b007b73399e90ae0948d4a23b72` | 69→73 |
| `05-p0-forward-proof.sql` | `2c351d660a1b85e4fccfc70573f6ccba4db282e0fdb3d2d51895fc1997163661` | 73→74 |

`evidence/verify-staged.py` lexes SQL while treating comments and quoted/dollar-quoted source records as non-executable text. Each wrapper has one executable BEGIN ISOLATION LEVEL READ COMMITTED and one COMMIT. All eight selected sources' executable statement sets occur in order, removing only outer source transactions/comments/formatting. C1/C2/C3/C4 remain in one transaction; ledger source literals are not mistaken for nested execution. Exact source-copy hashes also match the completed review/current migrations. Repeated A1/C3 function text is intentional.

A locks the ledger then orders/purchases; C locks the ledger then orders/purchases/provider_events; D serializes the ledger. A/C ACCESS EXCLUSIVE locks block readers too. All use 2s lock, 15s statement and 15s idle-transaction limits; these are not total maintenance budgets. External monitoring must bound the full window. Quiescence includes every privileged writer, webhook, callback, wallet-credit release and recovery/report/consume/void/compensation workflow.

C checks the exact 69-version set, absent C objects/columns, pgcrypto/token-index and baseline Play trigger, A proof, 126 pinned function definition/owner/ACL preimages, A source records, financial/catalog fingerprints, nine final function contracts, index/RLS/trigger and exact A/C source records before commit. C ends with conservative strong C3; D later changes classified reversal treatment. C does not leave the weak C2 proof committed. D requires exact 73 and seven source arrays, proof security preimage, then final D proof/security and source insertion before commit. Final D body MD5 is `c213bcd1e3f131e1f730c96789e97296`; A/C3 body MD5 is `49b01fbcc7a5e71bd527366fd342a6e9`.

These guards do not verify organizational approval, every original baseline source, all security objects, capacity or hosted runtime. Nonempty approval GUCs are references only. C's token-index postcheck proves unique/valid/ready, but external drift review must check exact expression/predicate; the security checks do not exclude every unexpected inherited role. A checks absence/version set but is not a full baseline body/security drift audit. No wrapper substitutes for private full drift comparison.

## Runtime barriers and archive identity

- At B on ledger 69 use only original Phase B B1/B2/B3 candidates after separate approval and hosted verification. `b-to-c-compatible` explicitly requires final A+C and cannot serve as the pre-C barrier.
- Keep affected ingress/workers held through C and D and the approved final handler delivery. After D select P0's five corrected closures for overlapping verifier/webhook/reporting/create-order/notification routes; do not silently substitute older Phase C or b-to-c copies of overlapping handlers.
- Dedicated Play/choice/attachment/catalog/Notes functions require separately approved Phase C archives and hosted dependencies. Do not enable routes, schedules or purchases as a deployment postcheck. Original B3 remains the separately pinned website candidate where specified; the P0 final create-order archive is its reviewed final candidate, distinct from current workspace edits.
- Settlement keeps `void`; callers require durable entitlement proof, and capture without ownership remains pending. Old 23514 transition/ownership errors must fail safely. Unknown/open reversals fail closed; only trusted independently sourced classification can set `blocks_entitlement=false`. Test-lane callbacks are excluded. Actual hosted source/config/cache/provider behavior remains unverified.

Four full checksum inventories, manifest hashes, safe exact tar member sets (no links/path traversal/duplicates), transitive import graphs, per-function JWT configuration, dependency locks and archive hashes pass. `staged-artifacts.json` is the machine-readable inventory. Source archives are not hosted ESZIP receipts. Hash-valid original/older candidates remain subject to the sequence above.

| Package | Manifest SHA-256 | Archives checked |
|---|---|---:|
| `phase-b-20261111` | `b2a84bad8fb0bfc919520569782c5344c5b3cf357c6b60b7fe561fa6754b7e2e` | 3 |
| `phase-c-20261111` | `4249bab9ae79887fd1569a0a7e25ce4b3f6dd28fb3d1d9c2c25bf3b22fd1d9ae` | 10 |
| `b-to-c-compatible-20261111` | `7ed2e7660a30718510b7b351c1e85fd583bb9aff37c44928dd17021bfca9481a` | 4 |
| `p0-critical-20261111_131014` | `b15f9e9efccf916d4c1981f7e99e823222e6deb77da63ae5a84165e5f0f39a3d` | 5 |

The independent P0 integrity pass found current workspace differences only in `functions/create-order/index.ts` and `functions/send-push-notification/index.ts` among its five closures. Frozen copies remain intact. Do not deploy from the working directory or regenerate manifests to bless these changes; review any new candidate separately. This audit does not alter frozen artifacts or source code.

## Independent units excluded

Seven-index source `20261111175746_all_row_foreign_key_indexes.sql`, SHA-256 `aad108622bb5af6579ced72b76e1a4d590977384c56a54e5ceb077467cedd17d`, remains outside A/B/C/D. It needs separate availability/capacity approval, representative timing, equivalent-index review and seven exact valid definitions. Its 2s/60s per-statement limits do not bound the total transaction; no CONCURRENTLY substitution is approved. Deploying it before frozen phases changes their exact ledger preconditions and requires a new reviewed package. Proposed later 74→75 only under separate approval.

Optional lane `20261109120000_isolated_nonplay_test.sql`, SHA-256 `4dad6d8b92ee247bc2d399448e757dde1d3e898abf7ece2e8a4d19fbb2db1584`, remains pending and excluded. Separate dormant installation review must prove namespace/catalog/owner/ACL/Storage policy contracts and both DB/Edge gates OFF. No test credentials, seeding, account creation or activation is authorized. Proposed later 75→76 only under separate approval. An older pending version is not permission for repair/include-all. Future full ownership-index replacement is also excluded.
