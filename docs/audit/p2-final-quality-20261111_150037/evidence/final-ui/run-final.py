from pathlib import Path
import subprocess,os,json,time
R=Path('/home/ganeshp8545/AyurPulse');O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']};E.update(EXPO_NO_DOTENV='1',EXPO_OFFLINE='1',EXPO_NO_TELEMETRY='1',CI='1',DENO_NO_UPDATE_CHECK='1',TZ='UTC',VITE_SUPABASE_URL='https://example.supabase.co',VITE_SUPABASE_ANON_KEY='ci-placeholder')
commands=[('p2-regression',['node','scripts/p2-quality-selftest.cjs'],R),('mobile-types',['node','mobile-app/node_modules/typescript/bin/tsc','--noEmit','-p','mobile-app/tsconfig.json'],R),('admin-build',['npm','run','build','--prefix','admin-panel'],R),('lint',['npm','run','lint','--prefix','tooling'],R),('whitespace',['git','diff','--check'],R),('signature',['node','mobile-app/scripts/verify-signature-selftest.js'],R)]
commands += [('p2-performance',['node','scripts/p2-performance-selftest.cjs'],R)]
commands += [(p.stem,['node',str(p)],R) for p in sorted(Path('admin-panel/scripts').glob('*-selftest.cjs'))]
commands += [(p.stem,['node',str(p)],R) for p in sorted(Path('mobile-app/scripts').glob('*notification*-selftest.cjs'))]
commands += [('secret-selftest',['node','scripts/secret-scan-selftest.mjs'],R)]
results=[]
for name,cmd,cwd in commands:
 start=time.monotonic()
 try:
  p=subprocess.run(cmd,cwd=cwd,env=E,capture_output=True,text=True,timeout=180);rc=p.returncode;output=p.stdout+p.stderr
 except subprocess.TimeoutExpired:rc=124;output='Timeout after 180 seconds'
 (O/(name+'-final.log')).write_text(output);results.append(dict(name=name,command=cmd,cwd=str(cwd),exit_code=rc,seconds=round(time.monotonic()-start,2)));(O/'final-results.json').write_text(json.dumps(results,indent=2)+'\n');print(name,rc,flush=True)
raise SystemExit(any(x['exit_code'] for x in results))
