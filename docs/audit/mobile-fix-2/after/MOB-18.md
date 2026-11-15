MOB-18: local verification PASS; device verification PENDING.

Root cause: all failed quotes mapped to unavailable/Retry. The already_owned response now displays a clear owned notice with My Purchases navigation and no payment action. New quote requests reset the owned state. Disabled-platform/provider guards remain ahead of owned UI.

Verification: unchanged `node mobile-app/__tests__/MOB-18.cjs` failed before and passes after (raw after/MOB-18.log). Per-ID snapshots and standalone patch in checkpoints/MOB-18. No test changes, flags, staging or commits. Real stale-buy/deployed quote parity remains pending.

Additional validation: mobile TypeScript check `./mobile-app/node_modules/.bin/tsc --noEmit -p mobile-app/tsconfig.json` exited 0 with no diagnostics. Fresh unchanged MOB-03, MOB-04 and MOB-18 checks passed together. No generic npm test script is defined; root agent coordinates the audit suite.
