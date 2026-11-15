-- Nonunique all-row lookup coverage. Active/status/source partial indexes cannot
-- cover every referencing row during FK checks or historical ownership reads.
-- No financial DML, entitlement changes, or removal of the legacy unique index.
-- Separate from the frozen 74-version A/B/C/D delivery; requires its own review.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '60s';

CREATE INDEX notes_chapter_id_all_rows_idx ON public.notes (chapter_id);
CREATE INDEX purchases_user_id_all_rows_idx ON public.purchases (user_id);
CREATE INDEX quiz_tests_subject_id_all_rows_idx ON public.quiz_tests (subject_id);
CREATE INDEX videos_subject_id_all_rows_idx ON public.videos (subject_id);
CREATE INDEX wallet_ledger_referral_id_all_rows_idx ON public.wallet_ledger (referral_id);
CREATE INDEX wallet_ledger_order_id_all_rows_idx ON public.wallet_ledger (order_id);
CREATE INDEX wallet_ledger_reverses_id_all_rows_idx ON public.wallet_ledger (reverses_id);

COMMIT;
