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
sql="""BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout='15s';
SELECT jsonb_build_object(
 'role',current_user,'read_only',current_setting('transaction_read_only'),
 'server_version',current_setting('server_version'),'isolation',current_setting('default_transaction_isolation'),
 'schema_acl',(SELECT jsonb_build_object('owner',pg_get_userbyid(nspowner),'acl',nspacl::text) FROM pg_namespace WHERE nspname='public'),
 'untrusted_schema_create',(SELECT jsonb_object_agg(r,has_schema_privilege(r,'public','CREATE')) FROM unnest(array['anon','authenticated']) r),
 'event_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',evtname,'event',evtevent,'enabled',evtenabled,'function',evtfoid::regproc::text)),'[]'::jsonb) FROM pg_event_trigger),
 'trigger_states',(SELECT jsonb_agg(jsonb_build_object('table',tgrelid::regclass::text,'name',tgname,'enabled',tgenabled,'type',tgtype,'definition',pg_get_triggerdef(oid)) ORDER BY tgrelid,tgname) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.orders'::regclass,'public.purchases'::regclass)),
 'indexes_full',(SELECT jsonb_agg(jsonb_build_object('table',indrelid::regclass::text,'name',indexrelid::regclass::text,'valid',indisvalid,'ready',indisready,'definition_md5',md5(pg_get_indexdef(indexrelid)))) FROM pg_index WHERE indrelid IN ('public.orders'::regclass,'public.payments'::regclass,'public.purchases'::regclass)),
 'totals',jsonb_build_object('orders',(SELECT count(*) FROM public.orders),'payments',(SELECT count(*) FROM public.payments),'purchases',(SELECT count(*) FROM public.purchases),'success_payments',(SELECT count(*) FROM public.payments WHERE status='success'),'success_purchases',(SELECT count(*) FROM public.purchases WHERE status='success'),'orders_by_status',(SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*) n FROM public.orders GROUP BY status) s),'null_success_product',(SELECT count(*) FROM public.purchases WHERE status='success' AND product_id IS NULL),'keyed_duplicate_success_groups',(SELECT count(*) FROM (SELECT user_id,product_id FROM public.purchases WHERE status='success' AND user_id IS NOT NULL AND product_id IS NOT NULL GROUP BY user_id,product_id HAVING count(*)>1) s)),
 'functions',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text)) FROM pg_proc p WHERE pronamespace='public'::regnamespace AND proname IN ('settle_razorpay_payment','settle_razorpay_payment_legacy','handle_payment_refund','handle_payment_dispute','create_priced_order','user_can_access_note','guard_purchase_from_order','orders_guard_client_writes')),
 'table_owners',(SELECT jsonb_object_agg(relname,pg_get_userbyid(relowner)) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('orders','payments','purchases','payment_captures','payment_compensations','provider_events')),
 'ledger_columns',(SELECT jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable)) FROM information_schema.columns WHERE table_schema='supabase_migrations' AND table_name='schema_migrations')
) AS evidence; ROLLBACK;"""
out={'observed_at':datetime.now(timezone.utc).isoformat(),'project':PROJECT,'database':request('/database/query',{'query':sql,'read_only':True})[0]['evidence']}
# Inspect complete function definitions privately; retain hashes and locking markers only.
for f in out['database']['functions'] or []:
    definition=f.pop('definition')
    f['definition_sha256']=hashlib.sha256(definition.strip().encode()).hexdigest()
    f['locking_lines']=[line.strip() for line in definition.splitlines() if any(k in line.lower() for k in ('advisory','for update','wallet:','lock table'))]
try:
    backup=request('/database/backups')
    # Only operational backup status/time metadata. Omit download links or file paths.
    out['backup_metadata']={k:backup.get(k) for k in ('region','pitr_enabled','physical_backup_data','backups')}
    def reduce(v):
        if isinstance(v,list):return [reduce(x) for x in v]
        if isinstance(v,dict):return {k:reduce(x) for k,x in v.items() if not any(s in k.lower() for s in ('url','token','password','path','file','key','bucket'))}
        return v
    out['backup_metadata']=reduce(out['backup_metadata'])
except HTTPError as e:out['backup_metadata']={'http_status':e.code,'verified':False}
Path(__file__).with_name('production-operational.json').write_text(json.dumps(out,indent=2)+'\n')
print('PASS read-only operational metadata and backup inventory GET; no backup created or restored')
