"""Offline extraction of ESZIP2.3 modules/source maps; no network or execution."""
from pathlib import Path
import json,hashlib
root=Path('/tmp/medveda-phase-b-deployed');manifest={}
for slug in ['create-order','verify-payment','razorpay-webhook']:
 b=(root/(slug+'.bundle')).read_bytes();assert b[:8]==b'ESZIP2.3'
 assert b[8:16]==bytes.fromhex('0000000400000100'), 'unexpected ESZIP options'
 end=20+int.from_bytes(b[16:20]);i=20;entries=[]
 while i<end:
  n=int.from_bytes(b[i:i+4]);i+=4;name=b[i:i+n].decode();i+=n;kind=b[i];i+=1
  if kind==0:
   offsets=[int.from_bytes(b[i+j:i+j+4]) for j in (0,4,8,12)];i+=17
   entries.append((name,*offsets))
  elif kind==2:i+=4
  elif kind==1:
   n=int.from_bytes(b[i:i+4]);i+=4+n
  else: raise Exception(('unknown entry',kind,name))
 assert i==end
 npm=int.from_bytes(b[end:end+4]);start=end+4+npm
 sources_len=int.from_bytes(b[start:start+4]);start+=4;maps_start=start+sources_len+4
 manifest[slug]={}
 for name,off,size,mo,ms in entries:
  if not name.startswith('functions/'):continue
  source=b[start+off:start+off+size].decode();sm=json.loads(b[maps_start+mo:maps_start+mo+ms])
  original=sm['sourcesContent'][0];p=root/slug/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(original)
  manifest[slug][name]=hashlib.sha256(original.encode()).hexdigest()
Path('docs/audit/evidence/phase-b-20261111/deployed-source-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('PASS offline ESZIP source-map extraction', {s:len(m) for s,m in manifest.items()})
