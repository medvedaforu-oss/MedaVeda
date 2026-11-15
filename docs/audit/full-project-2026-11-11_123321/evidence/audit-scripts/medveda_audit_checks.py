from pathlib import Path
import subprocess,os,json,concurrent.futures,time,shutil
r=Path('/home/ganeshp8545/AyurPulse');o=Path('/tmp/medveda-current-audit').read_text();out=Path(o)/'evidence'; snap=Path('/tmp/medveda-full-audit-snapshot')
shutil.copytree(r,snap,ignore=shutil.ignore_patterns('node_modules','.git','.env*','.vercel','.codex','.aws','.agents','.expo','.gradle','dist','build','full-project-*'),dirs_exist_ok=True)
for d in ['mobile-app','admin-panel','tooling']:
 (snap/d/'node_modules').symlink_to(r/d/'node_modules',target_is_directory=True)
env={'PATH':os.environ['PATH'],'HOME':os.environ['HOME'],'TZ':'UTC','CI':'1','EXPO_NO_TELEMETRY':'1'}
cmds=[('mobile-types',['node','mobile-app/node_modules/typescript/bin/tsc','--noEmit','-p','mobile-app/tsconfig.json']),('lint',['npm','run','lint','--prefix','tooling']),('admin-build',['npm','run','build','--prefix','admin-panel']),('admin-tests',['npm','test','--prefix','admin-panel']),('website-build',['node','website/scripts/build.mjs']),('website-links',['node','website/scripts/check-links.mjs']),('secrets-selftest',['node','scripts/secret-scan-selftest.mjs'])]
# Local selftests: inspect allowed scripts; no hosted integration scripts included.
for folder in ['mobile-app/scripts','supabase/tests']:
 for p in sorted((r/folder).glob('*selftest.cjs')):
  if p.name=='ui-harness.cjs':continue
  args=['node',str(p.relative_to(r))]
  if p.name=='google-reporting-selftest.cjs': args+=['--production-only']
  cmds.append((folder.replace('/','-')+'-'+p.stem,args))
for p in sorted((r/'mobile-app/scripts').glob('*selftest.mjs')):
 cmds.append(('mobile-'+p.stem,['node','--experimental-strip-types',str(p.relative_to(r))]))
def check(item):
 name,cmd=item; t=time.monotonic()
 try:
  p=subprocess.run(cmd,cwd=snap,env=env,capture_output=True,text=True,timeout=240); rc=p.returncode; log=p.stdout+p.stderr
 except subprocess.TimeoutExpired as e: rc=124;log=str(e)
 (out/(name+'.log')).write_text(log)
 res={'name':name,'command':cmd,'cwd':str(snap),'exit_code':rc,'seconds':round(time.monotonic()-t,2),'log':name+'.log'}
 print(('PASS ' if rc==0 else 'FAIL ')+name+' '+str(rc),flush=True); return res
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(check,cmds))
(out/'checks.json').write_text(json.dumps(results,indent=2));print('DONE '+str(len(results)),flush=True)
