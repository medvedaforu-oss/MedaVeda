import pathlib,subprocess,json,os,time
root=pathlib.Path(__file__).resolve().parents[4];out=pathlib.Path(__file__).resolve().parent
env={k:os.environ[k] for k in ('PATH','HOME','DENO_DIR','LANG') if k in os.environ};env.update(EXPO_NO_DOTENV='1',CI='1')
jobs=[('foundation',['python3','mobile-app/modules/medveda-offline-vault/tests/run-host-tests.py']),('control',['python3','mobile-app/modules/medveda-offline-vault/tests/phase1b/run-tests.py']),('acquisition',['python3','mobile-app/modules/medveda-offline-vault/tests/acquisition/run-tests.py']),('content',['python3','mobile-app/modules/medveda-offline-vault/tests/content/run-tests.py']),('preflight',['node','mobile-app/scripts/android-vault-preflight-selftest.cjs']),('live-profile',['node','mobile-app/scripts/razorpay-live-testing-selftest.cjs']),('play-guards',['node','mobile-app/scripts/release-payments-disabled-selftest.cjs']),('offline-download',['node','mobile-app/scripts/offline-download-selftest.cjs']),('offline-owner',['node','mobile-app/scripts/offline-owner-selftest.cjs']),('offline-license',['node','mobile-app/scripts/offline-license-storage-selftest.cjs']),('auth-race',['node','mobile-app/scripts/auth-state-race-selftest.cjs'])]
results=[]
for name,cmd in jobs:
 started=time.monotonic()
 with (out/('final-'+name+'.log')).open('w') as log:p=subprocess.run(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
 results.append(dict(name=name,command=cmd,exit=p.returncode,seconds=round(time.monotonic()-started,2),log='final-'+name+'.log'))
 (out/'final-results.json').write_text(json.dumps(results,indent=2));print(name,p.returncode,flush=True)
raise SystemExit(any(r['exit'] for r in results))
