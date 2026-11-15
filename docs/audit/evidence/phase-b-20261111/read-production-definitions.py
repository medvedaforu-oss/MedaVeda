"""Fixed-production metadata SELECT only. No function invocation or customer rows."""
from pathlib import Path
import json,urllib.request
p='xbvenkfmesugrbjuufyw';t=(Path.home()/'.supabase/access-token').read_text().strip()
q="""BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout='15s';
select json_agg(json_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid))) as definitions from pg_proc p where p.pronamespace='public'::regnamespace;
ROLLBACK;"""
r=urllib.request.Request(f'https://api.supabase.com/v1/projects/{p}/database/query',data=json.dumps({'query':q,'read_only':True}).encode(),headers={'Authorization':'Bearer '+t,'Content-Type':'application/json'})
with urllib.request.urlopen(r,timeout=30) as response:data=json.load(response)
Path('/tmp/medveda-phase-b-deployed/production-definitions.json').write_text(json.dumps(data[0]['definitions']))
print('PASS production SQL definitions read to private temporary baseline evidence; no RPC invocation')
