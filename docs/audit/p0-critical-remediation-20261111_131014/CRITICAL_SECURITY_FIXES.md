# Critical/high security remediation

Date: 2026-11-11 UTC. P0 only. Local synthetic PostgreSQL/provider evidence; no production/staging connection, deployment, financial transaction, credential change, worker/schedule activation, Android build upload or payment activation. Existing approved artifacts and financial history were preserved. **Local verification is not production protection or acceptance.**


Latest security audit reported no independently demonstrated CRITICAL exploit; its HIGH findings and delivery/history/recovery gaps are P0 blockers. Scope does not include the separate medium/low admin analytics, menu, lint or dependency work. They remain P1/P2 and were not started. Malformed-body/SQL fixture fixes here only restore applicable P0 verification.

| Issue | Current-source verification and action | Regression evidence | Production |
|---|---|---|---|
| AUD-001 reversal acknowledgement | Confirmed on byte-identical initial helper. Strict recognized SQL statuses, non-2xx for null/unknown/unrecognized results, unknown provider dispute state retry; closed manual decision preserved | `reversal-before.log`, p0-reversal workspace/package logs; actual helper + HMAC webhook + worker finish=false for 36 unresolved paths; accepted idempotent outcomes retained | Delivery required |
| AUD-002 targeted disclosure | Confirmed original handler accepts targeted request and persists broadcast row. Reject any non-null targeting before insert/token read, including empty/malformed arrays; broadcasts/admin/MFA unchanged | `notification-before.log` shows 200 vs expected 400; p0-notification tests prove zero content insert/token reads on rejection | Delivery required; no historical notification purge authorized |
| Capture mismatch retry | Current workspace acknowledged 400/404 without durable financial disposition, unlike already corrected compatible candidate; reconciled workspace with fail-closed behavior | Four unresolved statuses retry; only three durable compensation/reversal dispositions acknowledge; pinned handler+SQL suite | Delivery required |
| MV003/004 bypass/foreign access | Earlier local fixes verified; no new bypass reproduced | Exact SQL proof/HMAC/Auth owner and account-switch tests; no client success access; trusted Notes signing | Hosted delivery/verification not established here |
| Financial RPCs/RLS/definer/service-role | Tested RPC execution denied to anon/authenticated, permitted to service role with fixed path; backend auth precedes privileged work | Current SQL suites; final routine/ACL/trigger inventory; forged signature/owner/MFA denials | Fresh hosted ACL/cache/Auth verification required |
| Admin financial action escalation | Latest audit shows backend allows only permitted unpaid cancellation/failure; no new privilege bypass reproduced | Existing SQL admin/MFA/grant/terminal transition checks | UI menu cleanup excluded P1 |
| Unsafe recovery | Local synthetic tests do not restore managed identities/object bytes/config or provider accounting | Recovery checklist and old complete-restore failure reviewed | BLOCKED |

The new classified-reversal SQL fix addresses a P0 recovery availability defect without relaxing exact order/payment/purchase ownership. Classification is trusted service-role provider work; clients cannot set it. Unknown/blocking/parked facts and all compensation states still deny proof. All accepted reversal statuses come from the actual retained SQL return vocabulary, rather than an open-ended non-null status heuristic.

No broad service-role token exposure, live webhook exploit or financial fraud is asserted. Package source/archive scan reports zero scoped credential-pattern findings; it is not a complete secret-history/rotation audit. Managed JWT, gateway, private Storage service behavior, merchant settings, hosted notification privacy and actual device delivery remain external acceptance gates.
