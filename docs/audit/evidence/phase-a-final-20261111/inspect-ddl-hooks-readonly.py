"""Production metadata/aggregate SELECTs and backup-list GET only. No backup creation/restore."""
import json,hashlib
from pathlib import Path
from datetime import datetime,timezone
from urllib.request import Request,urlopen
from urllib.error import HTTPError
PROJECT='xbvenkfmesugrbjuufyw'
BASE=f'https://api.supabase.com/v1/projects/{PROJECT}'
token=(Path.home()/'.supabase/access-token').read_text().strip()
def request(path,payload=None):
    assert path in ('/database/query','/database/backups')
    assert payload is None or (path=='/database/query' and payload.get('read_only') is True)
    req=Request(BASE+path,data=json.dumps(payload).encode() if payload else None,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    with urlopen(req,timeout=30) as r:return json.loads(r.read())
sql="BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout='15s';\nSELECT jsonb_build_object(\n 'event_functions',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'definition',pg_get_functiondef(p.oid),'acl',p.proacl::text,'owner',pg_get_userbyid(p.proowner))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.oid IN (SELECT evtfoid FROM pg_event_trigger)),\n 'default_acl',(SELECT jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(defaclrole),'schema',defaclnamespace::regnamespace::text,'type',defaclobjtype,'acl',defaclacl::text)) FROM pg_default_acl WHERE defaclobjtype='f' AND defaclrole='postgres'::regrole),\n 'refund_wrapper',(SELECT pg_get_functiondef(oid) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='handle_payment_refund')\n) AS evidence; ROLLBACK;"
data=request('/database/query',{'query':sql,'read_only':True})[0]['evidence']
# Complete event-trigger definitions are metadata; no customer record literals.
Path(__file__).with_name('production-ddl-hooks.json').write_text(json.dumps(data,indent=2)+'\n')
print('PASS production DDL event-hook definitions/default ACL inspection; read-only')
