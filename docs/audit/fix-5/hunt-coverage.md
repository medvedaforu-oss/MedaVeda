# Hunt coverage and evidence limits

| Scenario | Evidence / result |
|---|---|
| Self-referral, one code, signup window, disabled program | phase2_referral_wallet_checks R1-R7, D/P cases; unchanged full SQL pass |
| Phone/email identity reuse and deletion farming | batch3/batch3b checks, identity hash retention, same-phone and returning-customer probes; unchanged pass |
| Same network, manual review, held reward | batch3b N cases plus held-release-expiry.py real approval/clock test; pass |
| Same physical device across unrelated identities/networks | No server device attestation guarantee found. Identity/network controls do not prove universal device-farming prevention. No demonstrated bypass of a stated device-attestation contract; source-only residual risk |
| Double reward/debit/restore, duplicate provider captures | phase2 P6/P7/W10/W11/RW cases, batch1 C/RW and Play duplicate suites; unique indexes retained; pass |
| Reward before hold, disputed payment | batch1 C7, batch3b network review, real held-release-expiry test; pass |
| Refund before/after expiry and lost/won disputes | new refund-before/after-expiry tests plus unchanged batch1 access/refund/dispute cases and classified reversal suites; pass |
| Spent/expired/held admin credit | WR-01, unchanged batch1 L cases and fix4 BACK-11; original remainder only; pass |
| Unexpired spent provider reward | F8 preserves existing global recovery policy; both deterministic credit tie orders pass; C5 actual recovery20/raw sum0 passes |
| Zero provider recovery then later deposit | provider-zero-replay test verifies durable unrecovered flag prevents later recovery; pass |
| New credit after spent credit expires | BACK-11 full and partial plus FIFO; pass |
| Quote/reservation/settlement race | unchanged wallet/discount/notes-choice/payment concurrency plus new 3-session settle+expiry+refund conservation; pass |
| Reciprocal-referral refund deadlock | WR-05 before old-schema deadlock; after two sessions no cycle, both balances0 |
| Deletion/reversal and older transaction/new deposit | Intermediate Fix-5 implementation regressions reproduced; erasure locks and insertion-visible allocation corrected; final real-session probes pass. These before logs are NOT claims of pre-existing deployed bugs |
| Negative/zero/paise | original CHECKs, overdraw and new security/conservation test; pass |
| Settings changed after earning | BACK-13 retains captured duration despite changed live setting; old amount/time fields unchanged; max-duration earning test uses actual settlement |
| Settings changed before earning | Existing policy reads reward/hold/expiry at settlement, while order discount/wallet amounts remain checkout snapshots. This is documented existing policy, not a claim of checkout-time reward reservation |
| No expiry / legacy | Admin blank/0 -> DB NULL, DB-NULL and no-expiry/deletion tests pass; legacy backfill preserves stamped dates. Raw DB0 request BLOCKED by K4 |
| Released-referral rejection | DB intentionally preserves money and returns released flag; WR-07 service/UI propagate warning; SQL behaviour unchanged |
| History, RLS, helper access, search_path, FK indexes | Full immutable/overdraw/grant/MFA suites plus expiry-security (real authenticated role); pass |

Discovery agents lacked tools. Source operations and execution were performed by root; independent design/adversarial reasoning used supplied extracts and results. No claim of independent full-file execution certification or exhaustive concurrency schedules is made.
