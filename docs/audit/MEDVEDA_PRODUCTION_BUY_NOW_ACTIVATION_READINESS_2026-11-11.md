# MedVeda production Buy Now activation readiness — 2026-11-11

**Final decision: NO-GO. Production Buy Now must remain disabled. No activation, deployment, financial operation, genuine payment, worker invocation, AAB build or publication was performed.** Local preparation and regressions pass; mandatory production prerequisites do not.

Scope: `/home/ganeshp8545/AyurPulse`; Android `in.medveda.app`; production Supabase **`xbvenkfmesugrbjuufyw`** only. All times UTC. This prompt authorizes preparation, not financial activation. No staging service, website or admin implementation was modified or executed.

## Evidence boundaries and preservation

Reviewed the existing production audit, MV001 and MV003–MV012 fixes, Phase A final review/operator runbook, Phase B compatibility, Phase C readiness, deployment preflight, Android native readiness and subsequent blocker fix. [Prior report inventory](evidence/buy-now-activation-20261111/prior-report-inventory.json) records 36 existing top-level reports and their hashes/sections. MV002 has no separate fix report: the catalog/pricing decision is outstanding, and ₹1/₹2/₹5 are preserved. The later Android blocker-fix report supersedes the earlier fixture/validator failures; those defects are already fixed and were not reopened.

Git status and a 2,239-file source/evidence hash baseline were captured before edits. Existing tracked/untracked work was preserved. Only the three pre-existing files listed below changed. Dependency/Git/generated native/build/cache trees were excluded from source fingerprinting and were not regenerated. [Preservation](evidence/buy-now-activation-20261111/preservation.json) and [exact artifact inventory](evidence/buy-now-activation-20261111/artifact-manifest.json) distinguish this task from the substantial earlier dirty worktree.

Fresh production observations: schema/function/bundle inspection began **08:36:14 UTC**; operational/backup inspection **08:36:22 UTC**. Management API metadata/bundle/backup GETs and bounded database SELECTs only; database requests used `read_only:true`, explicit READ ONLY transactions, 15-second statement timeout and ROLLBACK. Observed role `supabase_read_only_user`, read-only `on`, PostgreSQL 17.6, READ COMMITTED. Credentials were read privately by the existing collectors and never printed or retained. No payment/recovery/signer/Auth/worker execution endpoint was probed. Sandbox DNS restrictions required approved read-only network escalation; no automatic approval rejection remains.

Evidence distinguishes **fresh production metadata**, **fresh synthetic local tests**, **inherited actual local SQL tests**, and **unverified owner/provider/device acceptance**. A deployed ACTIVE function is not proof of a safe payment implementation or active Buy Now on an installed app.

## Complete activation matrix

| Mandatory gate | Verified evidence | Status / exact missing dependency |
| --- | --- | --- |
| 1. Required SQL delivered | Fresh 66-version ledger still ends `20261104110000`; A1–A3 functions/triggers absent | **BLOCKED** — exact reviewed deployment, recovery evidence and separate authorization absent; Phase C SQL also absent |
| 2. Compatible Edge delivered | `verify-payment` v68 JWT=false; webhook v50 JWT=false; `create-order` v23 JWT=true; unchanged bundle hashes | **BLOCKED** — B1/B2/B3 local only; deployed callbacks lack commitment proof; dedicated choice/reporting endpoints absent |
| 3. Current recovery/fail-safe | Fresh backup response: `pitr_enabled=false`, `backups=[]`, `physical_backup_data={}` | **BLOCKED** — no demonstrated current recovery point/full compatible restore, RPO/RTO, approved operator/window; external owner backups remain unknown |
| 4. Play program/product mapping | Retained native choice implementation and strict SKU/offer checks pass locally | **BLOCKED** — actual terms/onboarding, package/India participation, genuine active SKU/BUY option/INR readback and account permissions unverified |
| 5. Reporting/worker operations | Synthetic report/refund/lease/backoff/idempotency checks pass; relevant Play schedules remain inactive | **BLOCKED** — Google acceptance, credentials/permissions, cadence/capacity, deadlines, alert delivery and separately authorized worker operations unverified |
| 6. Genuine provider integration | Actual cryptography with synthetic provider transport; no provider API contacted | **BLOCKED** — genuine Play receipt/choice token, Razorpay checkout/capture, webhook delivery and Google report/refund acceptance absent |
| 7. Financial history disposition | Fresh two successful purchases on non-paid orders and one duplicate successful ownership group | **BLOCKED** — exact provider evidence and signed per-case resolution or formal evidence-based disposition absent |
| 8. Native Android build | Retained Expo/IAP/WebView inputs; fixed validator; local checks pass | **BLOCKED** — current-source AAB compilation, resolved Billing graph, merged manifest, signing/version/native inspection unverified; genuine Firebase/FCM missing in retained evidence |
| 9. Real device acceptance | No physical device or native provider execution performed | **BLOCKED** — native choice, UPI/WebView, secure PDF, crash/restart/reinstall and account-switch acceptance outstanding |
| 10. Existing paid Notes preserved | Fresh readers/get-note-url bundle unchanged; synthetic ownership/PDF/history regressions pass | **LOCAL/METADATA PASS** — live authenticated Notes/PDF and device acceptance unverified; preserve historical legitimate access |
| 11. Relevant regressions | Fresh **88/88 PASS**; release hashes and production baseline match; inherited real SQL results below | **LOCAL PASS** — hosted/native/provider regressions still required |
| 12. Exact owner activation approval | Explicitly withheld in this request | **BLOCKED** — no approval for a concrete activation artifact/action/window |

