from pathlib import Path
import os,subprocess,json,time
R=Path('/home/ganeshp8545/AyurPulse');O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']}
E.update(PGHOST='/tmp/medveda-p1-pg/socket',PGPORT='55493',PGUSER='postgres',PGOPTIONS='-c search_path=public,extensions',DENO_NO_UPDATE_CHECK='1',EXPO_NO_DOTENV='1',EXPO_OFFLINE='1')
results=[]
for name,cmd in [('database',['bash','supabase/tests/run-all.sh']),('mv003-006',['python3','supabase/tests/run-mv006-local.py']),('phase-b',['python3',str(O/'run-phase-b-preserved.py')]),('phase-c',['python3',str(O/'run-phase-c-preserved.py')])]:
 start=time.monotonic()
 with (O/(name+'.log')).open('w') as log:
  try: rc=subprocess.run(cmd,cwd=R,env=E,stdout=log,stderr=subprocess.STDOUT,timeout=900).returncode
  except subprocess.TimeoutExpired: rc=124
 results.append(dict(name=name,command=cmd,exit_code=rc,seconds=round(time.monotonic()-start,2)))
 (O/'database-results.json').write_text(json.dumps(results,indent=2)+'\n')
 print(name,rc,flush=True)
raise SystemExit(any(x['exit_code'] for x in results))
