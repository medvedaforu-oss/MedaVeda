-- Planner regression for all-row ownership and referential-action lookups.
-- Synthetic/local test only. No rows are changed; planner setting rolls back.
BEGIN;
SET LOCAL enable_seqscan = off;
DO $test$
DECLARE target record; plan json; failures text[] := ARRAY[]::text[];
BEGIN
  FOR target IN SELECT * FROM (VALUES
    ('notes','chapter_id'), ('purchases','user_id'),
    ('quiz_tests','subject_id'), ('videos','subject_id'),
    ('wallet_ledger','referral_id'), ('wallet_ledger','order_id'),
    ('wallet_ledger','reverses_id')
  ) AS targets(table_name,column_name)
  LOOP
    EXECUTE format('EXPLAIN (FORMAT JSON) SELECT id FROM public.%I WHERE %I = %L',
      target.table_name,target.column_name,'00000000-0000-0000-0000-000000000001') INTO plan;
    IF plan::text NOT LIKE '%Index Cond%' OR plan::text LIKE '%"Node Type": "Seq Scan"%' THEN
      failures := array_append(failures,target.table_name||'.'||target.column_name);
      RAISE NOTICE 'Missing all-row index access: %.%: %',target.table_name,target.column_name,plan;
    ELSE
      RAISE NOTICE 'PASS indexed all-row lookup %.%',target.table_name,target.column_name;
    END IF;
  END LOOP;
  IF cardinality(failures)>0 THEN
    RAISE EXCEPTION 'All-row FK lookup index coverage missing: %',array_to_string(failures,', ');
  END IF;
END;
$test$;
ROLLBACK;
