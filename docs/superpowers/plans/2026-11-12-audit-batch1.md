# Production audit batch 1

Scope: AUD-009, AUD-010, AUD-012, AUD-014 only. Implementation is authorized; deployment is not.

1. Preserve current deployed webhook v51, verifier v69 and sender v51 as rollback source. Compare effective production RPC definitions and ACLs read-only.
2. Reproduce early reversals, unknown-order/amount-mismatch capture acknowledgements, fully refunded fallback PDF access, and targeted-feed insertion before fixes. Retain executable regression cases.
3. Build isolated candidate bundles from deployed source. Add authenticated durable inbox, provider-authoritative capture persistence, closed reversal outcomes and idempotent compensation records. Keep verifier entrypoint and all signature, price, caller and ownership behavior unchanged. Reject targeting in the broadcast-only sender.
4. Add a forward-only service-role refund RPC that revokes purchases/wallet/referral effects and marks capture reversed atomically. Repair the settlement reversal branch so early classified refunds/lost disputes invoke existing reversal semantics. Do not backfill production records.
5. Exercise actual handlers against disposable PostgreSQL, duplicate/reordered deliveries, fault injection, mismatch recovery, refund/PDF/wallet/referral and notification cases. Run full database/payment/notification suites and mobile/admin/Edge TypeScript checks.
6. Have a fresh reviewer inspect the exact batch files, migration, compatibility evidence and release/rollback plans. Resolve material findings, retain exact file hashes and report limitations. Stop before deployment.

Review focus: no transient grant for early blocking facts; no successful webhook acknowledgement on storage failure; no duplicate wallet restoration/compensation; chargeback does not restore wallet; normal signed website callback and mobile recovery remain compatible; targeted input including empty/null never writes public content.

Ruling: implement inline without an extra plan approval; the user's request explicitly authorizes local fixes and reserves approval for deployment. Preserve dirty-tree state and use isolated release directories rather than a HEAD-only worktree, which would omit the audited implementation.
