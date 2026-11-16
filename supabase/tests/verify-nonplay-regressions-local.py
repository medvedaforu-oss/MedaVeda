"""Credential-free regression verification in a newly initialized local cluster."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import uuid

root = Path(__file__).resolve().parents[2]
output = root / 'docs/audit/evidence/nonplay-verification-20261116'
output.mkdir(parents=True, exist_ok=True)
postgres_bin = Path(subprocess.check_output(['pg_config', '--bindir'], text=True).strip())
environment = {
    'PATH': str(postgres_bin) + ':' + os.environ['PATH'],
    'DENO_DIR': os.environ.get('DENO_DIR', str(Path.home() / '.cache/deno')),
    'PGUSER': 'postgres',
    'PGOPTIONS': '-c search_path=public,extensions',
}
for executable in ['initdb', 'pg_ctl', 'psql', 'node', 'deno']:
    assert shutil.which(executable, path=environment['PATH']), executable + ' required'
cluster = Path(tempfile.mkdtemp(prefix='nonplay-security-pg-', dir='/tmp'))
data = cluster / 'data'
socket = cluster / 'socket'
socket.mkdir(mode=0o700)
environment.update(PGHOST=str(socket), PGPORT='55449')
results = []


def run(name, args, extra=None, timeout=240):
    started = time.monotonic()
    with (output / (name + '.log')).open('w') as log:
        try:
            result = subprocess.run(args, cwd=root, env={**environment, **(extra or {})},
                                    stdout=log, stderr=subprocess.STDOUT, timeout=timeout)
            code = result.returncode
        except subprocess.TimeoutExpired:
            code = 124
    entry = {'suite': name, 'exit': code, 'seconds': round(time.monotonic() - started, 2)}
    results.append(entry)
    (output / 'database-results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(entry), flush=True)
    return code


def sql(database, query):
    return subprocess.check_output(['psql', '-XqAt', '-v', 'ON_ERROR_STOP=1', '-d', database,
                                    '-c', query], env=environment, cwd=root, text=True).strip()


def prepare(database, migrations):
    sql('postgres', 'create database ' + database)
    files = [root / 'supabase/tests/support/supabase_stub.sql'] + migrations
    files.append(root / 'supabase/tests/support/seed.sql')
    with (output / (database.split('_')[0] + '-setup.log')).open('w') as log:
        for path in files:
            subprocess.run(['psql', '-Xq', '-v', 'ON_ERROR_STOP=1', '-d', database, '-f', str(path)],
                           cwd=root, env=environment, stdout=log, stderr=subprocess.STDOUT,
                           check=True, timeout=60)


baseline = [path for path in sorted((root / 'supabase/migrations').glob('*.sql'))
            if path.name.split('_')[0] <= '20261104110000']
phase_b = [root / 'supabase/migrations' / name for name in [
    '20261110100000_mv003_razorpay_entitlement_commitment.sql',
    '20261110120000_mv005_razorpay_order_transitions.sql',
    '20261110130000_mv006_purchase_ownership_guard.sql',
]]
databases = []
try:
    assert run('database-init', ['initdb', '-D', str(data), '-U', 'postgres', '--auth=trust',
                                 '--no-locale', '--encoding=UTF8']) == 0
    assert run('database-start', ['pg_ctl', '-D', str(data), '-l', str(cluster / 'postgres.log'),
                                  '-o', "-k " + str(socket) + " -p 55449 -c listen_addresses=''", 'start']) == 0
    assert sql('postgres', 'show data_directory') == str(data)
    assert sql('postgres', 'show listen_addresses') == ''
    assert sql('postgres', 'show unix_socket_directories') == str(socket)
    assert sql('postgres', "select string_agg(datname,',' order by datname) from pg_database where not datistemplate") == 'postgres'
    (output / 'database-identity-final.json').write_text(json.dumps({
        'data_directory': str(data), 'socket': str(socket), 'port': '55449',
        'listen_addresses': '', 'initial_databases': ['postgres'],
        'version': sql('postgres', 'show server_version'),
    }, indent=2) + '\n')
    print('VERIFIED fresh disposable cluster; private Unix socket; no TCP listener', flush=True)
    database = 'ap_ci_nonplay_' + uuid.uuid4().hex[:10]
    databases.append(database)
    prepare(database, baseline + [root / 'supabase/migrations' / name for name in [
        '20261109120000_isolated_nonplay_test.sql', '20261114050000_fix4_new_sales_disabled.sql']])
    assert sql(database, 'select new_orders_enabled from purchase_settings where id=true') == 'f'
    run('nonplay-sql-isolation', ['psql', '-Xq', '-v', 'ON_ERROR_STOP=1', '-d', database,
                                 '-f', 'supabase/tests/nonplay-test-isolation.sql'])
    run('nonplay-postgres-integration', ['deno', 'test', '--cached-only', '--allow-env', '--allow-run=psql',
                                       'supabase/tests/nonplay-test-integration.ts'], {'TEMPLATE_DB': database})
    assert sql(database, 'select new_orders_enabled from purchase_settings where id=true') == 'f'
    for name, migrations in [
        ('phase-b-handlers', baseline + phase_b),
        ('b-to-c-handlers', baseline + phase_b + [root / 'supabase/migrations' / filename for filename in [
            '20261108100000_notes_choice_checkout.sql', '20261109100000_billing_settlement_recovery.sql',
            '20261111100000_phase_c_final_mv003_commitment.sql']]),
        ('audit-batch1', sorted((root / 'supabase/migrations').glob('*.sql'))),
    ]:
        database = ('audit_batch1_' if name == 'audit-batch1' else 'mv003_') + uuid.uuid4().hex[:12]
        databases.append(database)
        prepare(database, migrations)
        run(name, ['node', 'supabase/tests/' + name + '-selftest.cjs'],
            {'PGDATABASE': database, 'WH_DB': database})
finally:
    if (data / 'postmaster.pid').exists():
        try:
            for database in databases:
                sql('postgres', 'drop database if exists ' + database)
        finally:
            run('database-stop', ['pg_ctl', '-D', str(data), '-m', 'fast', 'stop'])
if any(result['exit'] != 0 for result in results):
    raise SystemExit(1)
