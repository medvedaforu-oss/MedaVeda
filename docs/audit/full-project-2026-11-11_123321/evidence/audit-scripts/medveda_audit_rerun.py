from pathlib import Path
import subprocess,os,json,time
r=Path('/tmp/medveda-full-audit-snapshot');o=Path(Path('/tmp/medveda-current-audit').read_text())/'evidence';env={'PATH':os.environ['PATH'],'HOME':os.environ['HOME'],'PGHOST':'/tmp','PGPORT':'55489','PGUSER':'postgres','TZ':'UTC','CI':'1'};results=[]
for name,cmd in [('all-database-supported-socket',['bash','supabase/tests/run-all.sh']),('closed-testing-supported',['node','mobile-app/scripts/closed-testing-selftest.cjs'])]:
 t=time.monotonic()
 with (o/(name+'.log')).open('w') as f:
  p=subprocess.run(cmd,cwd=r,env=env,text=True,stdout=f,stderr=subprocess.STDOUT,timeout=180)
 results.append({'name':name,'command':cmd,'cwd':str(r),'exit_code':p.returncode,'seconds':round(time.monotonic()-t,1),'log':name+'.log'});(o/'rerun-checks.json').write_text(json.dumps(results,indent=2));print(name,p.returncode,flush=True)
