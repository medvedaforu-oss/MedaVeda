import pathlib,subprocess,json,concurrent.futures,os
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/audit/fix-4'
paths=[p for p in sorted((root/'mobile-app/scripts').iterdir()) if ('selftest' in p.name or p.name=='password-recovery.test.cjs') and p.suffix in ('.cjs','.mjs','.js','.py')]
paths+=sorted((root/'mobile-app/__tests__').glob('MOB-*.cjs'))
env=dict(os.environ);env.update(CI='1',EXPO_NO_DOTENV='1')
def run(p):
 cmd=(['python3'] if p.suffix=='.py' else ['node','--experimental-strip-types'])+[str(p.relative_to(root))]
 try:
  r=subprocess.run(cmd,cwd=root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=240);rc=r.returncode;txt=r.stdout
 except subprocess.TimeoutExpired as e:rc=124;txt=str(e.stdout or '')+'\nTIMEOUT'
 return dict(name=str(p.relative_to(root)),exit=rc), '$ '+' '.join(cmd)+'\n'+txt+f'\nEXIT {rc}\n'
results=[]
with (out/'final-mobile-fresh.log').open('w') as f,concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for row,log in pool.map(run,paths):
  results.append(row);f.write(log+'\n');f.flush();print(row['name'],row['exit'],flush=True)
(out/'final-mobile-fresh-results.json').write_text(json.dumps(results,indent=2))
print('TOTAL',len(results),'PASS',sum(x['exit']==0 for x in results),'FAIL',sum(x['exit']!=0 for x in results),flush=True)
