from pathlib import Path
import os,subprocess,json
R=Path('/home/ganeshp8545/AyurPulse');O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']};E.update(EXPO_NO_DOTENV='1',EXPO_OFFLINE='1',EXPO_NO_TELEMETRY='1',CI='1')
commands=[['node',f'mobile-app/scripts/{n}-selftest.cjs'] for n in ['auth-state-race','offline-owner','mv008-ownership','push-lifecycle','notification-account-hook','notification-routing','play-catalog-contract','notes-billing-choice','navigation-lazy','firebase-config']]
commands += [['node','admin-panel/scripts/p1-financial-ui-selftest.cjs'],['node','supabase/tests/p1-push-delivery-selftest.cjs'],['node','supabase/tests/p0-notification-selftest.cjs'],['node','mobile-app/node_modules/typescript/bin/tsc','--noEmit','-p','mobile-app/tsconfig.json'],['npm','run','lint','--prefix','tooling'],['git','diff','--check']]
results=[]
for i,cmd in enumerate(commands):
 p=subprocess.run(cmd,cwd=R,env=E,text=True,capture_output=True,timeout=120);name=f'final-affected-{i:02d}.log';(O/name).write_text(p.stdout+p.stderr)
 results.append(dict(command=cmd,cwd='.',exit_code=p.returncode,log=name));print('PASS' if p.returncode==0 else 'FAIL',' '.join(cmd),flush=True)
(O/'final-affected-results.json').write_text(json.dumps(results,indent=2)+'\n')
combined={tuple(x['command']):x for x in json.loads((O/'check-results.json').read_text())}
for x in results:combined[tuple(x['command'])]=x
(O/'final-check-results.json').write_text(json.dumps(list(combined.values()),indent=2)+'\n')
raise SystemExit(any(x['exit_code'] for x in combined.values()))
