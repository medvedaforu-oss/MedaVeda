"""Credential-free local synthetic verification. Never contacts hosted services."""
from pathlib import Path
import os, subprocess, time, json
R = Path('/home/ganeshp8545/AyurPulse')
O = Path(__file__).resolve().parent
E = {k: os.environ[k] for k in ('PATH', 'HOME')}
E.update(PGHOST='/tmp/medveda-closure-pg/socket', PGPORT='55492', PGUSER='postgres',
         PGOPTIONS='-c search_path=public,extensions', TZ='UTC', EXPO_NO_DOTENV='1',
         EXPO_OFFLINE='1', EXPO_NO_TELEMETRY='1', CI='1')
jobs = [
 ('atomic', ['python3', str(O/'run-atomic.py')]),
 ('proof', ['python3', str(O/'run-proof.py')]),
 ('forward-ledger', ['python3', str(O/'run-forward-ledger.py')]),
 ('focused', ['python3', str(O/'run-checks-final.py')]),
 ('archives', ['python3', str(O/'validate-archives.py')]),
]
results=[]
for name, cmd in jobs:
    start=time.monotonic()
    with (O/(name+'.log')).open('w') as log:
        try:
            p=subprocess.run(cmd, cwd=R, env=E, stdout=log, stderr=subprocess.STDOUT, timeout=900)
            rc=p.returncode
        except subprocess.TimeoutExpired:
            rc=124
    results.append(dict(name=name, command=cmd, exit_code=rc, seconds=round(time.monotonic()-start,3)))
    (O/'verification-results.json').write_text(json.dumps(results,indent=2)+'\n')
    print(name, rc, flush=True)
raise SystemExit(any(x['exit_code'] for x in results))
