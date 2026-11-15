"""Build the observed production baseline locally; exercise the additive test lane.
Never connects to Supabase. Supply an existing disposable localhost PostgreSQL server.
PGHOST=/tmp PGPORT=55441 PGUSER=postgres python3 supabase/tests/run-nonplay-test-local.py
"""
import json
import os
from pathlib import Path
import subprocess
import uuid

root = Path(__file__).resolve().parents[2]
assert os.environ.get('PGHOST') in ('/tmp', '127.0.0.1', 'localhost'), 'localhost required'
assert os.environ.get('PGPORT'), 'explicit disposable PostgreSQL port required'
database = 'ap_ci_nonplay_' + uuid.uuid4().hex[:10]
environment = {**os.environ, 'TEMPLATE_DB': database}

def run(args, **kwargs):
    return subprocess.run(args, cwd=root, env=environment, check=True, **kwargs)

def psql(*args, db=database, **kwargs):
    return run(['psql', '-Xq', '-v', 'ON_ERROR_STOP=1', '-d', db, *args], **kwargs)

try:
    psql('-c', f'create database {database}', db='postgres')
    psql('-f', 'supabase/tests/support/supabase_stub.sql', stdout=subprocess.DEVNULL)
    for migration in sorted((root / 'supabase/migrations').glob('*.sql')):
        stamp = migration.name.split('_')[0]
        if stamp.isdigit() and stamp <= '20261104110000':
            psql('-f', str(migration), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    psql('-f', 'supabase/tests/support/seed.sql', stdout=subprocess.DEVNULL)
    # Snapshot ALL rows before the new migration, not just empty payment tables.
    tables = ['orders', 'payments', 'purchases', 'products', 'wallet_ledger', 'referrals', 'first_discount_reservations', 'notes', 'profiles']
    query = "select jsonb_build_object(" + ','.join(
        f"'{t}',(select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public.{t} t)" for t in tables) + ')'
    def fingerprint():
        return subprocess.check_output(['psql', '-XqAt', '-d', database, '-c', query], env=environment, text=True).strip()
    before = fingerprint()
    run(['python3', 'supabase/tests/nonplay-test-repeatability.py'])
    psql('-f', 'supabase/migrations/20261109120000_isolated_nonplay_test.sql', stdout=subprocess.DEVNULL)
    assert fingerprint() == before, 'additive migration changed pre-existing data'
    print('PASS production-baseline-only migration: all pre-existing data unchanged; no November 8/9 Play migrations required', flush=True)
    psql('-f', 'supabase/tests/nonplay-test-isolation.sql')
    run(['deno', 'test', '--allow-env', '--allow-run=psql', 'supabase/tests/nonplay-test-integration.ts'])
    print(json.dumps({'result': 'PASS', 'local_database': database, 'hosted_calls': 0, 'provider_calls': 'mock HTTP only'}), flush=True)
finally:
    psql('-c', f'drop database if exists {database}', db='postgres')
