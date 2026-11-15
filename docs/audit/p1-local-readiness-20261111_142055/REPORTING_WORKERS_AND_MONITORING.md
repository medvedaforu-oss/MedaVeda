# Reporting workers and operational acceptance

Date: 2026-11-11 UTC. P1 local only. Synthetic accounts/payments and isolated PostgreSQL; no production/staging calls, financial APIs, deployment, payment activation, cloud/native build, credentials upload or publication. Production purchases remain disabled. Local verification is not production acceptance.

**Local reporting/queue regressions pass. Production workers/schedules and genuine Google reporting were not invoked or activated.**

Reviewed actual workspace externalReporting, authorization reporting, refund/reversal helpers, report-external-transaction, paymentQueue/Play workers, recovery SQL, cron definitions and alert paths. Stable external IDs are reused, GET reconciles ambiguous CREATE, authoritative provider authorization/capture time and INR/tax/state facts are required, and refund events refer to original transaction and durable refund IDs. Missing/unknown outcomes cannot finish a job successfully. Lease ownership and retry/backoff live in SQL rather than a client success flag.

| Contract / failure | Fresh local evidence |
|---|---|
| Authorization before capture, delayed capture | notes-choice-order, b-to-c-worker/reporting; authorization report does not grant Notes; later capture requires commitment. |
| Token/user/product/order binding; duplicate jobs | Notes choice SQL plus concurrent reservation/token uniqueness; original IDs preserved. |
| Tax/currency/time/deadline | google-reporting (`--production-only` synthetic mode) and b-to-c-reporting reject missing/incorrect facts; provider time retained rather than receipt time. |
| Provider outage/retry/partial persistence | Mock GET/CREATE failures, lost persistence, reconcile-on-retry and concurrent late failure cannot overwrite reported success. |
| Refund/reversal references | Partial/full refund replay, busy claim, strict unknown reversal classification; all terminal paths retain durable retry until accepted outcome. |
| Worker leases/concurrency | payment_queue_checks, billing recovery SQL, b-to-c-worker, compensation/Play workers, full SQL and concurrency runners. Lost lease cannot return completion. |
| Restart / queue recovery | Capture-only crash recovery, pending authorization inbox, expired leases, duplicate attempts and bounded worker execution tested. |
| Parked/dead-letter | Parked/unknown facts remain visible and block entitlement where required; no automatic unpark/replay/drop introduced. |
| Scheduler/heartbeat | Cron/auth/config checks pass structurally; actual scheduled execution/independent heartbeat delivery NOT VERIFIED. |

Operational acceptance requirements (proposed, not activated SLAs):

| Signal | Initial acceptance threshold / required proof |
|---|---|
| Heartbeat | Alert after two missed expected intervals; demonstrate independent transport, on-call acknowledgement, failure diagnostics without secrets. |
| External transaction deadline | Track authoritative transaction age and actual owner-accepted Google deadline; suggested warn at 1 hour and page by 6 hours unresolved, with escalation well before deadline. Validate against applicable program contract; do not infer enrollment. |
| Parked/dead-letter/compensation | Any newly parked financial job or unresolved compensation pages the assigned operator; drill restart/retry without duplicate provider operation. |
| Capture without commitment | Alert on any durable captured state lacking committed entitlement after expected processing interval; separate known reversal/compensation dispositions. No speculative regrant. |
| Queue age/retries | Warn after 5 minutes eligible unleased backlog or 3 repeated failures; page on rising oldest age/lease churn or impending provider deadline. Record actual normal latency before accepting these thresholds. |
| Token/report/refund mismatch | Immediate fail-closed diagnostic and finance/security escalation; raw tokens/customer IDs remain protected. |
| Push credentials/receipts | Alert on InvalidCredentials/MismatchSenderId and accepted-ticket receipt failure; demonstrate actual FCM/Expo/device evidence separately. |

Require an operational dashboard for eligible/leased/retrying/parked/dead-letter jobs, oldest age, attempts, lease expiry, stable external IDs (protected), report/refund state, captures/commitments/compensations, provider error class and heartbeat timestamp. Owner assigns service, finance, security and on-call responsibility; verify alert transport outage, worker crash/restart, duplicate job and lease expiry in an authorized environment before activation. No dashboard service, scheduler or financial job was created or started here.

These acceptance requirements are P1 preparation only. Existing P2 monitoring redesign/performance work was not started. The P0 operational drain/recovery/finance gates still apply even while Buy Now is disabled.
