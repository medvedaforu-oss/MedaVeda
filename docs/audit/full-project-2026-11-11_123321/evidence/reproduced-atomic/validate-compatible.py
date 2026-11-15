from pathlib import Path
import json,hashlib,tarfile,tempfile,subprocess,os,tomllib
R=Path(__file__).resolve().parents[4];O=Path(__file__).resolve().parent
original=(R/'docs/audit/production-execution-20261111/03-phase-c-atomic.sql').read_text()
expected=original.replace("convert_to(pg_get_functiondef(p.oid),'UTF8')","convert_to(btrim(pg_get_functiondef(p.oid), E' \\t\\n\\r'),'UTF8')").replace('FOREACH t IN ARRAY[','FOREACH t IN ARRAY ARRAY[')
assert expected==(O/'03-phase-c-atomic-compatible.sql').read_text()
checks=[]
for rel in ['phase-b-20261111','b-to-c-compatible-20261111']:
 release=R/'supabase/releases'/rel;manifest=json.loads((release/'manifest.json').read_text())
 entries=manifest.get('functions',manifest.get('candidates'))
 for key,item in entries.items():
  name=item.get('slug',key)
  with tempfile.TemporaryDirectory(prefix='bc-archive-') as t:
   with tarfile.open((R if item['archive'].startswith('supabase/') else release)/item['archive']) as tar:tar.extractall(t,filter='data')
   cfg=tomllib.loads((Path(t)/'supabase/config.toml').read_text())
   assert set(cfg['functions'])=={name} and cfg['functions'][name]['verify_jwt']==item['verify_jwt']
   for dependency in ['deno.json','deno.lock']:
    assert (Path(t)/'supabase'/dependency).read_bytes()==(release/dependency).read_bytes()
   for path,digest in item['sources'].items():
    if isinstance(digest,dict):digest=digest['sha256']
    assert hashlib.sha256((release/path).read_bytes()).hexdigest()==digest
    assert (release/path).read_bytes()==(Path(t)/'supabase'/path).read_bytes()
   assert hashlib.sha256(((R if item['archive'].startswith('supabase/') else release)/item['archive']).read_bytes()).hexdigest()==item['archive_sha256']
   p=subprocess.run(['deno','check','--cached-only','functions/'+name+'/index.ts'],cwd=Path(t)/'supabase',env={'PATH':os.environ['PATH'],'HOME':os.environ['HOME']},text=True,capture_output=True,timeout=120)
   (O/('deno-'+rel+'-'+name+'.log')).write_text(p.stdout+p.stderr)
   checks.append({'release':rel,'name':name,'exit_code':p.returncode});assert not p.returncode,p.stderr
(O/'compatible-validation.json').write_text(json.dumps({'wrapper_exact_changes':{'trim_hash_comparisons':126,'foreach_syntax':2},'archives':checks},indent=2)+'\n')
print('PASS exact wrapper derivative and seven extracted archive hashes/Deno checks')
