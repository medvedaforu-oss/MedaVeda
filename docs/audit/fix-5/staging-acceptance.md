# Owner staging acceptance — unperformed

1. Confirm an isolated staging scratch project/database with synthetic accounts only. Confirm `purchase_settings.new_orders_enabled` remains false; do not change billing flags or enable a scheduler. Do not use real provider payments, refunds, messages or account deletion.
2. Apply `20261114090000_fix5_wallet_expiry_facts.sql` there. Expect COMMIT, no historical ledger amount/time changes. If backfill or settings preflight aborts, retain the error and stop; do not alter history or remove assertions.
3. From the repo root, using an owner-configured PostgreSQL service pointing ONLY to that scratch database:

   ```bash
   psql service=medveda_staging_scratch -X -v ON_ERROR_STOP=1 -v FIX5_STAGING_ACCEPTANCE=1 -f docs/audit/fix-5/staging-wallet-smoke.sql
   ```

   Expect 19 PASS markers, transaction rollbacks, exit 0. These direct DB fixtures test monetary rules; they do not prove Edge Auth/network/device behaviour. `WR-03.sql` is intentionally excluded because it asserts direct DB-zero support, which conflicts with unchanged K4. `DB-NULL.sql` tests the accepted boundary.
4. Deploy matching Edge bundles only after the migration and owner review of unrelated dirty-tree work; Fix 5 itself changes no Edge source. Keep the sales guard disabled. Deploy admin/mobile afterward. Verify authenticated foreign-user wallet access is denied and the disabled-sales endpoint still rejects order creation.
5. In the admin Referrals settings, save blank expiry, reload, verify it stays blank and DB value is NULL. Repeat with 0; it saves as NULL. Positive 30 persists; -1, fractional values and 36501 show a field error. Test a denied/zero-row save: it must fail, never report success. Do not set live policy while doing this qualification.
6. In the staging mobile build, verify terms omit the numbered expiry duration for no-expiry settings; positive settings explain actual availability. Verify pending/review wording, expired totals, and an old client tolerates the added wallet output. Custom terms URLs require separate owner review.
7. Reject a pending synthetic referral: held credit cancels. Reject a released synthetic referral: the UI must explicitly state that the reward remains in the wallet. No automatic reversal is added.
8. For local repeatable full/concurrency checks, use `fix3-run-all.sh`, `fix-5/tests/run-targeted.py`, and `fix-5/run-final-checks.py` with a disposable /tmp PostgreSQL socket. They are local-only runners; do not bypass their host restrictions to point them at hosted data.
9. Record staging project identity, migration version, app/admin build IDs, device/OS, date and actual outputs. No staging/device acceptance is claimed by this report.
