-- CONDITIONAL FUTURE MIGRATION. Deliberately outside automatic migrations.
-- NOT a reconciliation script. Never changes historical financial rows.
-- Owner approval must name the reviewed manifest and provider evidence.
-- An approved operator sets medveda.mv006_owner_approval to that approval's
-- reference in the SAME session. This setting is an operational interlock,
-- not authentication or a substitute for restricted migration credentials.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.purchases IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF nullif(current_setting('medveda.mv006_owner_approval',true),'') IS NULL THEN
    RAISE EXCEPTION 'MV006 requires separate owner approval and reviewed reconciliation manifest';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.purchases
    WHERE status='success' AND user_id IS NOT NULL AND product_id IS NOT NULL
    GROUP BY user_id,product_id HAVING count(*)>1
  ) THEN
    RAISE EXCEPTION 'MV006 historical duplicate precondition failed';
  END IF;
END $$;
-- Do not use IF NOT EXISTS: an unexpected existing object must fail review.
CREATE UNIQUE INDEX purchases_one_success_per_product_complete
  ON public.purchases(user_id,product_id) WHERE status='success';
-- Keep the older index until a separately reviewed retirement. No DROP here.
COMMIT;
