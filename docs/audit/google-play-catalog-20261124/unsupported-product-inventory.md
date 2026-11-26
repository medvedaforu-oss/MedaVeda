# Existing unsupported products — read-only inventory

Captured 2026-11-24T14:18:30.329471+00:00. All listed products are published. All are **ineligible for Google Play checkout**: prices are below INR 4 and no verified tier exists. Notes eligibility shown below is the pre-fix content/classification result, not checkout readiness.

| Product | ID | INR | Content eligible before fix | Orders | Purchases | Successful entitlements |
|---|---|---:|---|---:|---:|---:|
| BAMS 2nd Year Notes | 22d0ad36-9e30-481f-a884-c7380e2e7270 | 1 | Yes | 9 | 5 | 5 |
| Chapter 1st | 3ce87bfa-06f3-4f06-9a56-f07f50676708 | 1 | No | 0 | 0 | 0 |
| BAMS 1st Year Notes | bd7f49a9-90b2-45a9-b1b3-968968b9da76 | 1 | Yes | 7 | 3 | 3 |
| new | be6704dd-0070-46a8-a907-6c8fe6e454e2 | 1 | No | 0 | 0 | 0 |
| BAMS 3rd Year Notes | 05950c11-10c1-45d7-b32c-e28d25957949 | 2 | No | 2 | 1 | 1 |
| 1st and 2nd Year notes | 5318dd99-c3f1-4277-8fbf-f4dbcde9bae4 | 2 | No | 0 | 0 | 0 |
| Padarth Vigyan chapter Notes | 7003d6b3-e3c7-46e6-85a2-0324d5a8f9fe | 2 | No | 1 | 1 | 1 |
| Sanskrit Full Notes | 9ac5b8c9-f511-43c3-91d8-3be337b6b19d | 2 | No | 1 | 1 | 1 |
| Rasashastra full notes | b3da0fe4-ccb3-403c-a133-be7b04771cd0 | 2 | No | 4 | 2 | 2 |
| New notes | c561ae42-5616-4690-97fa-cfbbd8bd7cbc | 2 | No | 0 | 0 | 0 |
| Samhita Adhyayan - 1 | fbceed65-1f8f-492a-bac7-0c90292c32a4 | 2 | No | 2 | 1 | 1 |

Total: 11 products, 26 historical orders, 14 purchases and 14 successful entitlements. All 14 purchases link to Razorpay orders; no student identity, token or order ID is included. Zero matching nonplay test entitlements. A successful-purchase row is the production entitlement record in this architecture; there is no general public.entitlements table. Counts are records, not unique students.

Only BAMS 1st Year Notes and BAMS 2nd Year Notes currently pass Notes content/classification eligibility. A price increase alone cannot fix the other nine products. Existing INR 5 products also have zero Notes in their scopes, so neither is an eligible test target.

## Proposed migration for owner approval — not executed

1. Leave all 11 prices, publication and classification unchanged now. Retain failed INR 1 (attempts 3) and INR 2 (attempts 2) jobs, reserved SKUs and logs. Do not replay either price. Deploy the reviewed policy only after backup and separate authorization.
2. Complete the separately approved INR 5 candidate catalog acceptance described in controlled-retry.txt before pricing existing products. Owner approval must include temporary candidate visibility; no existing eligible INR 5 product exists.
3. Recommend INR 5.00 for the two currently eligible year Notes products: 22d0ad36-9e30-481f-a884-c7380e2e7270 (BAMS 2nd Year Notes) and bd7f49a9-90b2-45a9-b1b3-968968b9da76 (BAMS 1st Year Notes), each currently INR 1. Obtain explicit approval per ID, old/new price, effective time and effect on new Razorpay quotes. INR 4 or another supported exact price is an owner choice; no automatic substitution.
4. After approval, reload each product/current revision and submit only {"price":5} using the existing products_update(id, observed_revision, changes) boundary. Conflict means reload/reapprove; never use an unconditional update or stale form. Keep scopes, IDs, classification and publication unchanged. The shared verified INR 5 tier is reused while fresh; stale verification blocks Play checkout until genuine readback.
5. Keep the other nine products at their present prices pending owner-approved content/classification correction. Before any later reprice, establish eligible paid Notes in the existing scope, explicitly classify legacy other rows where appropriate, then approve a supported price per exact ID. Do not bulk convert classifications or publish new content as part of this pricing fix.
6. Re-read Admin readiness for the saved product revision. Existing orders retain original amount/list-price/provider/SKU/BUY option and authorized entitlement scope; in-flight payments settle against their original order, never the new catalog price. Successful purchases remain owned and are not repriced, charged again or revoked.
7. Product price is shared across providers. An owner-approved future catalog price edit changes new Razorpay quotes too; there is no provider-specific product price in this architecture. Preserve existing Razorpay orders and captures. If the owner requires Razorpay to stay INR 1/2 for future sales while Play becomes INR 5, stop and design a separately scoped provider-price feature; this task does not introduce one.

No hosted prices or records were changed. A final read-only check still found 11 low-price products, 14 successful purchase entitlements, zero verified tiers and the same failed jobs.
