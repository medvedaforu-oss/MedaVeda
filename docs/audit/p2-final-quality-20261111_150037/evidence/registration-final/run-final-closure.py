from pathlib import Path
import subprocess,os,json,time
R=Path('/home/ganeshp8545/AyurPulse');O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']};E.update(CI='1',EXPO_NO_DOTENV='1',EXPO_OFFLINE='1',EXPO_NO_TELEMETRY='1')
commands=[['node','mobile-app/scripts/p2-registration-selftest.cjs'],['node','mobile-app/node_modules/typescript/bin/tsc','--noEmit','-p','mobile-app/tsconfig.json'],['node','scripts/p2-quality-selftest.cjs'],['node','scripts/p2-performance-selftest.cjs'],['node','mobile-app/scripts/notification-preferences-selftest.cjs'],['git','diff','--check'],['npm','run','lint','--prefix','tooling']]
results=[]
for i,cmd in enumerate(commands):
 start=time.monotonic();p=subprocess.run(cmd,cwd=R,env=E,text=True,capture_output=True,timeout=180);name=f'closure-{i}.log';(O/name).write_text(p.stdout+p.stderr);results.append(dict(command=cmd,cwd=str(R),exit_code=p.returncode,log=name,seconds=round(time.monotonic()-start,2)));(O/'closure-results.json').write_text(json.dumps(results,indent=2)+'\n');print(cmd,p.returncode,flush=True)
raise SystemExit(any(r['exit_code'] for r in results))
