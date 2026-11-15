"""Read-only local structural/integrity checks. Never connects or executes SQL."""
from pathlib import Path
import hashlib,json,re
O=Path(__file__).resolve().parent; R=O.parents[2]
M=json.loads((O/'manifest.json').read_text())
h=lambda b:hashlib.sha256(b).hexdigest()
assert M['project']=='xbvenkfmesugrbjuufyw'
assert [r['order'] for r in M['migrations']]==['A1','A2','A3','C1','C2','C3','C4']
assert [len(M[k]) for k in ['baseline_versions','phase_a_versions','phase_c_versions']]==[66,69,73]
assert '20261109120000' not in M['phase_c_versions']
for f in (O/'sources').iterdir(): assert 'nonplay' not in f.name
for r in M['migrations']:
 b=(O/r['copy']).read_bytes()
 assert h(b)==r['sha256'] and b==(R/r['source']).read_bytes()
 assert b==(R/'supabase/releases/phase-c-20261111/migrations'/Path(r['copy']).name).read_bytes()
 assert hashlib.md5(b).hexdigest()==r['ledger_source_md5']
 assert sum(l.strip().lower()==b'begin;' for l in b.splitlines())==1
 assert sum(l.strip().lower()==b'commit;' for l in b.splitlines())==1
assert (O/'01-phase-a.sql').read_bytes()==(R/'docs/audit/evidence/phase-a-final-20261111/operator-phase-a-proposed.sql').read_bytes()
s=(O/'03-phase-c-atomic.sql').read_text()
assert h(s.encode())==M['phase_c_sql_sha256']
assert s.count('BEGIN ISOLATION LEVEL READ COMMITTED;')==1
# Strip all dollar-quoted bodies and strings, then inspect top-level transaction controls.
top=re.sub(r'\$(\w*)\$.*?\$\1\$', '',s,flags=re.S)
top=re.sub(r"'(?:''|[^'])*'",'',top)
assert len(re.findall(r'^COMMIT;',top,re.M))==1
assert len(re.findall(r'^begin;',top,re.I|re.M))==0
positions=[]
for r in M['migrations'][3:]:
 source=(O/r['copy']).read_text()
 body=''.join(l for l in source.splitlines(keepends=True) if l.strip().lower() not in ('begin;','commit;'))
 marker='-- '+r['order']+' SOURCE SHA256 '+r['sha256']+'\n'
 pos=s.index(marker); positions.append(pos)
 assert s[pos+len(marker):].startswith(body+'\nINSERT INTO ')
 assert s.count('$exact_source$'+source+'$exact_source$')==1
 assert s.index('$exact_source$'+source+'$exact_source$')>pos+len(marker)+len(body)
assert positions==sorted(positions)
assert s.index('DO $final_contracts$')>positions[-1] and s.rindex('COMMIT;')>s.index('DO $final_contracts$')
assert 'ON CONFLICT DO NOTHING' not in top
for r in M['migrations'][:3]:assert r['ledger_source_md5'] in s
for file in ['SHA256SUMS','review-inputs.sha256']:
 for line in (O/file).read_text().splitlines():
  digest,path=line.split('  ',1)
  assert h((R/path).read_bytes())==digest,(file,path)
print('PASS: seven exact sources; Phase A identity; C bodies/order/outer transaction; source-ledger pairing; 66/69/73 sets; package/input hashes. No SQL executed.')
