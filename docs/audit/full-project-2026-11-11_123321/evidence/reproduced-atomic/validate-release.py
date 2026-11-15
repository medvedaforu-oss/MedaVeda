from pathlib import Path
import hashlib,json,re,subprocess,tempfile,tarfile,os
r=Path(__file__).resolve().parents[4];out=r/'supabase/releases/phase-c-20261111';e=r/'docs/audit/evidence/b-to-c-atomic-20261111'
manifest=json.loads((out/'manifest.json').read_text());results=[]
for name,item in manifest['functions'].items():
 with tempfile.TemporaryDirectory(prefix='medveda-phase-c-') as tmp:
  with tarfile.open(out/item['archive']) as tar:tar.extractall(tmp,filter='data')
  base=Path(tmp)/'supabase'
  for rel,digest in item['sources'].items():assert hashlib.sha256((base/rel).read_bytes()).hexdigest()==digest
  p=subprocess.run(['deno','check','--cached-only',f'functions/{name}/index.ts'],cwd=base,env={'PATH':os.environ['PATH'],'HOME':os.environ['HOME']},capture_output=True,text=True,timeout=120)
  (e/f'deno-{name}.log').write_text(p.stdout+p.stderr)
  results.append({'function':name,'exit_code':p.returncode,'files':len(item['sources'])})
(e/'archive-results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results));assert all(x['exit_code']==0 for x in results)
