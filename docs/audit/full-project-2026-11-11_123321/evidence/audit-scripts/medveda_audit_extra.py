import subprocess,os,json,time
from pathlib import Path
r=Path('/tmp/medveda-full-audit-snapshot');o=Path(Path('/tmp/medveda-current-audit').read_text())/'evidence';env={'PATH':os.environ['PATH'],'HOME':os.environ['HOME'],'CI':'1','EXPO_NO_TELEMETRY':'1','TZ':'UTC'}
cmds=[('edge-check',['bash','-c','for f in supabase/functions/*/index.ts supabase/workers/validate-note-pdf.ts; do deno check --cached-only "$f" || exit; done']),('deno-tests',['deno','test','--cached-only','--allow-env','supabase/tests/quarantine-worker-test.ts','supabase/tests/upload-note-pdf-test.ts','supabase/tests/play_catalog_unit_test.ts','supabase/tests/play_catalog_api_test.ts','supabase/tests/pdf-validation-test.ts','supabase/tests/upload-body-test.ts','supabase/tests/note-pdf-hash-test.ts']),('mobile-export',['node','mobile-app/node_modules/expo/bin/cli','export','--platform','web','--output-dir','/tmp/medveda-audit-web-export']),('android-gradle',['bash','mobile-app/android/gradlew','--offline','-p','mobile-app/android',':app:bundleRelease']),('admin-audit',['npm','audit','--prefix','admin-panel','--omit=dev','--json']),('mobile-audit',['npm','audit','--prefix','mobile-app','--omit=dev','--json'])]
results=[]
for name,cmd in cmds:
 cwd=r/'mobile-app' if name=='mobile-export' else r
 if name=='mobile-export':cmd=['node','node_modules/expo/bin/cli','export','--platform','web','--output-dir','/tmp/medveda-audit-web-export']
 t=time.monotonic()
 try:p=subprocess.run(cmd,cwd=cwd,env=env,capture_output=True,text=True,timeout=240);rc=p.returncode;log=p.stdout+p.stderr
 except subprocess.TimeoutExpired as e:rc=124;log=str(e)
 (o/(name+'.log')).write_text(log); results.append({'name':name,'command':cmd,'cwd':str(cwd),'exit_code':rc,'log':name+'.log','seconds':round(time.monotonic()-t,1)});(o/'extra-checks.json').write_text(json.dumps(results,indent=2));print(name,rc,flush=True)
