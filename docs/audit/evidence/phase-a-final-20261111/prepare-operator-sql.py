"""Offline preparation only; never opens a database connection."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[4]
out=Path(__file__).resolve().parent
manifest=json.loads((root/'docs/audit/evidence/production-preflight-20261111/deployment-manifest.json').read_text())
def lit(s):return "'"+s.replace("'","''")+"'"
versions='ARRAY['+','.join(lit(v) for v in manifest['baseline_versions'])+']::text[]'
sql="""-- PROPOSED ONLY. Owner recovery approval and identity/drift checks REQUIRED.
-- Never execute this during the safety review. No automatic retries.
\\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='15s';
SET LOCAL idle_in_transaction_session_timeout='15s';
DO $preconditions$
BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'approved postgres migration role required'; END IF;
 IF nullif(current_setting('medveda.phase_a_owner_approval',true),'') IS NULL THEN
   RAISE EXCEPTION 'separate owner approval reference required';
 END IF;
END $preconditions$;
-- Ledger first, then fixed table order. Bounded ACCESS EXCLUSIVE blocks reads too.
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.orders IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.purchases IN ACCESS EXCLUSIVE MODE;
DO $baseline$
BEGIN
 IF (SELECT array_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations)
    IS DISTINCT FROM BASELINE_ARRAY THEN RAISE EXCEPTION 'migration baseline drift'; END IF;
 IF EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
 ('razorpay_entitlement_committed','guard_razorpay_order_transition','guard_purchase_success_ownership')) THEN
   RAISE EXCEPTION 'unexpected existing Phase A function; stop, no replacement approval';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname IN ('orders_03_razorpay_transition','purchases_zz_success_ownership')
 AND tgrelid IN ('public.orders'::regclass,'public.purchases'::regclass)) THEN
   RAISE EXCEPTION 'unexpected existing Phase A trigger';
 END IF;
END $baseline$;
""".replace('BASELINE_ARRAY',versions)
for a in manifest['phases']['A']['artifacts']:
    b=(root/a['source_path']).read_bytes()
    assert hashlib.sha256(b).hexdigest()==a['sha256']
    assert b==(root/a['path']).read_bytes()
    s=b.decode();assert s.count('begin;')==1 and s.count('commit;')==1
    body=s.replace('begin;','',1).replace('commit;','',1)
    sql+='\n-- Exact reviewed source SHA-256 '+a['sha256']+'\n'+body+'\n'
    name=Path(a['source_path']).stem.split('_',1)[1]
    # Records only after the exact DDL body succeeds; same outer transaction.
    sql+='INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('+lit(a['schema_version'])+','+lit(name)+',ARRAY['+lit(s)+']::text[]);\n'
sql+='COMMIT;\n'
(out/'operator-phase-a-proposed.sql').write_text(sql)
print('Prepared exact three-file DDL/ledger transaction; NOT EXECUTED')
