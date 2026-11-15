# Existing invariant compliance

Every assertion below is unchanged and passed in the final canonical full run. This table expands the suite-level design table; final evidence: after/full-sql-accepted.log. No assertion was deleted or weakened.

| Existing assertion | Suite | Preservation mechanism | Final evidence |
|---|---|---|---|
| A1 is_admin() no longer exists | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| A2 no policy in public / storage refers to is_admin() or to admins.e-mail | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| A3 a signed-in user whose JWT e-mail EQUALS the admin's but whose id is not in admins gets NO admin rights (products) | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| A4 ... nor on videos | `f7_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| A5 ... nor over another student's profile | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| A6 ... and cannot read every profile (sees only its own) | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| A7 ... nor app_settings | `f7_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| B1 admin CAN update app_settings (the twin created first) | `f7_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| B2 a student cannot | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B3 admin can write products | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B4 admin can write chapters | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B5 admin can write subjects | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B6 admin can write years | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B7 admin can write videos | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B8 admin can write quiz_tests | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B9 admin can write notifications | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B10 admin can insert a note | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B11 admin can update a student's profile (block/unblock) | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B12 admin still reads every profile | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B13 admin still passes am_i_admin() | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| C1 a student still reads their own profile | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| C2 a student still reads active notifications | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| C3 anon still reads active notifications and courses | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| C4 a student still reads own app_settings row (any signed-in user) | `f7_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| C5 a student still cannot write products | `f7_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| P1 no public table lets anon or authenticated TRUNCATE / REFERENCES / TRIGGER | `f8_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| P2 anon can write NOTHING except analytics_events (INSERT) | `f8_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P3 service_role keeps everything (TRUNCATE included: the server may need it) | `f8_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| P4 authenticated keeps what the app and the admin panel need | `f8_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| P5 the money tables are still read-only for clients (as before) | `f8_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| P6 an actual TRUNCATE is refused for a student (permission, not just a foreign-key error) | `f8_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| D1 a NEW public table: no TRUNCATE / REFERENCES / TRIGGER for anon or authenticated, no DML for anon | `f8_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| F1 anon can still log a pre-login analytics event | `f8_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| F2 anon can still read courses / app_config | `f8_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| F3 anon still cannot write anything else | `f8_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| F4 a student can still update their own profile | `f8_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| F5 a student can still register a push token | `f8_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| F6 a student can still save a quiz score | `f8_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| F7 a student can still log an event as themselves | `f8_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| F8 an admin can still write chapters and products (the admin panel is an authenticated session) | `f8_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| F9 an admin can still edit referral settings | `f8_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| F10 the SECURITY DEFINER RPCs students use still run | `f8_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| R1 after paying, the student owns the chapter and the note is readable | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| R2 PARTIAL refund: ignored, access untouched, purchase still success, order still paid | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| R3 FULL refund: purchase becomes refunded, access is gone (chapter and note) | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| R4 a replayed refund is a no-op | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| R5 a LATE replay of the capture event does not flip the refunded order back to paid or give access back | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| R6 a refunded student can buy the product again (a refunded row is not "owned") | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| R7 refund/dispute routines are server-only | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| D1 dispute opened: access suspended, order and payment untouched | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| D2 a second "opened" event (under_review / action_required) changes nothing | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| D3 dispute won: access restored | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| D4 an unknown outcome is rejected, not guessed | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| D5 dispute LOST: purchase chargeback, no access, order refunded, wallet NOT given back | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| D6 an owned product cannot be bought while the access is active | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| D7 dispute won after a re-purchase: the old row becomes duplicate (no unique-index failure), access via the new one | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| C0 four friends paid -> four pending credits | `batch1_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| C1 credit past its hold date but still pending: cancelled on refund, and the release job does NOT release it afterwards | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| C2a the friend's erasure removed the referral row (the situation being tested) | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| C2 refund after the friend deleted their account STILL cancels the referrer's credit (found by order id) | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| C3a both credits are released (available 50 each) | `batch1_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| C3 refund after release: a reversal row takes the credit back, balance 0, referral rejected | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| C4 replayed refund: no second reversal | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| C5 partly spent credit: 20 reversed, 30 flagged for review, wallet is exactly 0 and the ledger sum is not negative | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| C6 ... and a replay adds no second reversal or flag | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| C7 open dispute: the referrer credit stays pending | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| C8 dispute won: the credit is released on the next run | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| W0 three checkouts in a row, each priced with 250 of the same 500 balance; the first two are cancelled | `batch1_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W1 two paid orders consume the full 500 wallet balance | `batch1_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W2 underfunded stale order gets no entitlement or wallet debit | `batch1_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| F03 underfunded captured payment is durably queued for refund | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| W3 replays debit nothing more and add no shortfall flag | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| W4 refunding a stale order that was debited gives its 250 back | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| X1 at most one discounted entitlement is granted | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| X2 replacement retains discount and stale capture is compensated | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| X3 refund of rejected stale capture leaves the paid replacement access alone | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| O1 create_priced_order refuses an owned product with code already_owned and creates no order | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| O2 quote_my_order says already_owned too | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| O3 a different product is unaffected | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| O4 the DATABASE refuses a second successful purchase of the same product | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| O5 ... but a refunded / duplicate row for it is fine | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| O6 purchases.status is a closed vocabulary | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| O7 ... and NOT NULL | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| U1 paying both checkouts of one product: neither settlement fails (money is never lost to the unique index) | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| U2 exactly one successful purchase; the duplicate capture grants nothing | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| U3 the duplicate capture is queued for automatic refund | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| U4 refunding the duplicate leaves the student's real access alone | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| A1 anon can still log an anonymous event | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| A2 anon CANNOT attribute an event to a user | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| A3 a student CANNOT attribute an event to someone else | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| A4 a student can log their own event | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| A5 an oversized event name is refused | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| A6 an oversized params blob is refused | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P1 a student cannot edit profiles.email | `batch1_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| P2 name still editable; saving the SAME phone keeps mobile_verified | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P3a a direct UPDATE of the phone is refused (change_my_phone() is the only way) | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P3 changing the phone (through change_my_phone) resets mobile_verified | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P4 ... and the student cannot set it back | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| P5 when the AUTH email changes, profiles.email follows (server path) | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| Q1 score above total is refused | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| Q2 percentage 99999 is refused | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| Q3 a negative score is refused | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| Q4 a normal attempt is accepted and the forged email is replaced by the student's own | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| I1 an order for amount 0 (or less) is refused | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| I2 the Phase 2 price-breakdown check is now VALIDATED | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| I3 an order that has a payment record cannot be deleted (no silent cascade of accounting rows) | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| I4 referrals.first_order_id must be a real order | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| I5 payments.razorpay_payment_id has ONE unique index/constraint, not two | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| I6 ON CONFLICT (razorpay_payment_id) still works (settlement replays are idempotent) | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L1 a debit above the balance is refused by the ledger | `batch1_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| L2 a debit of exactly the balance is fine | `batch1_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| L3 a reversal on an empty wallet is refused too | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| L4 admin cannot reverse a credit the student already spent (clear message) | `batch1_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| L5 partly spent: admin reversal takes only the 30 that is left (never negative), noted as partial | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| L6 a second reversal of the same credit is refused | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| L7 an expired credit cannot be reversed (it would eat other credits) | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| L8 a student still cannot reverse anything | `batch1_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| F01 refund before capture linkage never grants access | `batch1_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F01 event id cannot be reused with a different payload hash | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| F05 provider capture time survives 25-hour callback delay | `batch1_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N1 an UNVERIFIED friend cannot apply a code | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N2 a code of an UNVERIFIED referrer answers "invalid_code" (nobody can probe who is verified) | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N3 verified friend + verified referrer: applied | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N4 the switch works: with require_verified_phone off, an unverified friend can apply | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N5 control: both verified at purchase -> the referrer gets a pending credit of 50 | `batch3_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N6a (setup) changing the phone dropped the friend's verification | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N6 friend unverified AT PURCHASE: access granted, but NO referrer credit; referral rejected with the reason | `batch3_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N7 REFERRER unverified at purchase: no credit | `batch3_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| L1 the REFERRER cannot select referrals rows (friend ids, order ids, reject_reason) | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L2 the FRIEND cannot select referrals rows either (referrer id, code) | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L3 an admin still reads them (admin panel) | `batch3_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| L4 the RPC still lists the referrer's own referrals | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L5 ... and it no longer returns the friends' user ids | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L6 ... still first names only (no surname, email, phone) | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L7 the friend sees none of the referrer's list | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L8 anon cannot call get_my_referrals | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L9 the current app's RPC (get_my_referral_list) is unaffected | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L10 nor can a student change referral rows | `batch3_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| C1 cap 1: first friend is accepted | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| C2 cap 1: second friend is refused | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| C3 a REJECTED referral does not use up a slot: the second friend can now apply | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E1 the 11th and 12th attempt within the hour are rate-limited | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E2 the limit is per user (another user is unaffected) | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E3 a generated code is 7 characters from the unambiguous 31-symbol alphabet | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E4 3000 fresh codes: all valid and all different | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E5 the generator no longer uses random() | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E6 the first character is spread over the alphabet (no modulo bias / stuck value) | `batch3_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| E7 lookup is case-insensitive on INPUT (exact match on the stored upper-case code) | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E8 the DB refuses a lower-case stored code (it would never match the exact lookup) | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E9 the cap query no longer scans upper(referral_code): lookup uses the unique index | `batch3_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| S0 require_verified_phone defaults to FALSE (no verification flow exists yet) | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R1 a purchase records ONE hash per identity (email + phone), never the raw values | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R2 the account is really gone (profile and purchases) | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R3 ... but the identity hashes survive the deletion | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R4 re-signup with the same mailbox (gmail dots / +tag / case): cannot apply a referral code | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R5 ... and even with a referral row in place, checkout gives NO friend discount | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R6 ... and the quote the app shows says the same | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R7 ... the purchase is granted, but the referrer gets NO credit and the referral is closed as returning_customer | `batch3b_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| P1 same PHONE as a previous buyer (new email): cannot apply either | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| G1 a genuinely new user (new email, new phone) can apply | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| G2 ... gets the 10% friend discount (50) | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| G3 ... their own purchase history is not "prior": the referrer is credited 50 (pending) | `batch3b_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| G4 a new user with no phone at all can apply (a missing phone is not a match) | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| O1 an existing customer buying a SECOND product is not blocked by their own earlier purchase | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| O2 a refund does NOT clear the identity (buy - refund - delete - re-signup is not a way back to "first purchase") | `batch3b_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| V1 a student cannot read the identity table | `batch3b_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| V2 the helper functions exist and are not callable by clients | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| V3 email normalisation: dots+plus+case collapse only for gmail; other domains keep dots | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N0 all four friends paid: four pending credits | `batch3b_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N1 same IP: the credit is HELD (still pending) even though its hold date has passed | `batch3b_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N2 ... and an unresolved review flag says why, names both accounts and carries the caveat | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N3 different IPs: released normally, no flag | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N4 sessions with NO ip are not a match: released normally | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| N5 running the job again neither releases the held credit nor adds a second flag | `batch3b_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N6 the referrer opening their wallet (which also runs the release) does not release it either | `batch3b_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N7 a student (even the referrer) cannot resolve the flag | `batch3b_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| N8 an admin resolving the flag lets the credit release on the next run | `batch3b_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N9 an admin rejecting the referral cancels the held credit, and it never releases | `batch3b_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N10 admins can list the held credits; students cannot | `batch3b_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N11 if auth.sessions cannot be read there is simply no signal (false), never an error | `batch3b_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| N12 a pair and itself never "share a network" | `batch3b_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| L1 authenticated has no INSERT/UPDATE/DELETE on wallet_ledger | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| L2 anon has no access to wallet_ledger | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| L3 student cannot mint wallet credit | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| L4 even an admin cannot insert into the ledger directly | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| L5 service_role may write the ledger | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| L6 clients cannot call internal wallet functions | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| R1 self-referral blocked | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R2 code refused after the signup window (not usable later) | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R3 new user can apply a code | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R4 ... the referral starts pending (no reward at signup) | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| R5 a second code cannot be applied (one referrer per friend) | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| R6 student cannot edit referrals rows | `phase2_referral_wallet_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| R7 no code can be applied while the program is disabled | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| D1 a user with no referral gets no discount | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| D2 friend: 10% off the SELLING price (500 -> 50, not 10% of MRP 900) | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| D3 order row stores list price, discount, wallet and final consistently | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| D4 replacement checkout retains capped first-purchase discount | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| D4a quote agrees with replacement discounted checkout | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| D4b first checkout discount remains capped at Rs 100 | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| D5 creating a second checkout supersedes the first discounted one (no stacking) | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| C1 student cannot change order amount | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| C2 student cannot change discount / wallet on an order | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| C3 ... and the breakdown is immutable even for the server | `phase2_referral_wallet_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| C4 create_priced_order is not callable by a student | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| C5 authenticated cannot insert an order with a made-up price | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P1 an unpaid (created) order creates NO credit and NO debit | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| P2 friend pays -> referral qualified, first_order_id set | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P3 referrer gets ONE pending credit of Rs 50 | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| P4 credit is held ~7 days | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| P5 balance view: available 0, pending 50, total earned 50 | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| P6 replayed settlement adds no second credit | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| P7 DB rejects a second referral credit for the same friend | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| P8 friend has no discount on the second purchase | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P9 second purchase does not create another credit | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| P10 referral list: masked name + "purchased_pending" | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| P11 a stranger sees none of A's referrals | `phase2_referral_wallet_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| P12 a student can SELECT only their own ledger rows | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| H1 a student cannot run the release job | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| H2 before day 7 the credit stays pending | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| H3 after 7 days: available 50, pending 0 | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| H4 referral marked rewarded | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| H5 referral list shows "credited" | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| H6 ledger amount cannot be edited (append-only), even by the server | `phase2_referral_wallet_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| H7 ledger rows cannot be deleted | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| H8 ledger cannot be truncated | `phase2_referral_wallet_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| W1 wallet REFUSED on a video product | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W2 wallet REFUSED on an untagged product | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W3 a video can still be bought without the wallet (full price, nothing reserved) | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W4 checkout quote says wallet is not eligible for a video (toggle hidden) | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W5 balance 50 < cap 250: uses 50 -> pays 450 | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W6 nothing is debited until payment | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| W7 50% cap: balance 1000, price 500 -> wallet 250, pays 250 | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W8 abandoned earlier order (with wallet) was superseded, not double-reserved | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W9 notes BUNDLE accepts wallet (cap 500) | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W10 payment settles -> exactly one debit of 500 for that order | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| W11 replayed settlement does not debit twice | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| W12 balance is now 500 | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W13 failed order: nothing debited, balance still 500 | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| W14 discount 50, cap = 50% of 450 = 225, final 225 | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| W15 wallet + discount never make the order free (final >= 1) | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| F0 second friend's purchase created a pending credit for A | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| F1 pending = 50 before refund | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F2 partial refund does nothing | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F3 full refund inside the hold cancels the pending credit | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F3b ... and restores the 225 the friend paid with wallet (item 4) | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F4 pending 0 and not counted as earned | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| F5 referral rejected, order marked refunded | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F6 duplicate refund event is a no-op | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F7 referral list shows cancelled for the refunded friend | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F8 refund after the hold: the released credit is REVERSED with a ledger row (Batch 1 / F3; it used to only warn) | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F9 admin can post a reversal for a released credit | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F10 a student cannot reverse credits | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| RW1 partial refund restores nothing | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| RW2 full refund restores the wallet amount (500) as an available credit | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| RW3 balance rose by exactly the restored 500 | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| RW4 duplicate refund event restores nothing more (idempotent) | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| RW5 the original debit row is untouched (history kept) | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| RW6 DB itself rejects a second restore for the same order | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| RW7 refund of an order that used no wallet restores nothing | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| RW8 a student cannot create a restore credit | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| E1 a new checkout cancels the older unpaid order (even one with no wallet/discount) | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| E2 order gets expires_at ~30 min ahead; app is told the timeout (1800 s) | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E3 expires_at cannot be extended (immutable, even for the server) | `phase2_referral_wallet_checks.sql` | Existing ledger/write guards retained; new facts append only | PASS, final full SQL |
| E3b ... nor by the student | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| E4 g2 (wallet 250) is now cancelled; g3 is the live order | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| E5 cancelled order paid: access still granted (cash is real) | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| E6 ... and the wallet amount IS debited (Batch 1 / F4: it used to be skipped) | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| E7 ... and it is flagged for admin review | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| E8 replayed settlement of the flagged order does not debit again, still one flag | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E9 cancelled order with no discount/wallet: granted, nothing to flag | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| E10 control: the live order debits normally (250) -> balance 300 | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| E11 payment STARTED after expiry: wallet debited (250), flagged | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| E12 payment started BEFORE expiry but captured late: valid, debited 50 (all that was left), not flagged | `phase2_referral_wallet_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| E13 refunding the flagged order restores the 250 it debited | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| E14 refunding the normal wallet order restores its 250 | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| E15 a student cannot see review flags | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| E16 an admin sees the flagged orders | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| E17 a student cannot resolve a flag | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| E18 an admin can resolve a flag | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| E19 clients cannot write flags | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| E20 settle_razorpay_payment is server-only | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| U1 replacement checkout retains the reserved discount | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| U2 the newer checkout cancelled the older one | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| U3 replacement discounted order settles and grants | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| U4 stale discounted capture grants nothing and remains durable | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| U5 stale discount is queued for automatic refund | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| U6 the first successful discounted purchase credits the referrer once | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| U7 replays create one durable capture and one compensation only | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| U8 the reused-discount payment can be refunded; the winner and the referrer credit are untouched | `phase2_referral_wallet_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| U9 a rejected stale capture creates no misleading discount_reused flag | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| U10 the student cannot | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| U11 a cancelled discounted checkout is captured and compensated without access | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| U12 the live replacement checkout grants the single discounted entitlement | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| U13 control: only one of two checkouts paid -> granted, nothing flagged | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| U15 second use that asked for wallet: access granted AND the wallet amount is debited (Batch 1 / F4) | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| U16 the stale discounted checkout is compensated; list-price wallet checkout has no reuse flag | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| U17 the referrer is credited once for the successful list-price purchase | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| U14 an order without a discount never touches the claim (no referral_id, no flag) | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| O1 program disabled: no friend discount | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| O2 program disabled: no referrer credit | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| J1 a student cannot reject referrals | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| J2 admin can reject | `phase2_referral_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| J3 ... which cancels the still-pending credit | `phase2_referral_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| X1 old get_my_referrals() still exists for released builds | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| X2 an old-style order (list_price NULL) is still valid | `phase2_referral_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| K1 old referral_settings_phase2_ranges is replaced, the seven range constraints exist | `referral_limits_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| K2 checkout_expiry_minutes 4 is still rejected | `referral_limits_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| K3 an unknown wallet product type is still rejected | `referral_limits_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| K4 credit_expiry_days 0 is still rejected, blank still allowed | `referral_limits_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| R1 a multi-column update with one bad value is refused as a whole | `referral_limits_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| B1 admin session, direct PATCH with a bad value is rejected by the database | `referral_limits_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B2 admin session, a valid change is accepted | `referral_limits_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| B3 a student cannot change settings at all | `referral_limits_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| A1 one change = one audit row, with admin id and email | `referral_limits_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| A2 only the changed columns are logged, old and new | `referral_limits_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| A3 changed_at is set | `referral_limits_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| A4 blank -> value and value -> blank both keep the null in the log | `referral_limits_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| A5 an update that changes nothing writes no audit row | `referral_limits_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| A6 a REJECTED update writes no audit row | `referral_limits_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| A7 the audit row is written by an update run outside a user session too (changed_by null) | `referral_limits_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P1 admin can read the audit table | `referral_limits_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| P2 a student sees no audit rows | `referral_limits_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| P3 anon cannot read the audit table | `referral_limits_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| P4 not even an admin can insert, edit or delete audit rows | `referral_limits_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| P5 the trigger function cannot be called by clients | `referral_limits_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| P6 a student cannot forge a change through the admin-only settings policy | `referral_limits_checks.sql` | Existing CHECKs/diagnostics retained; maximum-only extra bound; admin normalization | PASS, final full SQL |
| N1 ON: quote applies the wallet (Rs 200 of a Rs 250 cap) | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N2 ON: quote says wallet_eligible | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N3 ON: create_priced_order reserves the wallet | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| N4 ON: a video with use_wallet is still refused (wallet_not_allowed) | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| Q1 OFF: quote_my_order ignores use_wallet = true (wallet_amount 0) | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| Q2 OFF: quote amount is the full list price | `referral_off_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| Q3 OFF: quote reports wallet_eligible = false (the app shows no toggle) | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| Q4 OFF: quote reports nothing spendable | `referral_off_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| O1 OFF: create_priced_order with use_wallet = true succeeds (ignored, not an error) | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| O2 OFF: ... priced with wallet_amount 0 and the full amount | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| O3 OFF: the stored order carries wallet_amount 0 | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| O4 OFF: a non-eligible product with use_wallet = true is also just priced, not refused | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| S1 OFF: the order settles for the full Rs 500 (a successful purchase exists) | `referral_off_wallet_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| S2 OFF: no wallet debit was written | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| B1 OFF: the existing balance is still shown by get_my_wallet (Rs 200) | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| B2 OFF: the ledger holds exactly the one original credit | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| R1 ON again: a video is still not wallet-eligible | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| R2 ON again: the balance is spendable again (Rs 200) | `referral_off_wallet_checks.sql` | Shared signed ledger authority plus explicit expiry; captured availability policy | PASS, final full SQL |
| G1 create_priced_order is still server-only, quote_my_order student-callable | `referral_off_wallet_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| no unapproved tier cannot create order | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| Play order uses exact tier and full price | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| wrong user cannot attach choice token | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| choice token attaches once | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| different choice token rejected | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| invalid buyer state rejected | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| choice token moved to priced Razorpay order | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| F03 UCB completion time commits with grant | `ucb_checks.sql` | Existing ownership/auth/MFA/RLS gates retained; new helpers restricted | PASS, final full SQL |
| same choice cannot bind twice | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| bound buyer state cannot be changed | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| Play settlement records one payment and entitlement | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| Play settlement replay is idempotent | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| wrong user cannot settle existing Play order | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| purchase token cannot settle another order | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| Play refund revokes entitlement | `ucb_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| Play refund replay is idempotent | `ucb_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| settlement RPC unavailable to clients | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| new orders snapshot configured inclusive GST | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| old order tax snapshot never recomputed | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| later partial refund waits for first report | `ucb_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| first partial refund is claimed once | `ucb_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| out-of-order older refund waits for in-flight report | `ucb_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| older refund can follow completed in-flight report | `ucb_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| second partial refund becomes claimable | `ucb_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| refund claim RPC unavailable to clients | `ucb_checks.sql` | Recovered monetary amount; existing unique restore/reversal identities; refund/dispute policy preserved | PASS, final full SQL |
| F07 durable void cursor and backlog metric exist | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| F07 void sweep lease excludes a concurrent worker | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
| F07 released cursor can be resumed | `ucb_checks.sql` | Existing behaviour retained; full unchanged suite verifies the assertion | PASS, final full SQL |