All twelve are required. No recommendation to activate is made.

## Phase A database delivery

The exact reviewed sources and preflight review copies remain byte-identical:

| Order / migration under `supabase/migrations/` | SHA-256 |
| --- | --- |
| A1 `20261110100000_mv003_razorpay_entitlement_commitment.sql` | `82ae7f73d32c44b0fa627b3d1f33777ce7a2d41f0aef6c25826704ac8898dc0b` |
| A2 `20261110120000_mv005_razorpay_order_transitions.sql` | `f266859f080e200cffad9ae17b833faa4ac9302d78ed4d641c6c750564984730` |
| A3 `20261110130000_mv006_purchase_ownership_guard.sql` | `6c6e8704a424e1c0689dcbd3bd8c6ac5bf92ea48e76b2ff0c7cbdd6721609e4c` |

[Release integrity](evidence/buy-now-activation-20261111/release-integrity.json) and [fresh baseline diff](evidence/buy-now-activation-20261111/baseline-diff.json): every pinned schema section equals Phase A's 04:08 snapshot, including all 126 public routine definition hashes/ACLs/owners/config, ledger, financial columns, constraints/indexes, RLS/policies/grants, triggers, prices/history/cron. All 17 function metadata entries and seven previously pinned bundles match. Phase B's 34 pre-existing reachable routines still match its 37-routine dependency closure; the remaining three are A1–A3. This is compatibility verification, not deployment approval; refresh immediately before any future action.

A1 adds a service-only exact commitment predicate; A2 prevents terminal/captured Razorpay status regression; A3 prevents new duplicate keyed ownership/restoration using the existing wallet advisory lock and fresh READ COMMITTED check. A1 does not require later choice/recovery columns. A3 fails closed for keyed grants at stronger snapshot isolation; legacy NULL-key semantics and existing successes are preserved. No historical DML or replacement of Notes readers is included. Existing constraints/trigger ordering and trusted owner/search_path/ACL contracts must be checked after any drift.

Delivery remains **BLOCKED**. The [Phase A operator runbook](MEDVEDA_PHASE_A_OPERATOR_RUNBOOK_2026-11-11.md) and its proposed atomic wrapper remain unchanged; wrapper SHA-256 `1473150ed92b6ee08b18e66be2042e99d19e0e66e8ef957f61f4f78fa20bcb05`. No migration was executed or pre-marked. The old partial application-only restore did not restore complete managed Auth and cannot establish current recovery. Supply current backup identity/time/retention and a demonstrated compatible full application/Auth/Storage-metadata restore, separate object-byte/config/secret recovery references, RPO/RTO and post-recovery provider reconciliation policy. Any creation/restore requires its own approval.

