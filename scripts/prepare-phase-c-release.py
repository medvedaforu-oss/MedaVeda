"""Prepare local review artifacts only. Contains no deployment/provider invocation.
Uses exact files, static import closure and the pinned Phase B dependency lock.
"""
from pathlib import Path
import hashlib,json,re,shutil,tarfile,io
root=Path(__file__).resolve().parents[1]
out=root/'supabase/releases/phase-c-20261111';out.mkdir(parents=True,exist_ok=True)
def sha(data):return hashlib.sha256(data).hexdigest()
def write(rel,data):
 p=out/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
def closure(entry):
 pending=[entry];seen={};external=set()
 while pending:
  path=pending.pop().resolve();assert path.is_relative_to(root/'supabase/functions')
  rel=path.relative_to(root/'supabase').as_posix()
  if rel in seen:continue
  data=path.read_bytes();seen[rel]=sha(data)
  code=data.decode()
  imports=re.findall(r'(?:\bfrom\s*|\bimport\s*\(\s*)["\']([^"\']+)["\']',code)
  imports+=re.findall(r'\bimport\s*["\']([^"\']+)["\']',code)
  for spec in imports:
   if spec.startswith('.'):pending.append(path.parent/spec)
   else:external.add(spec)
 return dict(sorted(seen.items())),sorted(external)
entries={'create-play-order':True,'attach-external-token':True,'create-order-play-choice':True,
 'verify-payment':False,'razorpay-webhook':False,'verify-play-purchase':True,
 'report-external-transaction':False,'play-payment-worker':False,'sync-play-catalog':False,'get-note-url':True}
manifest={'status':'LOCAL REVIEW ONLY; purchases disabled; deployment and worker execution prohibited',
 'project':'xbvenkfmesugrbjuufyw','package':'in.medveda.app','functions':{},'migrations':[],
 'baseline_migrations':{},'mobile_sources':{},'excluded':['isolated_nonplay_test migration and entrypoints','future MV006 unique index','activation/deployment scripts']}
for file in ['deno.json','deno.lock']:write(file,(root/'supabase/releases/phase-b-20261111'/file).read_bytes())
for name,jwt in entries.items():
 files,external=closure(root/f'supabase/functions/{name}/index.ts')
 config=f'[functions.{name}]\nverify_jwt = {str(jwt).lower()}\n'.encode()
 for rel in files:write(rel,(root/'supabase'/rel).read_bytes())
 archive=out/f'artifacts/{name}-source.tar';archive.parent.mkdir(exist_ok=True)
 content={**{f'supabase/{rel}':(root/'supabase'/rel).read_bytes() for rel in files},
 'supabase/config.toml':config,'supabase/deno.json':(out/'deno.json').read_bytes(),'supabase/deno.lock':(out/'deno.lock').read_bytes()}
 with tarfile.open(archive,'w',format=tarfile.USTAR_FORMAT) as tar:
  for rel,data in sorted(content.items()):
   info=tarfile.TarInfo(rel);info.size=len(data);info.mode=0o644;info.mtime=0;tar.addfile(info,io.BytesIO(data))
 manifest['functions'][name]={'verify_jwt':jwt,'sources':files,'external_imports':external,
  'closure_sha256':sha(''.join(f'{v}  {k}\n' for k,v in files.items()).encode()),
  'archive':str(archive.relative_to(out)),'archive_sha256':sha(archive.read_bytes())}
# Existing website creation remains frozen B3; Phase C does not replace it.
manifest['website_create_order']={'candidate':'../phase-b-20261111/artifacts/B3-create-order-source.tar',
 'sha256':sha((root/'supabase/releases/phase-b-20261111/artifacts/B3-create-order-source.tar').read_bytes()),
 'reason':'Retain separately reviewed B3; dedicated Notes choice uses its own entrypoint.'}
write('config.toml','\n'.join(f'[functions.{n}]\nverify_jwt = {str(j).lower()}\n' for n,j in entries.items()).encode())
for name in ['20261110100000_mv003_razorpay_entitlement_commitment.sql','20261110120000_mv005_razorpay_order_transitions.sql','20261110130000_mv006_purchase_ownership_guard.sql','20261108100000_notes_choice_checkout.sql','20261109100000_billing_settlement_recovery.sql','20261111100000_phase_c_final_mv003_commitment.sql','20261111110000_phase_c_play_entitlement_snapshot.sql']:
 data=(root/'supabase/migrations'/name).read_bytes();write('migrations/'+name,data)
 manifest['migrations'].append({'path':'migrations/'+name,'sha256':sha(data)})
for p in sorted((root/'supabase/migrations').glob('*.sql')):
 if p.name.split('_')[0]<='20261104110000':manifest['baseline_migrations'][p.name]=sha(p.read_bytes())
# Pin the entire existing mobile source/config/asset input set without copying credentials/builds.
mobile=[root/'mobile-app/App.tsx',root/'mobile-app/index.ts']
for folder in ['src','plugins','assets']:mobile+=sorted((root/'mobile-app'/folder).rglob('*'))
for name in ['package.json','package-lock.json','app.config.js','app.json','eas.json','tsconfig.json','babel.config.js','metro.config.js','release-rules.pro']:
 p=root/'mobile-app'/name
 if p.exists():mobile.append(p)
for p in mobile:
 if p.is_file():manifest['mobile_sources'][str(p.relative_to(root))]=sha(p.read_bytes())
manifest['npm_lock']=json.loads((out/'deno.lock').read_text())
for name in ['sql-dependency-closure.json','sql-schema-inventory.json']:
 p=root/'docs/audit/evidence/phase-c-20261111'/name
 if p.exists():write('dependencies/'+name,p.read_bytes())
write('manifest.json',(json.dumps(manifest,indent=2)+'\n').encode())
paths=sorted(p for p in out.rglob('*') if p.is_file() and p.name!='checksums.sha256')
write('checksums.sha256',''.join(f'{sha(p.read_bytes())}  {p.relative_to(root)}\n' for p in paths).encode())
print(json.dumps({'functions':len(entries),'unique_typescript_files':len(list((out/'functions').rglob('*.ts'))),'sql':len(manifest['migrations']),'mobile_inputs':len(manifest['mobile_sources'])}))
