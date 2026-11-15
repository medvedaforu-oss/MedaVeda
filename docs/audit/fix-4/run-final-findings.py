import subprocess,pathlib,os,json
assert os.environ.get('PGHOST')=='/tmp/medveda-fix4-socket'
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/audit/fix-4';result=[]
for phase,db in [('before','fix4_before'),('after','fix4_final')]:
 for name in ['MOB-17','ADM-03','ADM-08','BACK-08','BACK-11','BACK-13']:
  cmd=['psql','-X','-v','ON_ERROR_STOP=1','-d',db,'-f',str(out/'tests'/f'{name}.sql')]
  r=subprocess.run(cmd,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  path=out/phase/f'{name}.log'
  if path.exists():path.rename(out/phase/f'{name}-earlier.log')
  suffix='\nEXPECTED OPEN FINDING: wallet candidate quarantined after failure cap. This red canonical test is not fixed.\n' if name.startswith('BACK-1') else ''
  path.write_text('$ '+' '.join(cmd)+'\n'+r.stdout+f'\nEXIT {r.returncode}\n'+suffix)
  result.append(dict(phase=phase,id=name,exit=r.returncode));print(phase,name,r.returncode,flush=True)
(out/'final-sql-findings-results.json').write_text(json.dumps(result,indent=2))
