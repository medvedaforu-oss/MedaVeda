from pathlib import Path
import re,json,hashlib
r=Path.cwd();o=Path(Path('/tmp/medveda-current-audit').read_text())/'evidence';rows=[]
for base in ['mobile-app/src','admin-panel/src','supabase/functions','supabase/migrations','supabase/workers','website/_src','website/assets/js','scripts','.github/workflows']:
 for p in sorted((r/base).rglob('*')):
  if not p.is_file() or p.suffix not in {'.ts','.tsx','.js','.cjs','.mjs','.sql','.html','.py','.sh','.yml'}:continue
  s=p.read_text(); lines=s.splitlines();row={'path':str(p.relative_to(r)),'lines':len(lines),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'database_tables':[], 'rpc_calls':[], 'imports':[],'markers':[]}
  for n,l in enumerate(lines,1):
   for x in re.findall(r'\.from\([\"\x27]([^\"\x27]+)',l):row['database_tables'].append({'name':x,'line':n})
   for x in re.findall(r'\.rpc\([\"\x27]([^\"\x27]+)',l):row['rpc_calls'].append({'name':x,'line':n})
   if re.search(r'TODO|FIXME|not implemented|coming soon|Coming Soon',l):row['markers'].append({'line':n,'text':l.strip()[:180]})
  rows.append(row)
(o/'source-inventory.json').write_text(json.dumps(rows,indent=2));print('files',len(rows),'lines',sum(x['lines'] for x in rows))
print('migrations',len(list((r/'supabase/migrations').glob('*.sql'))))
