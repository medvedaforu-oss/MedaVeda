import pathlib,subprocess,os,json,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[3]; out=root/'docs/audit/fix-4'
env={k:os.environ[k] for k in ['PATH','HOME','LANG','TMPDIR','DENO_DIR'] if k in os.environ};env.update(CI='1',EXPO_NO_DOTENV='1')
entries=sorted((root/'supabase/functions').glob('*/index.ts'))+[root/'supabase/workers/validate-note-pdf.ts']
tests=['pdf-validation-test.ts','upload-body-test.ts','quarantine-worker-test.ts','note-pdf-hash-test.ts','play_catalog_unit_test.ts','play_diagnostic_sanitization_review_test.ts','upload-note-pdf-test.ts','play_catalog_api_test.ts','play_catalog_patch_diagnostic_test.ts']
jobs=[('mobile-tsc',['node','mobile-app/node_modules/typescript/bin/tsc','-p','mobile-app/tsconfig.json','--noEmit']),('eslint',['node','tooling/node_modules/eslint/bin/eslint.js','mobile-app/App.tsx','mobile-app/src','admin-panel/src']),('admin-tsc',['node','admin-panel/node_modules/typescript/bin/tsc','-p','admin-panel/tsconfig.app.json','--noEmit','--incremental','false']),('admin-node-tsc',['node','admin-panel/node_modules/typescript/bin/tsc','-p','admin-panel/tsconfig.node.json','--noEmit','--incremental','false']),('admin-tests',['npm','test','--prefix','admin-panel']),('deno-unit',['deno','test','--cached-only','--config','supabase/deno.json','--allow-read','--allow-env',*['supabase/tests/'+t for t in tests],'supabase/functions/diagnose-play-pricing/handler_test.ts','supabase/functions/diagnose-play-pricing/sanitize_test.ts']),('deno-check',['deno','check','--cached-only','--config','supabase/deno.json',*map(str,entries)]),('sql',['bash','supabase/tests/fix3-run-all.sh']),('password-recovery',['npm','run','test:password-recovery','--prefix','mobile-app']),('expo-doctor',['npm','exec','--prefix','mobile-app','--','expo-doctor'])]
jobs += [(x+'-npm-audit',['npm','audit','--json','--prefix',x]) for x in ['mobile-app','admin-panel','tooling']]
jobs += [('website-links',['node','website/scripts/check-links.mjs'])]
def run(job):
 name,cmd=job
 try:
  r=subprocess.run(cmd,cwd=root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=360);rc=r.returncode;txt=r.stdout
 except subprocess.TimeoutExpired as e:rc=124;txt=str(e.stdout or '')+'\nTIMEOUT'
 (out/('baseline-'+name+'.log')).write_text('$ '+' '.join(cmd)+'\n'+txt+f'\nEXIT {rc}\n')
 print(name,rc,flush=True);return dict(name=name,exit=rc)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: results=list(pool.map(run,jobs))
(out/'baseline-results.json').write_text(json.dumps(results,indent=2))
with (out/'baseline.log').open('w') as log:
 for r in results:log.write((out/('baseline-'+r['name']+'.log')).read_text()+'\n')
