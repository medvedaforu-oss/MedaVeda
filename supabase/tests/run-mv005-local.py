"""MV005 synthetic production-baseline tests. Requires a disposable local PostgreSQL.
PGHOST=/tmp/mv003 PGPORT=55443 PGUSER=postgres python3 supabase/tests/run-mv005-local.py
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
    run(['python3', 'supabase/tests/mv005-transitions-local.py', 'fixed'])
    run(['node', 'supabase/tests/mv005-history-selftest.cjs'])
    run(['node', 'supabase/tests/mv003-entitlement-selftest.cjs'])
    psql('-f', 'supabase/tests/razorpay_snapshot_retry_checks.sql', stdout=subprocess.DEVNULL)
    print('PASS retained Razorpay scope, snapshot, discount, wallet, refund and replay SQL regressions', flush=True)
finally:
    psql('-c', f'drop database if exists {db}', database='postgres')
