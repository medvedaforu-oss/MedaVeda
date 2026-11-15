# Backend, mobile and admin wallet trace — Phase 1

No live user/payment/wallet records were accessed. Discovery agents lacked execution tools; root read source and supplied extracts for independent reasoning.

| Layer | Source | Interpretation |
|---|---|---|
| Edge pricing | supabase/functions/_shared/createOrderHandler.ts:106 | Authenticated user's ID + product/useWallet only; server RPC returns snapshot. No client amount authority. newOrderGate preserves disabled sales. |
| Notes choice | supabase/functions/_shared/notesChoiceOrder.ts:33 | Atomic server choice RPC and stored breakdown; provider order attach checks. |
| Settlement | supabase/functions/_shared/settle.ts:50 | SQL reverses wallet/referral atomically; expected result vocabulary, shortfall review. No independent JS balance computation. |
| Razorpay webhook | supabase/functions/razorpay-webhook/index.ts | Signed provider inbox/settlement/reversal; uses shared SQL authority. |
| Play verify | supabase/functions/verify-play-purchase/index.ts | Verified provider evidence -> settle_play_purchase; no wallet payments. |
| Repository | mobile-app/src/repositories/referralsRepository.ts:53 | get_my_wallet, list and quote RPCs; camel-case numbers; no expiry arithmetic. |
| Wallet/referrals | mobile-app/src/screens/referral/ReferralScreen.tsx:81 | Concurrent wallet/list loads; pending text uses CURRENT hold setting, misleading for old snapshots/review holds. List trusts server credited status. |
| Terms | mobile-app/src/screens/referral/ReferralTermsScreen.tsx:67 | Current discount/reward/hold; expiry truthy => after availability; null/0 omit expiry sentence. Current text incorrectly implies hold always releases automatically. Custom terms URL bypasses built-in copy; owner must review hosted terms. |
| Order summary | mobile-app/src/screens/payment/OrderSummaryScreen.tsx | Toggle requests server quote; wallet share and first discount computed server-side. No sales/billing flags changed. |
| Admin settings | admin-panel/src/pages/Referrals.tsx:255 | Blank expiry=>null; min1; omits field error. No future-credits/legacy dates explanation. |
| Admin validation | admin-panel/src/utils/referralLimits.ts:7 | Seven numeric ranges mirrored; expiry and checkout minutes omitted. |
| Admin service | admin-panel/src/services/referralService.ts:29 | Legacy keys removed; UPDATE singleton .select("id").single() already prevents zero-row success. |
| Admin reject | admin-panel/src/services/referralService.ts:94 | Calls admin_reject_referral; initial warning-propagation inference was corrected by WR-07 below. |
| Review flags | admin-panel/src/pages/ReviewFlags.tsx | Resolves shared-network hold, shows recovery instructions. |

Expiry stamps are created in SQL, not Edge/mobile/admin. Reward and hold settings are read at settlement; order discount/wallet amounts are snapshotted at checkout. Reward terms are earned at settlement, so changing settings before earning affects a new reward. Once earned, the duration must be snapshotted. Null no-expiry is already a valid DB value; zero currently fails DB CHECK and requires normalization at the client boundary. No dedicated admin ledger wallet view was found in the source search; existing table SELECT permits expiry entry display for future ledger tooling.

## Final correction to Phase-1 rejection interpretation

A later full hook/page read showed that the service discarded `credit_already_released`; there was NO existing released-credit warning. WR-07 fixes this by propagating typed flags through the hook and showing an explicit warning. No wallet reversal UI existed or was added. Pending rejection still cancels held credit; released money remains. The earlier description of warning propagation was an initial inference, not verified behaviour.
