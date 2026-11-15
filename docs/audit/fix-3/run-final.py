import pathlib,subprocess,os,json,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/audit/fix-3'
env={k:os.environ[k] for k in ['PATH','HOME','LANG','TMPDIR','DENO_DIR'] if k in os.environ};env.update(CI='1',EXPO_NO_DOTENV='1')
entries=sorted((root/'supabase/functions').glob('*/index.ts'))+[root/'supabase/workers/validate-note-pdf.ts',root/'supabase/functions/report-external-transaction/index.fix3.ts',root/'supabase/functions/_shared/paymentQueueFix3.ts']
tests=['pdf-validation-test.ts','upload-body-test.ts','quarantine-worker-test.ts','note-pdf-hash-test.ts','play_catalog_unit_test.ts','play_diagnostic_sanitization_review_test.ts','upload-note-pdf-test.ts','play_catalog_api_test.ts','play_catalog_patch_diagnostic_test.ts']
jobs=[('mobile-tsc',['node','mobile-app/node_modules/typescript/bin/tsc','-p','mobile-app/tsconfig.json','--noEmit']),('eslint',['node','tooling/node_modules/eslint/bin/eslint.js','mobile-app/App.tsx','mobile-app/src','admin-panel/src']),('admin-tsc',['node','admin-panel/node_modules/typescript/bin/tsc','-p','admin-panel/tsconfig.app.json','--noEmit','--incremental','false']),('admin-node-tsc',['node','admin-panel/node_modules/typescript/bin/tsc','-p','admin-panel/tsconfig.node.json','--noEmit','--incremental','false']),('admin-tests',['npm','test','--prefix','admin-panel']),('deno-unit',['deno','test','--cached-only','--config','supabase/deno.json','--allow-read','--allow-env',*['supabase/tests/'+t for t in tests],'supabase/functions/diagnose-play-pricing/handler_test.ts','supabase/functions/diagnose-play-pricing/sanitize_test.ts']),('deno-check',['deno','check','--cached-only','--config','supabase/deno.json',*map(str,entries)]),('password-recovery',['npm','run','test:password-recovery','--prefix','mobile-app']),('website-links',['node','website/scripts/check-links.mjs']),('website-auth',['node','website/scripts/account-verified-selftest.cjs'])]
def run(job):
 name,cmd=job
 previous=out/('final-'+name+'.log')
 if previous.exists() and previous.read_text().endswith('EXIT 0\n'):
  print(name,'saved PASS',flush=True);return dict(name=name,exit=0)
 try:
  r=subprocess.run(cmd,cwd=root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=360);rc=r.returncode;txt=r.stdout
 except subprocess.TimeoutExpired as e:rc=124;txt=str(e.stdout or '')+'\nTIMEOUT'
 (out/('final-'+name+'.log')).write_text('$ '+' '.join(cmd)+'\n'+txt+f'\nEXIT {rc}\n');print(name,rc,flush=True);return dict(name=name,exit=rc)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(run,jobs))
(out/'final-results.json').write_text(json.dumps(results,indent=2))
