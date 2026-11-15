from pathlib import Path
import os,subprocess,json,time
R=Path('/home/ganeshp8545/AyurPulse'); O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']};E.update(EXPO_NO_DOTENV='1',EXPO_OFFLINE='1',EXPO_NO_TELEMETRY='1',CI='1',DENO_NO_UPDATE_CHECK='1')
E.update(json.loads((R/'mobile-app/eas.json').read_text())['build']['production']['env'])
E.update(EAS_BUILD_PROFILE='production',EAS_BUILD_PLATFORM='android')
commands=[('expo-public',['node','node_modules/expo/bin/cli','config','--type','public','--json'],R/'mobile-app'),('expo-introspect',['node','node_modules/expo/bin/cli','config','--type','introspect','--json'],R/'mobile-app'),('autolinking',['node','node_modules/expo-modules-autolinking/bin/expo-modules-autolinking','resolve','--platform','android','--json'],R/'mobile-app'),('web-build',['node','node_modules/expo/bin/cli','export','--platform','web','--output-dir','/tmp/medveda-remaining-web-dist'],R/'mobile-app'),('admin-tests',['npm','test','--prefix','admin-panel'],R),('admin-types',['node','node_modules/typescript/bin/tsc','--noEmit','-p','tsconfig.app.json'],R/'admin-panel')]
commands += [('admin-build',['npm','run','build','--prefix','admin-panel'],R),('website-build',['node','scripts/build.mjs'],R/'website'),('website-links',['node','scripts/check-links.mjs'],R/'website')]
commands += [(f'edge-{f.parent.name}',['deno','check','--cached-only',str(f)],R) for f in sorted((R/'supabase/functions').glob('*/index.ts'))]
commands += [('edge-pdf-worker',['deno','check','--cached-only','supabase/workers/validate-note-pdf.ts'],R),('deno-security',['deno','test','--cached-only','--allow-env','supabase/tests/quarantine-worker-test.ts','supabase/tests/upload-note-pdf-test.ts','supabase/tests/play_catalog_unit_test.ts','supabase/tests/play_catalog_api_test.ts'],R)]
results=[]
for name,cmd,cwd in commands:
 start=time.monotonic()
 try:
  p=subprocess.run(cmd,cwd=cwd,env=E,text=True,capture_output=True,timeout=240); rc=p.returncode; stdout=p.stdout; stderr=p.stderr
 except subprocess.TimeoutExpired: rc=124;stdout='';stderr='Timed out after 240 seconds'
 (O/(name+'.log')).write_text(stdout+stderr)
 if name in ['expo-public','expo-introspect','autolinking'] and rc==0:(O/(name+'.json')).write_text(stdout)
 results.append(dict(name=name,command=cmd,cwd=str(cwd),exit_code=rc,seconds=round(time.monotonic()-start,2)))
 (O/'static-results.json').write_text(json.dumps(results,indent=2)+'\n');print(name,rc,flush=True)
raise SystemExit(any(x['exit_code'] for x in results))
