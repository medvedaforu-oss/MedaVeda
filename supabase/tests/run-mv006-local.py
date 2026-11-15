"""MV006 synthetic production-baseline tests. Requires a disposable local PostgreSQL.
PGHOST=/tmp/mv003 PGPORT=55443 PGUSER=postgres python3 supabase/tests/run-mv006-local.py
No hosted credentials are forwarded. Never contacts Supabase or Razorpay.
"""
import os
from pathlib import Path
import subprocess
import uuid

root = Path(__file__).resolve().parents[2]
assert os.environ.get('PGHOST', '').startswith('/tmp/'), 'explicit /tmp Unix socket required'
assert os.environ.get('PGPORT') and os.environ.get('PGUSER'), 'explicit local port/user required'
db = 'mv003_' + uuid.uuid4().hex[:12]
env = {k: os.environ[k] for k in ('PATH', 'PGHOST', 'PGPORT', 'PGUSER')}
env.update(PGDATABASE=db, PGOPTIONS='-c search_path=public,extensions')

def run(args, **kwargs):
    return subprocess.run(args, cwd=root, env=env, check=True, **kwargs)

def psql(*args, database=db, **kwargs):
    return run(['psql', '-Xq', '-v', 'ON_ERROR_STOP=1', '-d', database, *args], **kwargs)

try:
    psql('-c', f'create database {db}', database='postgres')
    psql('-f', 'supabase/tests/support/supabase_stub.sql', stdout=subprocess.DEVNULL)
    for m in sorted((root / 'supabase/migrations').glob('*.sql')):
        if m.name.split('_')[0] <= '20261104110000':
            try:
                psql('-f', str(m), stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            except subprocess.CalledProcessError as error:
                print(error.stderr.decode())
                raise
    psql('-f', 'supabase/tests/support/seed.sql', stdout=subprocess.DEVNULL)
    # Seeded baseline fingerprints include pre-existing historical purchases.
    tables = ['orders', 'payments', 'purchases', 'products', 'wallet_ledger', 'referrals']
    fingerprint_sql = 'select jsonb_build_array(' + ','.join(
        f"(select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public.{t} t)" for t in tables) + ')'
    def fingerprint():
        return subprocess.check_output(['psql', '-XqAt', '-c', fingerprint_sql], env=env, text=True)
    before = fingerprint()
    migration = 'supabase/migrations/20261110100000_mv003_razorpay_entitlement_commitment.sql'
    psql('-f', migration, stdout=subprocess.DEVNULL)
    psql('-f', migration, stdout=subprocess.DEVNULL)
    assert before == fingerprint(), 'migration changed financial/catalog rows'
    print('PASS standalone production-baseline migration applied twice; existing rows unchanged', flush=True)
    run(['python3', 'supabase/tests/mv005-transitions-local.py', 'baseline'])
    before = fingerprint()
    prevention = 'supabase/migrations/20261110120000_mv005_razorpay_order_transitions.sql'
    psql('-f', prevention, stdout=subprocess.DEVNULL)
    psql('-f', prevention, stdout=subprocess.DEVNULL)
    assert before == fingerprint(), 'MV005 migration rewrote historical rows'
    print('PASS MV005 migration twice: historical financial fingerprints unchanged', flush=True)
    # Confirm inspected live function definitions match this exact baseline.
    evidence = root / 'docs/audit/evidence/mv006-20261110/production-readonly.json'
    if evidence.exists():
        import json
        live = json.loads(evidence.read_text())[0]['evidence']['function_hashes']
        for f in live:
            observed = subprocess.check_output(['psql','-XqAt','-c',
                "select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='"+f['name']+"'"],env=env,text=True).strip()
            assert observed == f['md5'], 'live/baseline function mismatch: '+f['name']
        print('PASS all eight inspected live function definitions match retained local baseline',flush=True)
    run(['python3','supabase/tests/mv006-ownership-local.py','baseline'])
    before = fingerprint()
    guard = 'supabase/migrations/20261110130000_mv006_purchase_ownership_guard.sql'
    psql('-f',guard,stdout=subprocess.DEVNULL)
    psql('-f',guard,stdout=subprocess.DEVNULL)
    assert before == fingerprint(), 'MV006 rewrote historical financial rows'
    print('PASS MV006 twice over historical duplicates: existing financial fingerprints unchanged',flush=True)
    # Future constraint refuses both missing approval and unreconciled history.
    future = 'supabase/maintenance/mv006_future_unique_ownership.sql'
    for approved, message in [(False,'requires separate owner approval'),(True,'historical duplicate precondition failed')]:
        trial_env = dict(env)
        if approved: trial_env['PGOPTIONS'] += ' -c medveda.mv006_owner_approval=LOCAL_SYNTHETIC_ONLY'
        r = subprocess.run(['psql','-Xq','-v','ON_ERROR_STOP=1','-f',future],cwd=root,env=trial_env,capture_output=True,text=True)
        assert r.returncode != 0 and message in r.stderr,r.stderr
        assert before == fingerprint(), 'future constraint failure mutated history'
    print('PASS future constraint refuses absent approval and historical duplicates atomically',flush=True)
    run(['python3','supabase/tests/mv006-ownership-local.py','fixed'])
    run(['python3', 'supabase/tests/mv005-transitions-local.py', 'fixed'])
    run(['node', 'supabase/tests/mv005-history-selftest.cjs'])
    run(['node', 'supabase/tests/mv003-entitlement-selftest.cjs'])
    psql('-f', 'supabase/tests/razorpay_snapshot_retry_checks.sql', stdout=subprocess.DEVNULL)
    print('PASS retained Razorpay scope, snapshot, discount, wallet, refund and replay SQL regressions', flush=True)
    # Isolated fixture history is now non-duplicated by the scenario tests;
    # exercise future activation only here with explicit synthetic approval.
    trial_env = dict(env, PGOPTIONS=env['PGOPTIONS']+' -c medveda.mv006_owner_approval=LOCAL_SYNTHETIC_ONLY')
    before = fingerprint()
    subprocess.run(['psql','-Xq','-v','ON_ERROR_STOP=1','-f',future],cwd=root,env=trial_env,check=True,stdout=subprocess.DEVNULL)
    assert before == fingerprint(), 'future constraint changed financial records'
    psql('-c', "select 1 / count(*) from pg_index where indexrelid='purchases_one_success_per_product_complete'::regclass and indisunique and indisvalid",stdout=subprocess.DEVNULL)
    print('PASS future complete unique index activates only on clean synthetic fixture history; financial fingerprints unchanged',flush=True)
    # Disable the trigger ONLY in this rolled-back local probe to prove that
    # the future index independently covers the historical exception.
    q = """begin;alter table purchases disable trigger purchases_zz_success_ownership;
      update purchases set status='success' where id='mv006_racing_winner';
      update purchases set status='success' where id=(
        select substring(pg_get_expr(indpred,indrelid) from 'id <> ''([^'']+)''')
        from pg_index where indexrelid='purchases_one_success_per_product'::regclass);
      commit;"""
    r = subprocess.run(['psql','-Xq','-v','ON_ERROR_STOP=1','-c',q],cwd=root,env=env,capture_output=True,text=True)
    assert r.returncode != 0 and 'purchases_one_success_per_product_complete' in r.stderr,r.stderr
    assert before == fingerprint(), 'complete-index rollback probe changed history'
    print('PASS complete unique index independently rejects excluded-row duplication and rolls back transaction',flush=True)

finally:
    psql('-c', f'drop database if exists {db}', database='postgres')
