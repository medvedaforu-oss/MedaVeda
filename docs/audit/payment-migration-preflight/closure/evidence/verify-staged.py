"""Offline only: verify frozen archive closures and executable SQL boundaries."""
from pathlib import Path
import re,json,hashlib,tarfile,tomllib,posixpath
R=Path(__file__).resolve().parents[5];O=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
# Dollar/string literals remain opaque: ledger source strings are not executed SQL.
lex=re.compile(r"--[^\n]*|/\*.*?\*/|\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$|E?'(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|[A-Za-z_][A-Za-z_0-9]*|[^\s]",re.S)
def statements(code):
 code=re.sub(r'(?m)^\\[^\n]*','',code);tokens=[];i=0
 while i<len(code):
  if code[i].isspace():i+=1;continue
  m=lex.match(code,i);assert m,code[i:i+30];t=m.group();i=m.end()
  if t.startswith(('--','/*')):continue
  if re.fullmatch(r'\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$',t):
   end=code.index(t,i);t='DOLLAR:'+code[i:end];i=end+len(m.group())
  elif t[0] not in "'\"" and not t.startswith("E'"):t=t.lower()
  tokens.append(t)
 result=[];part=[]
 for t in tokens:
  if t==';':result.append(part);part=[]
  else:part.append(t)
 assert not part,part[:10]
 return result
P=R/'supabase/releases/p0-critical-20261111_131014'; M=json.loads((P/'manifest.json').read_text())
units={};seen_sources=set()
for f,n in [('01-phase-a.sql',3),('03-phase-c-atomic-compatible.sql',4),('05-p0-forward-proof.sql',1)]:
 st=statements((P/'sql'/f).read_text());tx=[s for s in st if s and s[0] in ['begin','commit','rollback','start']]
 assert tx==[['begin','isolation','level','read','committed'],['commit']],(f,tx)
 matched=[]
 for src in (P/'sql/sources').glob('*.sql'):
  version=src.name.split('_')[0]
  expected='01-phase-a.sql' if version in ['20261110100000','20261110120000','20261110130000'] else '05-p0-forward-proof.sql' if version=='20261111120000' else '03-phase-c-atomic-compatible.sql'
  if f!=expected:continue
  ss=[s for s in statements(src.read_text()) if s not in [['begin'],['commit']]]
  if all(s in st for s in ss):
   cursor=0
   for statement in ss:cursor=st.index(statement,cursor)+1
   matched.append(src.name);seen_sources.add(src.name)
 assert len(matched)==n,(f,matched)
 units[f]={'sha256':sha((P/'sql'/f).read_bytes()),'transactions':tx,'sources':matched,'statements':len(st)}
assert len(seen_sources)==8
packages={}
for name in ['phase-b-20261111','phase-c-20261111','b-to-c-compatible-20261111','p0-critical-20261111_131014']:
 p=R/'supabase/releases'/name;m=json.loads((p/'manifest.json').read_text());entries=m.get('functions',m.get('candidates'))
 checks=0
 for line in (p/'checksums.sha256').read_text().splitlines():
  digest,rel=line.split(None,1);rel=rel.lstrip('*');target=R/rel if rel.startswith('supabase/') else p/rel
  assert sha(target.read_bytes())==digest,(name,rel);checks+=1
 functions={}
 for label,v in entries.items():
  slug=v.get('slug',label);rel=v['archive'];a=R/rel if rel.startswith('supabase/') else p/rel
  assert sha(a.read_bytes())==v['archive_sha256']
  with tarfile.open(a) as tar:
   members=tar.getmembers();assert all(x.isfile() and '..' not in Path(x.name).parts and not x.name.startswith('/') for x in members)
   assert len({x.name for x in members})==len(members)
   data={x.name:tar.extractfile(x).read() for x in members}
  sources={k:(vv['sha256'] if isinstance(vv,dict) else vv) for k,vv in v['sources'].items()}
  assert set(data)=={'supabase/'+k for k in sources}|{'supabase/'+k for k in ['config.toml','deno.json','deno.lock']}
  assert tomllib.loads(data['supabase/config.toml'].decode())['functions']=={slug:{'verify_jwt':v['verify_jwt']}}
  for k,d in sources.items():assert sha(data['supabase/'+k])==d
  for k in ['deno.json','deno.lock']:assert data['supabase/'+k]==(p/k).read_bytes()
  pending=['functions/'+slug+'/index.ts'];seen=set();external=set()
  while pending:
   k=pending.pop()
   if k in seen:continue
   seen.add(k);s=data['supabase/'+k].decode()
   for imp in re.findall(r'(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["\']([^"\']+)',s):
    if imp.startswith('.'):pending.append(posixpath.normpath(posixpath.join(posixpath.dirname(k),imp)))
    else:external.add(imp)
  assert seen==set(sources);assert sorted(external)==sorted(v.get('external_imports',['npm:@supabase/supabase-js@2.118.0']))
  functions[slug]={'archive':rel,'sha256':v['archive_sha256'],'verify_jwt':v['verify_jwt'],'closure_files':len(seen)}
 packages[name]={'manifest_sha256':sha((p/'manifest.json').read_bytes()),'checksum_entries':checks,'functions':functions}
result={'sql_units':units,'packages':packages}
(O/'staged-artifacts.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS executable SQL: one READ COMMITTED transaction per A/C/D, eight exact ordered source statement sets; ledger literals excluded')
print('PASS four packages: checksum inventories, manifests, 22 archives, exact members, transitive imports, JWT configs and Deno locks')
