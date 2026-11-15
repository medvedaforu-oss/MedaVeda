"""Deterministic, credential-free Node regressions. No hosted service is used.

Run the real PostgreSQL regressions separately with an explicit /tmp Unix socket:
PGHOST=/tmp/mv003 PGPORT=55443 PGUSER=postgres python3 supabase/tests/run-mv006-local.py
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

root = Path(__file__).resolve().parents[2]
output = root / 'docs/audit/evidence/mv001-20261111'
output.mkdir(parents=True, exist_ok=True)
if '--choice-sql' in sys.argv:
    assert os.environ.get('PGHOST', '').startswith('/tmp/'), 'explicit /tmp Unix socket required'
    assert os.environ.get('PGPORT') and os.environ.get('PGUSER')
    database = 'ap_ci_mv001_' + uuid.uuid4().hex[:12]
    environment = {k: os.environ[k] for k in ('PATH', 'PGHOST', 'PGPORT', 'PGUSER')}
    environment.update(PGDATABASE=database, PGOPTIONS='-c search_path=public,extensions')
    def sql(*args, db=database):
        subprocess.run(['psql', '-Xq', '-v', 'ON_ERROR_STOP=1', '-d', db, *args],
                       cwd=root, env=environment, check=True)
    try:
        sql('-c', f'create database {database}', db='postgres')
        sql('-f', 'supabase/tests/support/supabase_stub.sql')
        for migration in sorted((root / 'supabase/migrations').glob('*.sql')):
            stamp = migration.name.split('_')[0]
            if stamp <= '20261104110000' or stamp in ('20261108100000', '20261109100000',
                    '20261110100000', '20261110120000', '20261110130000'):
                sql('-f', str(migration))
        sql('-f', 'supabase/tests/support/seed.sql')
        for suite in ('notes-choice-checkout', 'billing-settlement-recovery', 'razorpay_snapshot_retry_checks'):
            sql('-f', f'supabase/tests/{suite}.sql')
            print('PASS real local SQL:', suite, flush=True)
    finally:
        sql('-c', f'drop database if exists {database}', db='postgres')
    raise SystemExit(0)
mobile = '''mv007-billing-boundary mv008-ownership mv009-store mv010-options
mv011-accessibility mv012-history accessibility purchases notes-entitlement notes-open
list-states search-lazy-hook mv004-recovery payment-request payment-poll payment-verdict
checkout-security release-payments-disabled payment-routing razorpay-internal-test
notes-billing-choice pdf-lifecycle pdf-remote-retry payment-summary payment-provider
purchases-unavailable-ui video-data video-link video-tap'''.split()
backend = '''mv006-restoration mv004-recovery mv005-create-order recovery settle-timestamp
razorpay-security notes-choice-order billing-recovery-worker play-consumption
play-reconcile-fairness compensation-worker play-verification play-order
play-payment-worker'''.split()
commands = [['node', f'mobile-app/scripts/{name}-selftest.cjs'] for name in mobile]
commands += [['node', f'supabase/tests/{name}-selftest.cjs'] for name in backend]
commands += [['node', 'supabase/tests/google-reporting-selftest.cjs', '--production-only'],
             ['node', 'mobile-app/node_modules/typescript/bin/tsc', '--noEmit', '-p', 'mobile-app/tsconfig.json'],
             ['git', 'diff', '--check']]
results = []
for index, command in enumerate(commands):
    # No .env loading or hosted credentials. Each harness replaces its network,
    # auth and provider dependencies with in-memory fixtures.
    result = subprocess.run(command, cwd=root, env={'PATH': os.environ['PATH'], 'TZ': 'UTC'},
                            capture_output=True, text=True, timeout=120)
    log = f'local-{index:02d}.log'
    (output / log).write_text(result.stdout + result.stderr)
    results.append({'command': command, 'exit_code': result.returncode, 'log': log})
    print(('PASS' if result.returncode == 0 else 'FAIL'), ' '.join(command), flush=True)
(output / 'local-results.json').write_text(json.dumps(results, indent=2) + '\n')
raise SystemExit(any(row['exit_code'] for row in results))
