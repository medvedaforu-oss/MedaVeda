"""Freeze current approved-scope local inputs. Never deploys or contacts a service."""
from pathlib import Path
import hashlib,json,shutil,tarfile,gzip,io,re
root=Path(__file__).resolve().parents[3]
evidence=root/'docs/audit/google-play-catalog-20261124'
previous=root/'docs/audit/targeted-rollout-20261124/release-manifest.json'
out=evidence/'supported-price-release'
out.mkdir(exist_ok=True)
candidate=Path('/tmp/medveda-supported-price-release-20261124-r3')
assert not candidate.exists(), 'Do not overwrite an existing frozen candidate'
candidate.mkdir()
manifest=json.loads(previous.read_text())
paths={p for p in manifest['files'] if not p.startswith('admin-panel/dist/')}
paths.update(str(p.relative_to(root)) for p in (root/'admin-panel/dist').rglob('*') if p.is_file())
paths.update(['supabase/migrations/20261124142010_play_india_price_validation.sql',
 'supabase/tests/play_india_price_validation_checks.sql','supabase/tests/play-catalog-creation-selftest.cjs',
 'supabase/tests/play-catalog-worker-selftest.cjs','supabase/tests/run-all.sh'])
pending=[root/'supabase/functions/sync-play-catalog/index.ts']
while pending:
 p=pending.pop();rel=str(p.relative_to(root))
 if rel in paths:continue
 paths.add(rel)
 for imp in re.findall(r'(?:from\s*|import\s*)[\"\']([^\"\']+)[\"\']',p.read_text()):
  if imp.startswith('.'):pending.append((p.parent/imp).resolve())
for rel in paths:
 assert not any(x in rel.split('/') for x in ['.env','node_modules','.vercel','.git'])
 p=root/rel;assert p.is_file(),rel
 dest=candidate/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest.update({'candidate_root':str(candidate),'created_date_utc':'2026-11-24',
 'previous_archive_sha256':'c4bb909fa9fcb72f1563d48b96d057835bab97d9208cee435098ec7c2c247b87',
 'status':'HOLD','validation':'Local focused tests only; no live catalog acceptance',
 'files':{rel:sha(candidate/rel) for rel in sorted(paths)}})
manifest['pending_migrations'].append('20261124142010_play_india_price_validation.sql')
manifest['functions']['sync-play-catalog']={'verify_jwt':False,
 'reason':'Authoritative SQL India price validation before any Google request; existing private cron-secret authentication unchanged'}
manifest['blockers']=['Encrypted production backup and successful isolated DB/Auth/Storage/config restore',
 'Three ordered migration applications and coordinated matching Admin plus four named function deployments, separately approved',
 'Fresh runtime catalog listing/exact-SKU GET evidence and unresolved historical PATCH 403',
 'Explicit candidate/database and exact-SKU single-attempt Google provisioning approval; genuine readback acceptance',
 'Existing standalone tester/recovery configuration and all cron/payment activation approvals remain outstanding',
 'Earlier corrected release AAB/track prerequisite plus separately approved real-device license-purchase acceptance']
text=json.dumps(manifest,indent=2)+'\n'
(candidate/'manifest.json').write_text(text);(out/'release-manifest.json').write_text(text)
archive=out/'release-candidate.tar.gz'
with archive.open('wb') as f,gzip.GzipFile(fileobj=f,mode='wb',mtime=0) as z,tarfile.open(fileobj=z,mode='w') as tar:
 for p in sorted(candidate.rglob('*')):
  if p.is_file():
   data=p.read_bytes();i=tarfile.TarInfo(str(p.relative_to(candidate)));i.size=len(data);i.mode=0o644;i.mtime=0
   tar.addfile(i,io.BytesIO(data))
archive_sha=sha(archive)
(out/'release-candidate.sha256').write_text(archive_sha+'  release-candidate.tar.gz\n')
with tarfile.open(archive,'r:gz') as tar:
 for rel,digest in manifest['files'].items():
  assert sha(candidate/rel)==digest==sha(root/rel),rel
  assert hashlib.sha256(tar.extractfile(rel).read()).hexdigest()==digest,rel
 assert json.loads(tar.extractfile('manifest.json').read())==manifest
old=root/'docs/audit/targeted-rollout-20261124/release-candidate.tar.gz'
assert sha(old)==manifest['previous_archive_sha256'],'old candidate changed'
summary={'status':'HOLD','files_verified':len(paths),'archive_sha256':archive_sha,
 'previous_archive_unchanged':True,'source_and_archive_hashes_match':True,
 'functions':list(manifest['functions']),'pending_migrations':manifest['pending_migrations']}
(out/'verification.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
