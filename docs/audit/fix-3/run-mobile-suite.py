"""Run mobile checks from repository root; retain every command and failure."""
import pathlib,subprocess,json,sys,re
from concurrent.futures import ThreadPoolExecutor, as_completed
root=pathlib.Path(__file__).resolve().parents[3];label='final'
paths=[p for p in sorted((root/'mobile-app/scripts').iterdir()) if ('selftest' in p.name or p.name=='password-recovery.test.cjs') and p.suffix in ('.cjs','.mjs','.js','.py')]
paths+=sorted((root/'mobile-app/__tests__').glob('MOB-*.cjs'))
def check(p):
 cmd=(['python3'] if p.suffix=='.py' else ['node','--experimental-strip-types'])+[str(p.relative_to(root))]
 try:
  r=subprocess.run(cmd,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=180);code=r.returncode;txt=r.stdout
 except subprocess.TimeoutExpired as e:code=124;txt=str(e.stdout or '')+'\nTIMEOUT'
 return p,cmd,code,txt
logpath=root/'docs/audit/fix-3/final-mobile-tests.log'
prior=logpath.read_text() if logpath.exists() else ''
passed=set()
for match in re.finditer(r'^\$ (.*?)\n[\s\S]*?^EXIT (\d+)\n',prior,re.M):
 if match.group(2)=='0':passed.add(match.group(1).split()[-1])
prior_results=[{'name':str(p.relative_to(root)),'exit':0} for p in paths if str(p.relative_to(root)) in passed]
paths=[p for p in paths if str(p.relative_to(root)) not in passed]
serial=[p for p in paths if p.name=='android-bundle-validator-selftest.py']
paths=[p for p in paths if p not in serial]
result=prior_results
with (root/f'docs/audit/fix-3/{label}-mobile-tests.log').open('a') as f,ThreadPoolExecutor(max_workers=2) as pool:
 for p in serial:
  p,cmd,code,txt=check(p)
  f.write('\n$ '+' '.join(cmd)+'\n'+txt+f'\nEXIT {code}\n');f.flush();result.append({'name':str(p.relative_to(root)),'exit':code});print(p.name,code,flush=True)
 for future in as_completed([pool.submit(check,p) for p in paths]):
  p,cmd,code,txt=future.result()
  f.write('\n$ '+' '.join(cmd)+'\n'+txt+f'\nEXIT {code}\n');f.flush();result.append({'name':str(p.relative_to(root)),'exit':code});print(p.name,code,flush=True)
(root/f'docs/audit/fix-3/{label}-mobile-test-results.json').write_text(json.dumps(result,indent=2));print('TOTAL',len(result),'PASS',sum(r['exit']==0 for r in result),'FAIL',sum(r['exit']!=0 for r in result))
