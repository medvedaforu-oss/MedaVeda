"""Offline deterministic source archives and complete import/hash manifests. No deployment."""
from pathlib import Path
import re,json,hashlib,tarfile,io
r=Path('/home/ganeshp8545/AyurPulse');base=r/'supabase/releases/phase-b-20261111';e=r/'docs/audit/evidence/phase-b-20261111'
sha=lambda b:hashlib.sha256(b).hexdigest()
manifest={'target':'xbvenkfmesugrbjuufyw','baseline_latest_migration':'20261104110000','candidates':{},'required_migrations':{}}
for m in ['20261110100000_mv003_razorpay_entitlement_commitment.sql','20261110120000_mv005_razorpay_order_transitions.sql','20261110130000_mv006_purchase_ownership_guard.sql']:
 manifest['required_migrations'][m]=sha((r/'supabase/migrations'/m).read_bytes())
for label,slug in [('B1','verify-payment'),('B2','razorpay-webhook'),('B3','create-order')]:
 entry=base/'functions'/slug/'index.ts';todo=[entry];seen={};external=set()
 while todo:
  p=todo.pop().resolve()
  if p in seen:continue
  assert p.is_relative_to(base/'functions') and p.is_file(),p
  text=p.read_text();imports=re.findall(r'(?:from\s*|import\s*\()\s*[\"\']([^\"\']+)[\"\']',text)
  seen[p]={'sha256':sha(p.read_bytes()),'imports':imports}
  for imp in imports:
   if imp.startswith('.'):todo.append((p.parent/imp).resolve())
   else:external.add(imp)
 assert external=={'npm:@supabase/supabase-js@2.118.0'}
 sources={str(p.relative_to(base)):v for p,v in sorted(seen.items())}
 entries={f'supabase/{p.relative_to(base)}':p.read_bytes() for p in seen}
 entries['supabase/config.toml']=f'[functions.{slug}]\nverify_jwt = {str(slug=="create-order").lower()}\n'.encode()
 for n in ['deno.json','deno.lock']:entries['supabase/'+n]=(base/n).read_bytes()
 archive=base/'artifacts'/f'{label}-{slug}-source.tar';archive.parent.mkdir(exist_ok=True)
 with tarfile.open(archive,'w',format=tarfile.USTAR_FORMAT) as tar:
  for name,body in sorted(entries.items()):
   info=tarfile.TarInfo(name);info.size=len(body);info.mode=0o644;info.mtime=0;tar.addfile(info,io.BytesIO(body))
 closure=''.join(f"{v['sha256']}  {p}\n" for p,v in sources.items())
 built=Path('/tmp/medveda-phase-b-build')/slug/'index.js'
 manifest['candidates'][label]={'slug':slug,'verify_jwt':slug=='create-order','entrypoint_sha256':sources[f'functions/{slug}/index.ts']['sha256'],'sources':sources,'closure_sha256':sha(closure.encode()),'external_imports':sorted(external),'archive':str(archive.relative_to(r)),'archive_sha256':sha(archive.read_bytes()),'local_javascript_build_sha256':sha(built.read_bytes())}
 manifest['candidates'][label]['required_environment']=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','APP_ENV=production','RAZORPAY_KEY_ID (live prefix)','RAZORPAY_KEY_SECRET']+(['RAZORPAY_WEBHOOK_SECRET','RAZORPAY_WEBHOOK_PREVIOUS_SECRET (optional)'] if label=='B2' else [])+(['UCB_SENTRY_DSN (optional alert transport)'] if label!='B3' else [])
graph=json.loads(Path('/tmp/phase-b-dependency-graph.json').read_text())
manifest['npm_closure']={k:{'dependencies':v['dependencies'],'integrity':json.loads((base/'deno.lock').read_text())['npm'][k]['integrity']} for k,v in graph['npmPackages'].items()}
manifest['shared_configuration']={n:sha((base/n).read_bytes()) for n in ['config.toml','deno.json','deno.lock']}
(base/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
checks={str(p.relative_to(r)):sha(p.read_bytes()) for p in sorted(base.rglob('*')) if p.is_file() and p.name!='checksums.sha256'}
(base/'checksums.sha256').write_text(''.join(f'{digest}  {p}\n' for p,digest in checks.items()))
print('PASS complete import closures, nine locked npm packages, deterministic source archives and hashes')
