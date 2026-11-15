import subprocess,pathlib,os,json
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/audit/fix-4'
assert os.environ.get('PGHOST')=='/tmp/medveda-fix4-socket'
results=[]
for phase,db in [('before','fix4_before'),('after','fix4_current')]:
 for name in ['MOB-17','BACK-11','BACK-13','ADM-03','ADM-08','BACK-08']:
  cmd=['psql','-X','-v','ON_ERROR_STOP=1','-d',db,'-f',str(out/'tests'/f'{name}.sql')]
  r=subprocess.run(cmd,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  (out/phase/f'{name}.log').write_text('$ '+' '.join(cmd)+'\n'+r.stdout+f'\nEXIT {r.returncode}\n')
  results.append(dict(phase=phase,id=name,exit=r.returncode));print(phase,name,r.returncode,flush=True)
(out/'sql-finding-results.json').write_text(json.dumps(results,indent=2))
