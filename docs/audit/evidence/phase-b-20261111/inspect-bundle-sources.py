"""Fixed-production GET source inspection. No execution routes. Sources saved only in /tmp."""
from pathlib import Path
import urllib.request, hashlib,json,zipfile,io
p='xbvenkfmesugrbjuufyw'
t=(Path.home()/'.supabase/access-token').read_text().strip()
out=Path('/tmp/medveda-phase-b-deployed');out.mkdir(mode=0o700,exist_ok=True)
for slug in ['create-order','verify-payment','razorpay-webhook']:
 req=urllib.request.Request(f'https://api.supabase.com/v1/projects/{p}/functions/{slug}/body',headers={'Authorization':'Bearer '+t})
 with urllib.request.urlopen(req,timeout=30) as r: b=r.read();ct=r.headers.get('Content-Type')
 (out/(slug+'.bundle')).write_bytes(b)
 print(slug,ct,len(b),hashlib.sha256(b).hexdigest(), 'zip',zipfile.is_zipfile(io.BytesIO(b)))
 if zipfile.is_zipfile(io.BytesIO(b)):
  with zipfile.ZipFile(io.BytesIO(b)) as z:
   for n in z.namelist():
    assert '..' not in Path(n).parts and not n.startswith('/')
   z.extractall(out/slug)
 else:
  print('prefix',repr(b[:160]))
