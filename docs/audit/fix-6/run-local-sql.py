#!/usr/bin/env python3
"""Existing full suite in fresh synthetic local PostgreSQL; never a hosted DB."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'docs/audit/fix-6/phase2/after'
scratch = Path(tempfile.mkdtemp(prefix='medveda-fix6-sql-'))
data = scratch / 'data'
socket = scratch / 'socket'
socket.mkdir()
pg = Path('/usr/lib/postgresql/17/bin')
env = {k: v for k, v in os.environ.items() if k in {'PATH', 'HOME', 'LANG', 'DENO_DIR'}}
env.update(PGHOST=str(socket), PGPORT='55436', PGUSER='postgres', EXPO_NO_DOTENV='1')
cmd = ['bash', 'supabase/tests/fix3-run-all.sh']
result = {'command': cmd, 'socket': str(socket), 'scope': 'all 85 canonical migrations, including owner-authorized Fix 5; no optional/quarantined files'}
start = time.monotonic()
started = False
try:
    with (OUT / 'postgres-init.log').open('w') as log:
        subprocess.run([str(pg / 'initdb'), '-D', str(data), '-U', 'postgres', '--no-locale', '-A', 'trust'], env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    with (OUT / 'postgres-start.log').open('w') as log:
        subprocess.run([str(pg / 'pg_ctl'), '-D', str(data), '-l', str(scratch / 'postgres.log'), '-o', f'-k {socket} -p 55436 -h ""', 'start'], env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    started = True
    with (OUT / 'full-sql.log').open('w') as log:
        try:
            r = subprocess.run(cmd, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=900)
            result['exit'] = r.returncode
        except subprocess.TimeoutExpired:
            result['exit'] = 124
        log.write('\nEXIT ' + str(result['exit']) + '\n')
finally:
    if started:
        subprocess.run([str(pg / 'pg_ctl'), '-D', str(data), '-m', 'fast', 'stop'], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    result['seconds'] = round(time.monotonic() - start, 2)
    (OUT / 'full-sql-result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result), flush=True)
