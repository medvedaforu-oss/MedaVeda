#!/usr/bin/env python3
"""Offline regression checks only. No credentials, hosted operations or native acceptance."""
import json,os,pathlib,subprocess,time
root=pathlib.Path(__file__).resolve().parents[1];output=root/'docs/audit/evidence/remaining-bugs-20261112';output.mkdir(parents=True,exist_ok=True)
env={k:os.environ[k] for k in ('PATH','HOME','DENO_DIR','LANG','TMPDIR') if k in os.environ};env.update(EXPO_NO_DOTENV='1',CI='1')
jobs=[]
for f in ['remaining-audit-selftest.cjs','audit-reminder-service-selftest.cjs','audit-navigation-selftest.cjs','audit-icon-controls-selftest.cjs','audit-firebase-profile-selftest.cjs','navigation-lazy-selftest.cjs','staging-build-selftest.cjs']:
 jobs.append((f,['node','mobile-app/scripts/'+f],{}))
for f in ['audit-login-body-selftest.cjs','audit-push-policy-selftest.cjs','p1-push-delivery-selftest.cjs','mv004-recovery-selftest.cjs','p0-notification-selftest.cjs']:
 jobs.append((f,['node','supabase/tests/'+f],{}))
for f in ['audit-push-policy-selftest.cjs','p1-push-delivery-selftest.cjs','p0-notification-selftest.cjs']:
 jobs.append(('candidate-'+f,['node','supabase/tests/'+f],{'AUDIT_PUSH_ROOT':'supabase/releases/audit-remaining-20261112/candidate/send-push-notification','P0_RELEASE_ROOT':'supabase/releases/audit-remaining-20261112/candidate/send-push-notification'}))
jobs.append(('candidate-recovery',['node','supabase/tests/mv004-recovery-selftest.cjs'],{'AUDIT_VERIFY_ROOT':'supabase/releases/audit-remaining-20261112/candidate/verify-payment'}))
jobs += [('settings',['node','admin-panel/scripts/audit-settings-selftest.cjs'],{}),('website-verification',['node','website/scripts/account-verified-selftest.cjs'],{}),('website-links',['node','website/scripts/check-links.mjs'],{}),('mobile-tsc',['node','mobile-app/node_modules/typescript/bin/tsc','-p','mobile-app/tsconfig.json','--noEmit','--incremental','false'],{}),('admin-tsc',['node','admin-panel/node_modules/typescript/bin/tsc','-p','admin-panel/tsconfig.app.json','--noEmit','--incremental','false'],{}),('admin-node-tsc',['node','admin-panel/node_modules/typescript/bin/tsc','-p','admin-panel/tsconfig.node.json','--noEmit','--incremental','false'],{}),('lint',['node','tooling/node_modules/eslint/bin/eslint.js','mobile-app/App.tsx','mobile-app/src','admin-panel/src'],{})]
entries=sorted((root/'supabase/functions').glob('*/index.ts'))+[root/'supabase/workers/validate-note-pdf.ts']
jobs.append(('deno-workspace',['deno','check','--cached-only','--config','supabase/deno.json',*map(str,entries)],{}))
release=root/'supabase/releases/audit-remaining-20261112'
entries=sorted((release/'candidate').glob('*/functions/*/index.ts'))
jobs.append(('deno-candidates',['deno','check','--cached-only','--config','supabase/releases/audit-batch1-20261112/deno.json',*map(str,entries)],{}))
for f in ['run-host-tests.py','phase1b/run-tests.py','acquisition/run-tests.py']:
 jobs.append(('vault-'+f.replace('/','-'),['python3','mobile-app/modules/medveda-offline-vault/tests/'+f],{}))
results=[]
for name,command,extra in jobs:
 started=time.monotonic()
 with (output/('final-'+name+'.log')).open('w') as log:
  p=subprocess.run(command,cwd=root,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT)
 results.append(dict(name=name,command=command,env=extra,exit=p.returncode,seconds=round(time.monotonic()-started,2)))
 (output/'verification-results.json').write_text(json.dumps(results,indent=2))
 print(name,p.returncode,flush=True)
raise SystemExit(any(r['exit'] for r in results))
