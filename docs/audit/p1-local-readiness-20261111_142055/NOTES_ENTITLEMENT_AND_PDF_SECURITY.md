# Notes ownership and protected PDF security

Date: 2026-11-11 UTC. P1 local only. Synthetic accounts/payments and isolated PostgreSQL; no production/staging calls, financial APIs, deployment, payment activation, cloud/native build, credentials upload or publication. Production purchases remain disabled. Local verification is not production acceptance.

**ALREADY FIXED / locally reverified. No P1 authorization weakening or financial schema change.**

The trust chain remains verified user → product/order snapshot → captured successful provider payment → successful purchase/exact entitlement proof → matching chapter/subject/year/bundle and course → server-authorized private PDF URL. Client navigation/ownership caches, a pending payment, a callback or a paid marker cannot replace server authorization. Signed URL generation stays on get-note-url; no public PDF fallback or client-only unlock was introduced.

Fresh evidence includes:

- `notes-entitlement`, MV008's 20 ownership cases, `notes-open`, `purchases`, success-owner, PDF lifecycle/remote retry, offline-owner/download and purchase resource tests.
- Full real local SQL: course/year/published ancestry, profile/Storage policies, successful purchase and immutable scope snapshots, Play fulfillment, duplicate settlement, exact Razorpay commitment, compensation and classified reversals.
- MV003–MV006 and Phase B/C races: one successful ownership for simultaneous captures; conflicting payment durably compensated; restoration serialization; different users/products remain independent; no automatic deletion/dedup of historical ownership.

| Contract | Local result |
|---|---|
| Correct user/product/order/success/entitlement snapshot | PASS within synthetic/SQL boundary; scope mismatch or provider mismatch cannot prove commitment. |
| Correct course and year | Course changes invalidate client generation; matching snapshot and server policies remain authoritative. |
| Cross-user PDF | Server ACL/RLS/authorization tests deny foreign/anonymous and client route manipulation; real signed-object transport NOT VERIFIED. |
| Stale ownership after A→B→A, logout/login, refresh | Obsolete responses cannot replace current ownership or open PDF; focus/resume refresh and revocation tests pass. |
| Pending payment / duplicate entitlement | Pending cannot unlock; ownership guard and settlement locks prevent tested fresh duplicates. |
| Historical access | Synthetic legacy/NULL-key/prior ownership preserved; no production record or access disposition changed. |
| Restart / reinstall-style restoration | Server history and Play receipt fallback tested without local attempt state; real install/reinstall and managed login/storage NOT VERIFIED. |
| Network/stale cache | Retry and explicit unverified/error state tested; download owner guard retained. |

Offline paid Notes retain the existing owner boundary and verification/grace behavior. Network-unavailable revocation delay and encryption-at-rest policy are inherited acceptance concerns, not closed by this task. No P2 offline storage redesign was started. Existing signed URLs already delivered to a device cannot be retroactively revoked by changing a client cache; owner must accept URL lifetime/offline policy with actual device tests.

Legitimate production historical access remains intact because no production service/row was touched. That is preservation, not reconciliation or proof that all inherited production anomalies are valid. FIN-001/FIN-002/FIN-G001 and complete managed recovery remain OPEN.