Before commit, abort on drift, approval absence or lock timeout. After delivery, keep additive guards and disabled gates; prefer a separately reviewed forward correction. No automatic financial restore, trigger bypass, inverse migration or unsafe old verifier rollback is approved. Preserve raw bundle/config preimages privately and review any rollback against current contracts.

## Phase B isolated Edge package

All **16 checksum entries PASS**, all three source/import closures and archive digests match. Complete source packages under `supabase/releases/phase-b-20261111/` target production baseline **plus exactly A1 → A2 → A3**:

| Candidate | Gateway JWT | Source archive SHA-256 |
| --- | --- | --- |
| B1 `verify-payment` | false; unsigned recovery authenticates inside handler | `e1d0ede56f0eeb873492b639a86ca8b81e723cd08c5c3f81bba7c34a357f5ab1` |
| B2 `razorpay-webhook` | false; raw-body HMAC required | `c7e04f3fad722e73e030d453112ff429a8f8280f987a9e726d3acd0b75000d4a` |
| B3 `create-order` | true plus handler authentication | `72e5c74183d814a3a54cc4819647951f429e935925d3c612b1b976d4a086a9ef` |

Use the complete frozen function-specific archives/configuration/imports, never broad workspace `_shared` deployment. SDK dependency remains pinned to Supabase JS 2.118.0. B3 retains the website API contract and rejects Android direct checkout; its future isolated delivery requires independent approval without modifying website/admin source. It is not a route for bypassing Play.

The candidate retains Razorpay callback HMAC, raw webhook HMAC/previous-secret retry support, captured-provider GET verification, exact INR/paise/order/payment/owner/product binding, durable inbox/capture idempotency and commitment proof after atomic settlement. Unsigned recovery requires a valid authenticated owner and conceals foreign/nonexistent orders behind the same response. Void settlement, compensation or capture alone never implies entitlement. Missing proof/errors remain pending/retryable; duplicate callbacks do not grant twice. Refund/dispute transitions use existing reversible accounting and access rules.

Fresh bundles still lack the reviewed commitment call; delivery is **BLOCKED**, not silently treated as fixed by local source. Provider secrets/mode/webhook configuration and hosted SDK/Auth acceptance were not tested. Existing success-based Notes readers/get-note-url v20 JWT=true remain unchanged.

## Phase C compliance and dependency requirements

Official documentation was refreshed on November 11. India's alternative billing program requires Play alongside the alternative provider, completed onboarding/terms, per-app participation, trust/safety arrangements and reporting authorized transactions within 24 hours. These public rules do not establish MedVeda enrollment. Owner must privately supply enrollment completion, accepted terms, payments profile, `in.medveda.app` India opt-in and approved payment branding/support evidence. [Official India requirements](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en).

The implemented route uses `enableUserChoiceBilling`, a native choice listener, genuine ProductDetails/offer token and Play-rendered choice. Only a genuine alternative-selection callback supplies the external transaction token before dedicated Razorpay checkout. Eligibility follows Play country; a custom Razorpay-only selector cannot substitute. Console/package/API execution remains unverified. [Native choice integration](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app).

Billing Library 7's extension ended November 1, 2026; this November 11 release requires supported 8+. Retained declared chain is `expo-iap 3.4.4 → openiap-google 1.3.26 → billing-ktx 8.3.0`. This does not prove the resolved minified release graph or reflective choice API behavior. [Current support timeline](https://developer.android.com/google/play/billing/deprecation-faq).

