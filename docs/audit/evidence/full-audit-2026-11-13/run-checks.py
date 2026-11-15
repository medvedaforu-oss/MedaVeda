"""Audit-only runner; does not alter application source or contact payment providers."""
import concurrent.futures, json, os, pathlib, re, subprocess, time
ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = pathlib.Path(__file__).resolve().parent
def redact(s):
    s = re.sub(r'(?s)-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----.*?-----END (?:[A-Z ]+)?PRIVATE KEY-----', '[PRIVATE KEY REDACTED]', s)
    return re.sub(r'\b(?:eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:sb_(?:publishable|secret)_|rzp_(?:live|test)_|sk_live_)[A-Za-z0-9_-]+)', lambda m:m[0][:4]+'[REDACTED]', s)
env = {k:v for k,v in os.environ.items() if k in {'PATH','HOME','DENO_DIR','LANG','TMPDIR','JAVA_HOME','ANDROID_HOME','ANDROID_SDK_ROOT','NODE_EXTRA_CA_CERTS','HTTPS_PROXY','HTTP_PROXY','ALL_PROXY','NO_PROXY'}}
env.update(CI='1', EXPO_NO_DOTENV='1', EXPO_NO_TELEMETRY='1', DO_NOT_TRACK='1', NO_COLOR='1', npm_config_cache='/tmp/medveda-npm-cache')
def run(job):
    name,cwd,cmd,timeout=job; start=time.monotonic()
    try:
        p=subprocess.run(cmd,cwd=ROOT/cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=timeout)
        rc,output=p.returncode,p.stdout
    except subprocess.TimeoutExpired as e:
        rc=124; output=e.stdout or ''; output=output.decode() if isinstance(output,bytes) else output; output+='\nTIMEOUT\n'
    except Exception as e: rc,output=127,str(e)
    result=dict(name=name,cwd=cwd or '.',command=cmd,exit=rc,seconds=round(time.monotonic()-start,2))
    (OUT/(name+'.log')).write_text('$ '+' '.join(cmd)+'\nCWD: '+(cwd or '.')+'\n'+redact(output)+f'\nEXIT_CODE={rc}\nDURATION_SECONDS={result["seconds"]}\n')
    (OUT/(name+'.result.json')).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result),flush=True)
    return result
jobs=[
 ('mobile-tsc','mobile-app',['./node_modules/.bin/tsc','--noEmit'],180),
 ('admin-tsc','admin-panel',['./node_modules/.bin/tsc','--noEmit','--incremental','false','-p','tsconfig.app.json'],180),
 ('admin-node-tsc','admin-panel',['./node_modules/.bin/tsc','--noEmit','--incremental','false','-p','tsconfig.node.json'],180),
 ('eslint','',['npm','run','lint','--prefix','tooling'],180),
 ('expo-doctor','mobile-app',['npx','--yes','expo-doctor'],180),
 ('expo-dependencies','mobile-app',['npx','--no-install','expo','install','--check'],180),
 ('expo-public-config','mobile-app',['npx','--no-install','expo','config','--type','public','--json'],180),
 ('expo-prebuild-config','mobile-app',['npx','--no-install','expo','config','--type','prebuild','--json'],180),
 ('eas-config','mobile-app',['npx','--yes','eas-cli','config','--platform','android','--profile','production','--non-interactive'],180),
 ('mobile-npm-audit','mobile-app',['npm','audit','--json'],180),
 ('admin-npm-audit','admin-panel',['npm','audit','--json'],180),
 ('tooling-npm-audit','tooling',['npm','audit','--json'],180),
 ('password-tests','mobile-app',['npm','run','test:password-recovery'],120),
 ('admin-tests','admin-panel',['npm','test'],120),
 ('secret-selftest','',['node','scripts/secret-scan-selftest.mjs'],60),
 ('secret-scan','',['node','scripts/scan-secrets.mjs'],120),
 ('website-links','website',['node','scripts/check-links.mjs'],120),
 ('database-suites','',['bash','supabase/tests/run-all.sh'],600),
 ('deno-check','',['deno','check','--cached-only','--config','supabase/deno.json',*[str(p.relative_to(ROOT)) for p in sorted((ROOT/'supabase/functions').glob('*/index.ts'))],'supabase/workers/validate-note-pdf.ts'],180),
]
excluded={'content-url-publication-selftest.cjs','play-cron-config-selftest.cjs','ucb-cron-config-selftest.cjs'}
for directory in ['mobile-app/scripts','admin-panel/scripts','supabase/tests','scripts','website/scripts']:
    for p in sorted((ROOT/directory).iterdir()):
        if p.suffix in {'.cjs','.mjs','.js'} and ('selftest' in p.name or '.test.' in p.name) and p.name not in excluded:
            rel=str(p.relative_to(ROOT));jobs.append(('test-'+rel.replace('/','_'),'',['node','--experimental-strip-types',rel],90))
unit=[str(p.relative_to(ROOT)) for p in (ROOT/'supabase/tests').glob('*test.ts') if p.name in {'play_catalog_unit_test.ts','play_catalog_api_test.ts','play_catalog_patch_diagnostic_test.ts','play_diagnostic_sanitization_review_test.ts','quarantine-worker-test.ts','upload-note-pdf-test.ts','pdf-validation-test.ts','upload-body-test.ts','note-pdf-hash-test.ts'}]
unit += [str(p.relative_to(ROOT)) for p in (ROOT/'supabase/functions/diagnose-play-pricing').glob('*test.ts')]
jobs.append(('deno-unit','',['deno','test','--cached-only','--config','supabase/deno.json','--allow-read','--allow-env',*unit],180))
for p in sorted((ROOT/'supabase/tests').glob('*selftest.ts')):
    jobs.append(('deno-'+p.stem,'',['deno','run','--cached-only','--config','supabase/deno.json','--allow-read','--allow-env',str(p.relative_to(ROOT))],90))
for f in ['run-host-tests.py','phase1b/run-tests.py','acquisition/run-tests.py','content/run-tests.py']:
    p=ROOT/'mobile-app/modules/medveda-offline-vault/tests'/f
    if p.exists():jobs.append(('vault-'+f.replace('/','-'),'',['python3',str(p.relative_to(ROOT))],180))
if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        results=list(ex.map(run,jobs))
    (OUT/'checks.json').write_text(json.dumps(results,indent=2)+'\n')
    print('DONE',len(results),'checks;',sum(x['exit']!=0 for x in results),'nonzero',flush=True)
