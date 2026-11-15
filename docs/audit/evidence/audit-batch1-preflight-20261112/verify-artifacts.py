"""Read-only comparison of prepared release and captured current production metadata."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parents[4]
ev=Path(__file__).parent
release=root/'supabase/releases/audit-batch1-20261112'
manifest=json.loads((release/'manifest.json').read_text())
for f in manifest['files']:
 assert hashlib.sha256((release/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
migration=root/manifest['migration'];sql=migration.read_text()
assert hashlib.sha256(migration.read_bytes()).hexdigest()==manifest['migration_sha256']
assert migration.read_bytes()==(release/'sql/forward.sql').read_bytes()
# Strip function dollar bodies and comments; every outer statement must be DDL/ACL/transaction only.
outer=re.sub(r'\$\$.*?\$\$','FUNCTION_BODY',sql,flags=re.S)
outer=re.sub(r'--[^\n]*','',outer)
commands=[s.strip() for s in outer.split(';') if s.strip()]
assert all(re.match(r'^(begin$|commit$|create or replace function |revoke all on function |grant execute on function )',c,re.I) for c in commands),commands
expected=json.loads((release/'production-contracts.json').read_text())
actual=json.loads((ev/'production-schema.json').read_text())
by_name={x['name']:x for x in actual['functions']}
for f in expected['functions']:
 assert by_name[f['name']]['definition']==f['definition'],f['name']+' definition drift'
 assert by_name[f['name']]['acl']==f['acl'],f['name']+' ACL drift'
assert 'reverse_refunded_capture' not in by_name and 'queue_capture_compensation' not in by_name
remote=json.loads((ev/'migration-history.json').read_text())['migrations']
local={p.name.split('_',1)[0]:p.stem.split('_',1)[1] for p in (root/'supabase/migrations').glob('*.sql')}
assert set(x['version'] for x in remote)==set(local)-{'20261112104610'},'migration version drift'
name_diff=[dict(version=x['version'],remote=x['name'],local=local[x['version']]) for x in remote if x['name']!=local[x['version']]]
assert all(x['version']=='20260801' for x in name_diff),name_diff
baseline=json.loads((release/'deployed-inventory.json').read_text())
for f in baseline:
 current=json.loads((ev/('remote-'+f['slug']+'.json')).read_text())
 assert current['version']==f['version'] and current['ezbr_sha256']==f['bundle_sha256'] and current['verify_jwt']==f['verify_jwt'],f['slug']+' metadata drift'
 for source in current['files']:
  assert (release/'baseline'/f['slug']/source['name']).read_text()==source['content'],source['name']+' source drift'
result={'status':'PASS','migration_sha256':manifest['migration_sha256'],'applied_versions':len(remote),'new_migration_applied':False,'outer_statement_count':len(commands),'baseline_rpc_definitions_and_acls_matched':len(expected['functions']),'function_sources_matched':[f['slug'] for f in baseline],'historical_name_discrepancy':name_diff}
(ev/'artifact-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
