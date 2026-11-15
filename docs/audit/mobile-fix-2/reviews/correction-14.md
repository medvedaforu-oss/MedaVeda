# MOB-14 correction review — APPROVE client correction

Read-only source/test review of current `mobile-app/src/services/syncEngine.ts`, limited to the two prior MOB-14 rejection reasons.

- Retry cooldown is filtered before the 50-item batch cap. Fifty retained reading-progress failures therefore stop monopolizing later passes; cooldown is capped and expired/absent queue IDs are removed from memory.
- Drain captures the initiating owner and auth epoch, obtains and validates that owner's session, and rechecks the epoch after awaiting it. Quiz RPC, bookmark/watch-history upserts and deletes all explicitly bind the captured bearer. Owner lifetime changes cannot acknowledge an old response.
- Independently ran `node mobile-app/__tests__/MOB-14.cjs` and `node mobile-app/__tests__/MOB-14-backoff.cjs` with login disabled: both PASS. Coverage includes repeated failure retention, cooldown, fifty-row starvation, captured authorization headers on every dispatch branch, session-await ABA and account changes during dispatch.

Reading progress remains a BACKEND DEPENDENCY: it deliberately stays pending until an authorized atomic max-progress RPC is reviewed and deployed. Native/device and deployed backend acceptance remain unverified. This approval is for the client correction only.
