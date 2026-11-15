# Server notification preferences — owner decisions for v1.1

Status: **OWNER APPROVAL REQUIRED (v1.1)**. Fix 6 authorizes only canonical category payloads and honest screen wording. There is no new preference table, token field, topic subscription or background filtering behavior.

The sender now copies validated top-level type to outgoing data.type, overwriting caller conflicts. Its reservation retains the original caller data to preserve requestId identity. Feed publication remains a public broadcast; targetUserIds rejection and admin/AAL/request reservation guards remain. Categories without toggles (announcement, quiz, missing/unknown categories) retain existing foreground presentation. Sender validation still rejects unsupported top-level category values.

Current preferences are device-local and shared across accounts on that installation. They filter the in-app feed and matching foreground notifications. The OS may display background/killed-app title/body alerts before JavaScript; the toggles do not control that delivery. Accepted push tickets are not proof of delivery. Private payment/recipient text must not enter the public feed.

Owner decisions carried from Phase 1:

1. Device-local, per-installation or account-wide preference scope; decide how shared-device users and existing conflicting device choices migrate.
2. Delivery-only versus delivery+feed filtering; broadcast-feed accessibility remains separate from recipient selection.
3. Defaults/mapping for announcement, quiz, unknown and future categories; Fix 6 invents none.
4. Whether payment_success can be muted; a mandatory category needs explicit product approval and safe non-sensitive content.
5. Missing-row/old-client defaults and preference revision/conflict ordering.
6. Offline/pending saves, preference-read failures and sender retry/defer policy; do not claim an unacknowledged local save is already enforced by the server.
7. Cutover promise for in-flight/queued pushes and account/token reassignment; already submitted OS delivery cannot reliably be recalled.

Recommended future option: owner-only RLS/versioned preference updates, resolve current token owner plus current choice immediately before dispatch, common filtering for all senders/jobs, canonical category and non-sensitive payloads, preserved requestId/unknown-outcome handling. Stage owner isolation, stale revisions, A→B token transfer, lookup failures, feed semantics and killed-app behavior using separately authorized synthetic pushes. Topics change provider architecture; data-only pushes trade battery/reliability for local filtering, especially on iOS. None is approved or implemented here.
