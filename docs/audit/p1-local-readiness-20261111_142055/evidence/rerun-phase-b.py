from pathlib import Path
import subprocess,os,json,time
O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']};E.update(PGHOST='/tmp/medveda-p1-pg/socket',PGPORT='55493',PGUSER='postgres',PGOPTIONS='-c search_path=public,extensions')
cmd=['python3',str(O/'run-phase-b-preserved.py')];start=time.monotonic()
with (O/'phase-b.log').open('w') as log:p=subprocess.run(cmd,cwd='/home/ganeshp8545/AyurPulse',env=E,stdout=log,stderr=subprocess.STDOUT,timeout=300)
(O/'phase-b-rerun.json').write_text(json.dumps(dict(command=cmd,exit_code=p.returncode,seconds=round(time.monotonic()-start,2)),indent=2))
print('phase-b rerun',p.returncode);raise SystemExit(p.returncode)
