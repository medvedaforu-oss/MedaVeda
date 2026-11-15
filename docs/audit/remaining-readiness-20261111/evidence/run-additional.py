from pathlib import Path
import os,subprocess,json,time
R=Path('/home/ganeshp8545/AyurPulse');O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']};E.update(EXPO_OFFLINE='1',EXPO_NO_DOTENV='1',CI='1',DENO_NO_UPDATE_CHECK='1',npm_config_fetch_retries='0',npm_config_fetch_timeout='15000')
commands=[('tooling-secrets',['npm','run','test:secrets','--prefix','tooling'],R),('quality',['node','scripts/p2-quality-selftest.cjs'],R),('performance',['node','scripts/p2-performance-selftest.cjs'],R),('admin-labels',['node','scripts/p2-admin-labels-selftest.cjs'],R)]
commands += [(p.stem,['node','--experimental-strip-types',str(p.relative_to(R))],R) for p in sorted((R/'admin-panel/scripts').glob('*selftest.*'))]
commands += [('audit-'+area,['npm','audit','--omit=dev','--json'],R/area) for area in ['mobile-app','admin-panel','tooling']]
commands += [('doctor',['npm','exec','--offline','--yes','--package=expo-doctor','--','expo-doctor'],R/'mobile-app')]
results=[]
for name,cmd,cwd in commands:
 start=time.monotonic()
 try:
  p=subprocess.run(cmd,cwd=cwd,env=E,capture_output=True,text=True,timeout=120);rc=p.returncode;output=p.stdout+p.stderr
 except subprocess.TimeoutExpired:rc=124;output='Timed out'
 (O/(name+'.log')).write_text(output)
 results.append(dict(name=name,command=cmd,cwd=str(cwd),exit_code=rc,seconds=round(time.monotonic()-start,2)))
 (O/'additional-results.json').write_text(json.dumps(results,indent=2)+'\n');print(name,rc,flush=True)
