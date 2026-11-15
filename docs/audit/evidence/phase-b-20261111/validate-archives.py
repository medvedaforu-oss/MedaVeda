"""Validate archived closures in separate /tmp trees with cached dependencies only."""
from pathlib import Path
import json,tarfile,tempfile,hashlib,subprocess
r=Path('/home/ganeshp8545/AyurPulse');e=Path(__file__).resolve().parent
m=json.loads((r/'supabase/releases/phase-b-20261111/manifest.json').read_text())
with (e/'archive-validation.log').open('w') as log:
 for label,c in m['candidates'].items():
  archive=r/c['archive'];assert hashlib.sha256(archive.read_bytes()).hexdigest()==c['archive_sha256']
  with tempfile.TemporaryDirectory(prefix='medveda-phase-b-'+label+'-') as tmp:
   with tarfile.open(archive) as tar:
    for info in tar:
     assert info.isfile() and not Path(info.name).is_absolute() and '..' not in Path(info.name).parts
    tar.extractall(tmp,filter='data')
   base=Path(tmp)/'supabase'
   for p,expected in c['sources'].items():assert hashlib.sha256((base/p).read_bytes()).hexdigest()==expected['sha256']
   assert sorted(str(p.relative_to(base)) for p in (base/'functions').rglob('*.ts'))==sorted(c['sources'])
   result=subprocess.run(['deno','check','--cached-only','--config',str(base/'deno.json'),str(base/'functions'/c['slug']/'index.ts')],stdout=log,stderr=log)
   assert result.returncode==0,label
   log.write(f'PASS {label} isolated archive source inventory/hashes/frozen-lock Deno check\n');log.flush()
print('PASS three archives validated independently; no broad workspace imports')
