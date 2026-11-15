# MOB-13 — locally fixed; device validation pending

Same verifier: `node mobile-app/__tests__/MOB-13.cjs`, PASS (raw after/MOB-13.log). Before log records the original delayed A marker failure.

Ownership claims and signout cleanup share one serialized chain. Owner transitions synchronously advance an epoch (including A → B → A), invalidate download admission, and check current epoch/owner around storage and purge awaits. New downloads and quiz saves wait for a completed current ownership claim; transfer callbacks also compare the epoch. Claim/storage failures leave admission closed. Serial cleanup cannot remove a later published owner marker.

Checkpoints include source before/after plus the incremental patch. Existing unrelated edits are preserved. Native shared-device account switching, interrupted purge and storage failure still require device validation. Root D10 auth-state serialization review remains separate.
