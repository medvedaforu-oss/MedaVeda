# MOB-04 correction review

Verdict: APPROVE MOB-04 correction.

Read-only source/test review of current OrderSummaryScreen.tsx and playBillingService.ts. No second source failure found within MOB-04 scope.

The screen pins screenEpoch and attemptEpoch to the initiating auth lifetime. canContinue/canShowAttempt reject A→B→A, blurred screens, and disposed screens; admission and native-launch continuations recheck focus and auth after awaits. The watchdog retains the attempt and admission lock, leaves billing listeners installed, and exposes My Purchases. A late success navigates once. Auth change invalidates quote admission and cannot revive the original screen when A returns.

The service checks auth epoch and the caller's focus/lifetime predicate before dispatch and after asynchronous preparation. A durable unresolved attempt blocks replacement. A post-dispatch rejection retains the persisted owner/order association and reports pending. Explicit cancellation is the only launch outcome that clears it; billing subscriptions survive uncertain outcomes.

Independent verification: node __tests__/MOB-04.cjs PASS, including late callback, duplicate success, owner switch and A→B→A. An in-memory supplemental harness invocation also PASSed retained watchdog and callback delivery while navigation.isFocused() was false and after unmount. This supplements, but does not model actual native focus event delivery.

node __tests__/MOB-04-service.cjs initially failed before executing assertions because its fixture lacks the newly required ./authState import mock. Orchestrator notified to fix fixture only; this is a test fixture failure, not a second source failure. After the orchestrator added the missing authState mock without changing assertions, independent rerun PASSed. It proves persisted pending attempts prevent native dispatch and remain unchanged, post-dispatch bridge rejection retains the attempt and emits pending, and a second checkout is blocked.

Native/device lost callback, process recovery, real focus events and deployed billing acceptance remain unverified.
