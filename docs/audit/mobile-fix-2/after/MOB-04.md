MOB-04: local verification PASS; device verification PENDING.

Root cause: resolved native launch promises leave no UI deadline; rejected dispatched native launches could discard the attempt. Added 30-second owner/focus-bound pending recovery with My Purchases and payment admission retained. Native listeners remain subscribed for late results. Blur/unmount/account transitions clear the timer; focus resumes pending recovery. Durable unresolved attempts prevent new launches across process restarts; ambiguous launch rejections retain the attempt. Definitive cancellation remains clearable.

Verification: unchanged `node mobile-app/__tests__/MOB-04.cjs` failed before and passes after (raw after/MOB-04.log). Snapshots and standalone patch in checkpoints/MOB-04. No production flags, guards, EAS, tests, staging or commits changed. playBillingService.ts was already untracked user work; snapshot before/after is the change boundary, not a tracked-base patch. Device lost/late callbacks, focus, account transitions and real store recovery remain pending.

Additional validation: mobile TypeScript check `./mobile-app/node_modules/.bin/tsc --noEmit -p mobile-app/tsconfig.json` exited 0 with no diagnostics. Fresh unchanged MOB-03, MOB-04 and MOB-18 checks passed together. No generic npm test script is defined; root agent coordinates the audit suite.
