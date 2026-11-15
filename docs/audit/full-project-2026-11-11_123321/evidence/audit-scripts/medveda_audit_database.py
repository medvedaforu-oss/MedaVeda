from pathlib import Path
import subprocess,os,json,time
r=Path('/tmp/medveda-full-audit-snapshot');o=Path(Path('/tmp/medveda-current-audit').read_text())/'evidence'; old=r/'docs/audit/evidence/b-to-c-atomic-20261111'
p=old/'rehearse.py';p.write_text(p.read_text().replace('/tmp/medveda-bc-atomic/socket','/tmp/medveda-full-audit-pg/socket').replace("'55479'","'55489'"))
env={'PATH':os.environ['PATH'],'HOME':os.environ['HOME'],'PGHOST':'/tmp/medveda-full-audit-pg/socket','PGPORT':'55489','PGUSER':'postgres','TZ':'UTC'}
results=[]
for name,cmd in [('atomic-rehearsal',['python3',str(p)]),('atomic-remaining',['python3',str(old/'rehearse-remaining.py')]),('archive-validation',['python3',str(old/'validate-compatible.py')]),('all-database-suites',['bash','supabase/tests/run-all.sh'])]:
 t=time.monotonic(); log=o/(name+'.log')
 with log.open('w') as f:
  try:q=subprocess.run(cmd,cwd=r,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=900);rc=q.returncode
  except subprocess.TimeoutExpired:rc=124
 results.append({'name':name,'command':cmd,'exit_code':rc,'log':log.name,'seconds':round(time.monotonic()-t,1)});(o/'database-checks.json').write_text(json.dumps(results,indent=2));print(name,rc,flush=True)
# Fresh outputs only, without replacing any earlier audit artifact.
import shutil
shutil.copytree(old,o/'reproduced-atomic',dirs_exist_ok=True)
