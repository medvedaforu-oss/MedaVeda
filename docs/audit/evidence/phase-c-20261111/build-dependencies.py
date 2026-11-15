"""Static closure over actual isolated sources and real local PostgreSQL metadata.
Includes called public routines, relation references, view expansion and triggers.
SQL/literal import inspection complements this scan; not a managed-transport test.
"""
from pathlib import Path
import json,re,hashlib
root=Path(__file__).resolve().parents[4];e=Path(__file__).resolve().parent;release=root/'supabase/releases/phase-c-20261111'
functions=json.loads((e/'sql-function-inventory.json').read_text());schema=json.loads((e/'sql-schema-inventory.json').read_text())
byname={}
for f in functions:byname.setdefault(f['name'],[]).append(f)
relations={r['name']:r for r in schema['relations']};triggers=schema['triggers']
roots={'create_priced_order','quote_my_order','get_my_play_fulfillment','user_can_access_note'};direct_tables=set();per_function={}
manifest=json.loads((release/'manifest.json').read_text())
for name,item in manifest['functions'].items():
 rpc=set();tables=set()
 for rel in item['sources']:
  s=(release/rel).read_text()
  rpc.update(re.findall(r'\brpc(?:<[^>]+>)?\(\s*["\']([^"\']+)["\']',s))
  tables.update(re.findall(r'\.from\(\s*["\']([^"\']+)["\']',s))
 per_function[name]={'rpc_roots':sorted(rpc),'relations':sorted(tables)};roots|=rpc;direct_tables|=tables
assert not roots-byname.keys(),roots-byname.keys();assert not direct_tables-relations.keys(),direct_tables-relations.keys()
def clean(s):return re.sub(r"'(?:''|[^'])*'|--[^\n]*|/\*.*?\*/",' ',s,flags=re.S)
def table_refs(s):
 c=clean(s)
 refs=set(re.findall(r'\bpublic\.([a-z_][a-z_0-9]*)',c,re.I))&relations.keys()
 refs|=set(re.findall(r'\b(?:from|join|update|into)\s+([a-z_][a-z_0-9]*)',c,re.I))&relations.keys()
 return refs
pending=list(roots);seen={};reachable=set(direct_tables);expanded=set()
while pending or reachable-expanded:
 while pending:
  name=pending.pop()
  if name in seen:continue
  definitions=byname[name];calls=set();refs=set()
  for f in definitions:
   c=clean(f['definition']);calls|={n for n in byname if n!=name and re.search(r'(?<!\w)'+re.escape(n)+r'\s*\(',c)}
   refs|=table_refs(f['definition'])
  seen[name]={'definitions':[{'args':f['args'],'sha256':hashlib.sha256(f['definition'].strip().encode()).hexdigest()} for f in definitions],
   'calls':sorted(calls),'relations':sorted(refs)};pending+=list(calls);reachable|=refs
 for rel in list(reachable-expanded):
  expanded.add(rel);view=relations[rel]['view']
  if view:reachable|=table_refs(view);pending += [n for n in byname if re.search(r'(?<!\w)'+re.escape(n)+r'\s*\(',clean(view))]
  pending += [t['function'] for t in triggers if t['table']==rel]
result={'method':'Conservative public SQL function/trigger/view closure; all literal Edge RPCs resolved, dynamic catalog helper roots included. Full schema inventory retains platform types/ACLs/columns/indexes.',
 'per_function':per_function,'roots':sorted(roots),'routines':dict(sorted(seen.items())),
 'relations':{n:relations[n] for n in sorted(reachable)},'triggers':[t for t in triggers if t['table'] in reachable],
 'migration_order':manifest['migrations'],'baseline_migrations':manifest['baseline_migrations']}
(e/'sql-dependency-closure.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',len(roots),'RPC/reader roots;',len(seen),'public routines;',len(reachable),'relations; every literal Edge RPC/relation exists')
