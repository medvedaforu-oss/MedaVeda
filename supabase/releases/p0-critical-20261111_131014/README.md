# P0 release review candidate — 2026-11-11

REVIEW READY, NOT INDEPENDENTLY APPROVED, NOT DEPLOYED. This package does not authorize execution, payments, workers, schedules or publication.

The manifest pins five isolated function source archives: verify-payment, razorpay-webhook, report-external-transaction, create-order, and send-push-notification. Complete dependencies derive from the retained B-to-C compatible candidate, with only the reviewed P0 settlement, webhook and notification changes. Website create-order remains the reviewed website entrypoint. Client purchase gates and Play requirements are unchanged.

SQL order is A1/A2/A3 (66→69), separately reviewed B delivery, corrected atomic C1/C2/C3/C4 (69→73), then separately reviewed forward proof D (73→74). The original signed/reviewed SQL and release trees remain unchanged. D is necessary for provider-classified partial refunds and won disputes to recover without weakening exact payment/ownership/snapshot proof. Local repository migration count is 75, including the excluded isolated test installer; intended final production ledger is 74. A blanket timestamp push is unsafe.

See RUNBOOK.md, manifest.json and checksums.sha256. The original Phase C manifest remains a separately pinned dependency for its dedicated Play/choice/Notes functions; these five archives do not claim to deliver all Phase C routes. Such routes stay disabled until their own reviewed closures, enrollment and operational gates are accepted. The reporting worker is included for source compatibility only; it must not be invoked, enabled or scheduled by this package.

The audit reports and exact test evidence are in `docs/audit/p0-critical-remediation-20261111_131014`. Synthetic results do not establish provider acceptance, managed Auth/Storage recovery or production behavior.
