# Wallet findings and hunt coverage

Phase 1 map/design completed before product changes. All reproductions use synthetic local data. R approval is supplied-design review, not source certification (child tools unavailable).

| ID | Severity | Root cause and concrete failing scenario | Before evidence |
|---|---|---|---|
| BACK-11 | Medium | wallet_balance_of 20260925110000:190 and no_overdraw 20260926130000:166 drop expired face credits but retain their spending. credit100/spend100/expire/new100 ->0 instead100. | before/BACK-11.log; before/BACK-11-partial.log |
| BACK-13 | Medium | Razorpay 20261104100000:399 and Play 20261019151000:84 stamp nominal hold+expiry; release 20260927130000:698 can delay indefinitely. New held credit with 30-day duration released after nominal expiry has balance0 instead20. | before/BACK-13.log |
| WR-01 | High | admin_reverse_wallet_credit 20260926130000:201 and provider reversal routines cap to global balance, not targeted credit remainder. Spend A100, earn B100, reverse A -> wrongly removes B. | before/WR-01.log (first run fixture error corrected; retained log is intended failure) |
| WR-02 | Medium | get_my_referral_list 20260925110000:237 treats nominal available_at<=now as credited despite pending status. Overdue held pending row appears credited. | before/WR-02.log |
| WR-03 | Medium | admin utils/referralLimits.ts:7 omits expiry validation; Referrals.tsx:255 omits error. DB null accepted, 0 fails CHECK. Negative/fraction/NaN/range invalid submissions have no field error. | before/WR-03.log; before/WR-03-admin.log |
| WR-04 | High | Candidate lock inversion: admin reverse credit row before owner lock vs proposed coordinated release. Root cause at 20260926130000:201; runtime reproduction required. Existing release does not hold owner first, so do not claim a pre-existing reproduced deadlock from this source alone. | No local reproduction yet |
| WR-05 | High | Candidate cross-user refund lock order: buyer owner+order then referrer row+owner in reverse_payment/reverse_play_payment. Reciprocal referrals may create a cycle; actual eligible relationship/runtime proof required. | No local reproduction yet |

Additional requested scenarios remain a coverage checklist, not invented findings: self referral, code reuse, same phone/device/network, double settlement/reward, reward before hold, refund/chargeback/rejection after reward, double debit/restore, reserve races, negative/zero/paise, settings changes before earning/after earning, deletion. Existing named suites in wallet-referral-map.md exercise many of these. Final report must distinguish actual executable evidence from source-only reasoning, and may not infer device/production results.

## Additional confirmed findings and final qualification

- WR-06 (Medium): Razorpay reward stamping `supabase/migrations/20261104100000_razorpay_snapshot_discount_retry.sql:399` and Play `20261019151000_play_duplicate_settlement_result.sql:84` add integer hold+expiry settings. DB accepted expiry2147483647; exact producer arithmetic raises integer out of range. Before: before/WR-06.log. Fix: existing minimum CHECK plus maximum-only <=36500 CHECK; admin mirrors it; actual max-hold90/max-expiry36500 earning passes (after/expiry-boundaries.log). No existing value is clamped.
- WR-07 (Medium): `admin-panel/src/services/referralService.ts` rejectReferral discarded SQL result; `useReferrals.ts` and Referrals page closed the dialog without exposing `credit_already_released`. The DB intentionally preserves released money. Before real-service transport test fails (before/WR-07-admin.log); typed result/visible warning now pass (after/WR-07-admin.log and after/WR-07.log). No automatic reversal or reversal UI added.
- WR-04 original admin/release cycle was NOT REPRODUCED on the pre-Fix-5 schema. A deletion/admin cycle introduced by the intermediate owner-lock trigger was reproduced and corrected by owner-first erasure; before/deletion-concurrency.log is explicitly intermediate-schema evidence, not production/old-schema proof. Same distinction applies to the corrected new-credit timestamp allocation regression.
- REQ-DB-0 is BLOCKED by unchanged K4, not silently discarded: direct SQL0 remains rejected. Admin0 canonicalizes to NULL, which DB accepts. before/WR-03.log and after/DB-NULL.log.
- Legacy policy remains owner action: default retains original stamps, optional file is outside migrations and was not executed.

Final status table and counts are authoritative in ../MEDVEDA_FIX_5_2026-11-14.md. See hunt-coverage.md for all requested scenarios and limits.