Initial external reports require the issued token, unique stable external ID, correct transaction time/amount/tax and applicable Indian tax address. API acceptance and token validity cannot be inferred from local format/uniqueness checks. Reports must include authorized transactions even before capture; worker outages do not extend the India deadline. [Google backend guidance](https://developer.android.com/google/play/billing/outside-gpb-backend).

Owner must verify Developer API setup, package access and billing-related financial permissions; private keys stay server-side. Confirm actual report/refund authorization using the appropriate OAuth scope and genuine acceptance. [API setup](https://developer.android.com/google/play/billing/getting-ready), [external refund API](https://developers.google.com/android-publisher/api-ref/rest/v3/externaltransactions/refundexternaltransaction).

| Requirement | Local preparation / remaining evidence |
| --- | --- |
| Genuine SKU and offer | Server pins Notes product/course/scope and standard IN/INR BUY option; quote/offer amount comparison passes synthetic tests. Console active status, every ₹1/₹2/₹5 product/offer availability and exact mapping require real readback; do not raise prices to clear a mapping failure. |
| Choice/token binding | Owner/product/reservation/expiry, digest uniqueness, one reserved provider order and account-switch protection pass locally. Flags/headers are not enrollment evidence or device attestation. |
| Play settlement | Provider receipt identity/state/account/order/SKU/amount checks precede exact committed snapshot and consumption. Pending/cancelled is not a grant. Genuine Developer API receipt/consumption/void acceptance missing. |
| External reports | Stable IDs, GET-before-CREATE reconciliation, retry/readback and output-only test-marker validation prepared. Genuine token/report/tax/time acceptance missing. |
| Refund/reversal | Full/partial refund identities, remaining pre-tax balance and lost-dispute reporting prepared; original-report dependency retained. No genuine refund issued or reported. Confirm applicable terms and operational deadlines for reversal reporting with owner; no undocumented universal refund deadline is invented. |
| Operations | Durable lease/backoff/parking and queue prioritization prepared; no worker ran. Accept scheduler heartbeat, capacity under retries, lease overlap, backlog/deadline/parked/void-cursor alerts, independent alert delivery and incident operator before approving schedules. |

Authorization reporting currently uses provider payment `created_at` as a conservative stable anchor, not a separately proven authorization instant; dispute reversal uses first local observation. Genuine timestamp acceptance is outstanding. Monitoring remains best effort in code, not proof of an operational alert channel. An internal target shorter than 24 hours with escalation before breach must be owner-approved; retries/parking cannot excuse missed deadlines. India manual-reporting sunset is listed TBA in the [current onboarding guidance](https://support.google.com/googleplay/android-developer/answer/13821247?hl=en-GB); this candidate uses automated APIs and does not substitute a manual exception for missing integration.

Phase C is a separate **50-checksum-entry PASS** package. Its 66 baseline source copies and seven candidate SQL hashes match; its packaged server sources equal current sources. Required SQL order is **A1 → A2 → A3 → `20261108100000_notes_choice_checkout.sql` → `20261109100000_billing_settlement_recovery.sql` → `20261111100000_phase_c_final_mv003_commitment.sql` → `20261111110000_phase_c_play_entitlement_snapshot.sql`**. Recovery weakens/replaces the earlier proof unless the final MV003 override follows; Play needs the immutable entitlement snapshot/proof migration. C1 is not assumed replayable. These four C migrations are **unreviewed for production execution** by this task and must receive independent safety/ledger/locking review and approval. Never run them by timestamp sweep or blanket `db push`.

Phase B is not sufficient for billing choice/reporting. Later Phase C verifier/webhook replacements need their own exact dependency/config approval after the complete C SQL baseline; B3 remains its separately reviewed artifact. Exclude isolated non-Play test migration/endpoints and the future MV006 full ownership index. Existing alpha profile points elsewhere and was neither used nor repurposed. No approved production purchase-enabled build profile exists today.

## Android UI and secure entitlement review

| Surface | Verified local behavior / limitation |
| --- | --- |
| Buy Now / Store cards | Disabled provider blocks sales; product titles/scopes and prices retained; owned products remain readable. Touch targets/action labels/loading and Store retry/ownership regressions pass. |
| UnlockOptionsPanel / Chapter Details | Scoped purchase options, stale-context rejection and retry states pass; Notes ownership gates do not gate educational videos. |
| Order Summary | Fresh server quote, wallet arithmetic, price reconfirmation, synchronous in-flight guard, native Play choice and saved alternative retry remain. No client-submitted amount is authoritative. |
| PaymentCheckoutScreen | Navigator/screen/service gates, expected verify host, bridge nonce, provider identifiers, duplicate callback guard and server verdict/recovery retained. WebView/UPI/native execution unverified. |
| PaymentFailedScreen | Pending polling, terminal response and auth/account handling retained; copy now requires confirmed purchase and Notes access rather than capture alone. |
| PaymentSuccessScreen | Existing paid-order/successful-purchase/account/amount readback retained. New auth-generation checks invalidate stale results and clear private details on account change, including A→B→A; 15-second UI deadline prevents endless spinner and late success. Route fields never grant entitlement. |
| NotesScreen / PDF | Ownership refresh on focus and authoritative protected URL request retained; route `unlocked` is not access authority. Short-lived signing/publication/MFA/storage checks stay server-side; actual signed PDF was not requested. |
| MyPurchasesScreen | Account-bound history/restoration, recent Razorpay interrupted-attempt recovery and retained Play receipt support preserved; existing successful purchases are not discarded when sales are off. Restart/reinstall device acceptance remains missing. |
| Provider/navigation | Production/internal/shrink gates remain disabled; summary/checkout routes unregistered when disabled. Recovery/status routes are separate. No provider, enrollment, acceptance, runtime or backend gate changed. |

The success-screen fix is display safety, not a replacement for server commitment proof or Notes authorization. The readback does not itself reverify provider truth. Source tests cannot prove installed UI/native behavior. Existing local download isolation is preserved; prior offline paid-PDF encryption/release concerns remain open where recorded in the wider release gates.

Fresh production totals remain **27 orders / 15 payments / 15 purchases**, 13 paid orders and 15 successful purchases. Exact commitment requires successful matching payment and purchase, paid order, owner/product/provider identities, INR/paise amount and complete chapter/subject/year/bundle/course snapshot; compensations and unresolved reversal facts deny proof. Captures without that relationship never unlock paid Notes. Existing readers intentionally preserve legitimate historical Notes access, including the historical exceptions; this prevention release does not redefine them.

## Historical financial review — separate approval per case

Fresh aggregates confirm two successful-purchase/non-paid-order inconsistencies and one duplicate successful user/product group. The earlier MV005 review identifies the two inconsistent orders as failed; full current provider truth/transition provenance remains unknown. No rows were repaired, deleted, demoted, refunded or replayed. No historical IDs are included in new evidence.

For each of the two inconsistent cases, owner/financial operator must privately retain: exact internal order/payment/purchase links and snapshot/amount/tax/wallet/discount evidence; provider order receipt, linked payment, INR amount, authorized/captured/settled timestamps/state; complete refund/dispute/chargeback evidence; authenticated webhook delivery/event hashes; and any available audit/deployment chronology explaining the failed status. A current captured status alone cannot justify a historical update or establish the actor.

For the duplicate group, additionally establish both distinct provider order/payment references, both captured financial outcomes, net retained/refunded totals and independent entitlement scopes. Decide whether to retain both with formal disposition or approve a specific corrective/refund/accounting plan. Do not infer one purchase is illegitimate merely from duplicate ownership. Preserve existing paid Notes until a separately approved evidence-based action requires otherwise.

Approval must identify exact records privately, provider-evidence hashes, intended before/after state or explicit no-change disposition, financial/access effects, recovery plan and independent reviewer. Any refund, repair, demotion, ledger adjustment or future uniqueness-index change requires its own approval; none is included here.

## Native release readiness

Local `google-services.json` and shell file input remain absent; configured SDK root and platform/build-tools directories remain absent. [Fresh local status](evidence/buy-now-activation-20261111/native-local-status.json). Prior Android blocker-fix EAS read-only evidence reports no production Firebase file variable/FCM v1 credential, genuine remote upload-signing metadata present, previous remote versionCode 13 and no complete current-source native build. **EAS/Play Console metadata were not refreshed in this task.** Firebase project identity is owner-unverified; do not fabricate config or rotate keys. Missing FCM is not proven to cause compilation failure, but blocks complete production push acceptance.

Retain package `in.medveda.app`, production channel, version 1.2.2 and disabled runtime `1.2.2-disabled-notes-choice-v1`. Remote auto-increment does not prove the next available Play code; refresh remote/highest-used code before a separately authorized build. Existing v13 AAB predates these changes. Retained manifest/autolinking inputs and Billing permission are not final merged/binary evidence. Existing upload certificate metadata does not verify a future payload signature.

Use the corrected AAB validator and its passing 11 synthetic test methods after an approved build; bind exact artifact/config/manifest/mapping and verify supported resolved Billing version, ABI/JNI/R8/reflection behavior, 16 KB alignment, cleartext/backup/permissions, package/version/runtime and full payload signature. No native SDK installation, prebuild, Gradle compile, emulator, EAS build or AAB upload occurred. Genuine FCM registration/delivery, native choice, Razorpay WebView, secure PDF and reinstall restoration require separately authorized physical-device tests.

## Test results and separately authorized acceptance plan

**Fresh final checks: 88/88 PASS** — 66 mobile checks, 17 backend checks, TypeScript, dependency tree, offline Expo dependency compatibility, whitespace, and AAB-validator fixtures. [Exact commands/exits/logs](evidence/buy-now-activation-20261111/check-results.json), [credential-free runner](evidence/buy-now-activation-20261111/run-checks.py). New success-owner suite covers confirmed-details clearing, delayed order/purchase replies, A→B→A, isolated sign-out, stalled Auth/readback, late success, unpaid/refunded orders and amount mismatch. Tests use synthetic in-memory Auth/provider/network adapters, not genuine transactions. Alternate-environment fixture suites were excluded; Google reporting ran `--production-only`.

Inherited actual PostgreSQL evidence: latest Android blocker-fix run records **Phase B 228 PASS markers** and **Phase C 163 PASS markers**, with real isolated PostgreSQL 17.11 triggers/transactions/races/ACLs/history and synthetic provider transports. Reviewed SQL/server inputs remain unchanged and production baseline hashes still match, so those completed database suites were not redundantly rerun. Their results are inherited, not new SQL execution in this task. Managed Auth/Storage/cron, hosted transport and production patch-version differences remain acceptance limits. [Retained SQL results](evidence/android-blocker-fix-20261111/sql-results.json).

All following genuine/provider/device tests are **NOT EXECUTED**. Each needs an exact authorized test account/product/provider/amount/window and evidence/cleanup plan after prerequisite delivery and enrollment. Any narrowly scoped acceptance enablement must have separate approval and remain distinct from public activation. No staging or unapproved direct Razorpay shortcut is proposed. Invalid-signature/wrong-user/duplicate attacks remain synthetic locally unless an exact production probe is separately approved.

| Scenario | Required result and evidence |
| --- | --- |
| Razorpay success after native alternative choice | Genuine callback token, server quote, provider order/captured payment/HMAC and exact commitment; correct paid Note signed URL/PDF; one accounting grant/report identity |
| Play success | Genuine mapped standard BUY offer, native Play selection, verified receipt/account/order and committed immutable entitlement, accepted consume/ack behavior; correct Note/PDF |
| Cancel / pending / failed | No entitlement on cancel/pending/failure; no accidental repeat charge; pending later resolves from authoritative provider state; useful retry/My Purchases guidance |
| Duplicate callback / webhook / replay | Same signed event replays idempotently; no duplicate purchase/wallet/discount/report; no paid/refunded order regression |
| Invalid signature / amount / currency / IDs | Fail closed before grant; malformed raw webhook rejected; no false-success UI |
| Wrong account / product / course / scope | Foreign order remains hidden; exact chapter/subject/year/bundle granted only to intended owner; mutable catalog changes cannot expand snapshot |
| Refund / dispute / reversal | Authorized test-only full/partial refund and open/won/lost dispute follow durable rules; access suspension/restoration/revocation and external refund readback agree; no regrant after reversal |
| Crash / UPI background / callback loss | Kill before/after authorization, capture and proof; resume/restart recovers original attempt without second checkout; capture-only state remains unconfirmed until commitment |
| Account switching | Switch during quote/native callback/storage/provider verification/readback/PDF open, including A→B→A; no stale private details/success/downloads; original owner can restore |
| Restart / reinstall | Successful entitlement restored from server after same-account login; Play receipt restore where applicable; local flags/cache absence does not lose ownership; other accounts denied |
| Reporting / operational deadline | Genuine Google create/get readback with issued token and exact package/INR/tax/time/address; authorized-before-capture report; duplicate/timeout reconciliation; partial/full reversal report; deadline and parked/heartbeat alerts observed |
| Device / build / free content | Exact signed AAB installation, native choice/UPI/WebView/PDF/FCM and accessibility; educational videos remain free; existing purchases work with new sales disabled |

## Safe future sequence and owner actions

1. **Immediate smallest backend blocker:** supply current complete recovery evidence and proposed operator/observer/window/RPO/RTO. Review gaps against the Phase A runbook; prepare an exact backup/restore demonstration proposal if evidence is missing. Do not create/restore a backup or change account recovery settings from this task.
2. Refresh production baseline/recovery/drift; independently approve exact A1–A3 sources and atomic wrapper. Only after that approval may the privileged operator execute the reviewed transaction and exact ledger entries, followed by independent read-only postchecks and unchanged financial/access aggregates.
3. Independently approve B1 → B2 → B3 full archives/configuration after proving A delivery/cache/ACLs. Preserve safe preimages; retain disabled sales. Do not invoke verification/recovery/worker endpoints as deployment smoke tests without separate authorization.
4. In parallel as owner evidence work, obtain actual Play enrollment/terms/package/India/SKU/offer/API-permission proof, genuine Razorpay configuration and the per-case historical dispositions. Review C1–C4 migration effects/ledger order/unique-index locking, all Phase C function closures and operational/timestamp/tax/alert contracts. Each delivery/worker action needs exact separate approval.
5. Deliver only the approved C SQL/functions in dependency order; independently verify final strong Razorpay/Play proofs, choice gates and retained Notes readers. Separately approve reporting/catalog/consume/reconcile/void worker operations and observe accepted deadline/alert behavior before sales. Do not activate overlapping worker paths or replay historical jobs automatically.
6. Supply real package/project-matched Firebase Android config and FCM v1 credentials through the existing workflow. Preserve signing. Re-pin the complete mobile dirty source snapshot: Phase C's old mobile hashes now differ for exactly the two changed payment screens; backend packages remain intact. Review a production-targeted native acceptance build/profile while retaining public sales disabled; no staging profile reuse. Any new purchase-enabled runtime/profile/gate change is a separate reviewable artifact, not prepared as an automatic activation here.
7. Obtain explicit build approval, compile and inspect the exact AAB, then obtain tightly scoped acceptance/payment/refund/reporting approval and execute the matrix on real devices. Record genuine provider and Google readback; preserve all ₹1/₹2/₹5 prices and existing Notes. No AAB publication follows from build/test approval.
8. Re-evaluate all twelve gates with current evidence. Prepare an exact proposed production activation diff/artifact, backend/build/runtime/gate values, exposure/window, fail-safe and observers. Request the owner's separate explicit approval for that concrete action. Publication and financial workers remain separate approvals. Only after approved execution and independent state verification may any statement say production Buy Now is active.

On drift, missing recovery, unaccepted Google reporting, native failure, inconsistent historical disposition or any remaining mandatory gate: stop that rollout step, preserve financial facts and existing legitimate access, and leave new purchases disabled. A mobile disabled gate is not a global backend kill switch; existing legacy website endpoints were not shut down or probed. No blanket payments-off claim is made for every backend caller.

## Exact task-attributable modifications

| Existing file | Local change |
| --- | --- |
| `mobile-app/src/screens/payment/PaymentSuccessScreen.tsx` | Account/generation invalidation and 15-second bounded confirmation display; prior normal/isolated server readback retained |
| `mobile-app/src/screens/payment/PaymentFailedScreen.tsx` | Pending-payment text requires purchase and Notes-access confirmation |
| `mobile-app/scripts/nonplay-test-isolation-selftest.cjs` | Add Auth-state mock for the success-screen subscription; prior assertions retained |

New files: `mobile-app/scripts/payment-success-owner-selftest.cjs`; this report; and **only** `docs/audit/evidence/buy-now-activation-20261111/` evidence files. The linked artifact manifest enumerates every new path, including logs, hashes and reused read-only collectors/check runner. Prior audit/release packages, migrations, Edge sources, prices, app config/provider gates, website/admin, dependencies and earlier fixes are unchanged. No Git reset/stash/clean/commit occurred.

**NO-GO remains in force. Next action is recovery evidence and review, not activation.**
