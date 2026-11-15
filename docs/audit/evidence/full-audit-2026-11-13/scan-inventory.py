"""Read-only inventory and secret history scan; outputs locations, never credentials."""
import base64, collections, hashlib, json, os, pathlib, re, subprocess
ROOT=pathlib.Path(__file__).resolve().parents[4];OUT=pathlib.Path(__file__).resolve().parent
skip={'.git','node_modules','.expo','.gradle','.next','.venv','build','dist','web-build','android','ios'}
files=[]; markers=[];envs=[];hits=[]
patterns=[('private key',re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----\s*[A-Za-z0-9+/=\s]{64,}-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----')),
 ('Supabase secret',re.compile(r'\bsb_secret_[A-Za-z0-9_-]{12,}')),
 ('Stripe secret',re.compile(r'\bsk_(?:live|test)_[A-Za-z0-9]{16,}')),
 ('GitHub token',re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{32,}|github_pat_[A-Za-z0-9_]{32,})')),
 ('AWS access key ID',re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b')),
 ('Resend token',re.compile(r'\bre_[A-Za-z0-9_]{24,}'))]
def scan(text,path):
 result=[]
 for kind,pat in patterns:
  for m in pat.finditer(text):result.append(dict(path=path,line=text[:m.start()].count('\n')+1,kind=kind,prefix=m[0][:4]))
 for m in re.finditer(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',text):
  try:
   payload=m[0].split('.')[1];d=json.loads(base64.urlsafe_b64decode(payload+'='*(-len(payload)%4)))
   if d.get('role')=='service_role':result.append(dict(path=path,line=text[:m.start()].count('\n')+1,kind='service_role JWT',prefix=m[0][:4]))
  except Exception:pass
 return result
for root,ds,fs in os.walk(ROOT):
 ds[:]=sorted(d for d in ds if d not in skip)
 for f in sorted(fs):
  p=pathlib.Path(root)/f;rel=p.relative_to(ROOT).as_posix()
  if rel.startswith('docs/audit/evidence/full-audit-2026-11-13/'):continue
  if p.is_symlink() or p.stat().st_size>5000000:continue
  data=p.read_bytes()
  if b'\0' in data[:4096]:continue
  try:text=data.decode('utf8')
  except UnicodeError:continue
  files.append(dict(path=rel,bytes=len(data),lines=len(text.splitlines()),sha256=hashlib.sha256(data).hexdigest()))
  hits.extend(scan(text,rel))
  if f.startswith('.env'):
   tracked=subprocess.run(['git','ls-files','--error-unmatch',rel],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
   envs.append(dict(path=rel,tracked=tracked,names=[m[1] for m in re.finditer(r'^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=',text,re.M)]))
  for n,line in enumerate(text.splitlines(),1):
   kinds=[]
   if re.search('ayurpulse',line,re.I):kinds.append('AyurPulse')
   if re.search(r'\b(?:TODO|FIXME|HACK)\b',line):kinds.append('TODO/FIXME/HACK')
   if re.search(r'console\.(?:log|warn|error|info|debug)\s*\(',line):kinds.append('console')
   if re.search(r'\blorem\b|placeholder',line,re.I):kinds.append('placeholder')
   if kinds:
    safe=line.strip()[:500]
    if re.search(r'eyJ|sb_(?:secret|publishable)_|rzp_(?:test|live)_|private_key|password\s*[:=]|secret\s*[:=]',safe,re.I):safe='[line content suppressed; inspect source locally]'
    markers.append(dict(path=rel,line=n,kinds=kinds,text=safe))
(OUT/'source-inventory.json').write_text(json.dumps(files,indent=2)+'\n')
(OUT/'markers.json').write_text(json.dumps(markers,indent=2)+'\n')
(OUT/'env-inventory.json').write_text(json.dumps(envs,indent=2)+'\n')
(OUT/'current-secret-scan.json').write_text(json.dumps(hits,indent=2)+'\n')
objects=subprocess.check_output(['git','rev-list','--objects','--all'],cwd=ROOT).decode().splitlines()
proc=subprocess.Popen(['git','cat-file','--batch'],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
history=[]; blobs=0;bytecount=0
for obj in objects:
 oid,_,path=obj.partition(' ')
 proc.stdin.write((oid+'\n').encode());proc.stdin.flush();head=proc.stdout.readline().decode().split()
 if len(head)<3:continue
 size=int(head[2]);data=proc.stdout.read(size);proc.stdout.read(1)
 if head[1]!='blob':continue
 blobs+=1;bytecount+=size
 try:text=data.decode('utf8')
 except UnicodeError:continue
 for hit in scan(text,path):history.append(dict(object=oid,**hit))
proc.stdin.close();proc.wait()
summary=dict(currentFiles=len(files),currentPotentialSecrets=hits,historyBlobs=blobs,historyBytes=bytecount,historyPotentialSecrets=history,envFiles=envs,markersByKind=dict(collections.Counter(k for x in markers for k in x['kinds'])))
(OUT/'inventory-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
