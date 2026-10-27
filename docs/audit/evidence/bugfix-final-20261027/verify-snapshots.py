"""Reproduce local commit checks; requires installed dependencies and cached Deno modules.
Run: python3 docs/audit/evidence/bugfix-final-20261027/verify-snapshots.py full 22
For export-only corrections: replace `full 22` with commit numbers, e.g. `12 13`.
Use `full baseline-repeat` for the consolidated baseline. Artifacts go to /tmp.
Never runs hosted/database/provider tests. Evidence JSON is updated locally.
"""
import concurrent.futures,json,os,subprocess,sys,tarfile,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
EVIDENCE=ROOT/'docs/audit/evidence/bugfix-final-20261027'
REVISIONS=subprocess.check_output(['git','rev-list','--reverse','f9d6193..1630573'],cwd=ROOT,text=True).splitlines()
ENV={k:v for k,v in os.environ.items() if k in {'PATH','HOME','DENO_DIR','LANG','TMPDIR'}}
ENV.update(EXPO_NO_DOTENV='1',CI='1',EXPO_OFFLINE='1')
CORRECTION='Shared Expo AppEntry could resolve working-tree App. Export uses equivalent snapshot-local entry; entry is excluded from snapshot TypeScript inventory to avoid checking Expo implementation internals. Product sources and compiler options are unchanged.'
def run(label,full=False):
 revision='f9d6193' if label=='baseline-repeat' else REVISIONS[int(label)-1]
 out=Path('/tmp/medveda-verified-'+label);source=out/'source';source.mkdir(parents=True,exist_ok=True)
 archive=out/'source.tar'
 with archive.open('wb') as f:subprocess.run(['git','archive',revision],cwd=ROOT,stdout=f,check=True)
 with tarfile.open(archive) as tar:tar.extractall(source,filter='data')
 archive.unlink()
 for project in ['mobile-app','admin-panel','tooling']:
  if not (source/project/'node_modules').exists():(source/project/'node_modules').symlink_to(ROOT/project/'node_modules',target_is_directory=True)
 if not (source/'.git').exists():(source/'.git').symlink_to(ROOT/'.git',target_is_directory=True)
 with (source/'.gitignore').open('a') as f:f.write('\n**/node_modules\n')
 package=source/'mobile-app/package.json';data=json.loads(package.read_text());data['main']='./audit-entry.js';package.write_text(json.dumps(data,indent=2)+'\n')
 (source/'mobile-app/audit-entry.js').write_text("import registerRootComponent from 'expo/src/launch/registerRootComponent';\nimport App from './App';\nregisterRootComponent(App);\n")
 config=source/'mobile-app/tsconfig.json';data=json.loads(config.read_text());data['exclude'].append('audit-entry.js');config.write_text(json.dumps(data,indent=2)+'\n')
 if full:
  runner=source/'scripts/check-readiness-local.py'
  runner.write_text(runner.read_text().replace('max_workers=3','max_workers=2').replace('"--output-dir", str(output / "android-export")','"--max-workers", "2", "--output-dir", str(output / "android-export")'))
  command=['python3',str(source/'scripts/check-readiness-local.py'),'--full','--output',str(out)]
  cwd=source
 else:
  command=['node','node_modules/expo/bin/cli','export','--platform','android','--max-workers','2','--output-dir',str(out/'android-export')]
  cwd=source/'mobile-app'
 started=time.monotonic()
 with (out/'run.log').open('w') as log:result=subprocess.run(command,cwd=cwd,env=ENV,stdout=log,stderr=subprocess.STDOUT)
 path=EVIDENCE/('check-'+label+'.json')
 if full:data=json.loads((out/'results.json').read_text())
 else:
  data=json.loads(path.read_text());data['results'].append({'name':'android-export-exact-snapshot','exit':result.returncode,'seconds':round(time.monotonic()-started,2),'command':command})
 data['commit']=revision;data['androidSnapshotCorrection']=CORRECTION
 data['androidBundleBytes']=[{'file':f.name,'bytes':f.stat().st_size} for f in (out/'android-export').rglob('*.hbc')]
 if full:data['adminAssetBytes']=sum(f.stat().st_size for f in (out/'admin-dist/assets').rglob('*') if f.is_file())
 path.write_text(json.dumps(data,indent=2)+'\n')
 print(label,result.returncode,round(time.monotonic()-started,2),flush=True)
 if result.returncode:print((out/'run.log').read_text()[-4000:],flush=True)
 return result.returncode
if sys.argv[1]=='full':raise SystemExit(run(sys.argv[2],True))
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:results=list(pool.map(run,sys.argv[1:]))
raise SystemExit(int(any(results)))
