from pathlib import Path
import datetime,importlib.util,json,re,urllib.error,urllib.parse
OUT=Path('/tmp/medveda-catalog-custody-readonly-20261019');OPS=Path('/home/ganeshp8545/AyurPulse/docs/audit/evidence/play-403-single-job-20261019')
s=importlib.util.spec_from_file_location('reviewed_control',OPS/'control.py');c=importlib.util.module_from_spec(s);s.loader.exec_module(c)
def save(n,v):(OUT/(n+'.json')).write_text(json.dumps(v,indent=2)+'\n');print(json.dumps({n:v}),flush=True)
def error(e):return {'exception_class':type(e).__name__,'http_status':getattr(e,'code',None)}
def run(n,f):
 try:save(n,f())
 except Exception as e:save(n+'-error',error(e))
run('function-current',lambda:{k:v for k,v in c.management('/functions/sync-play-catalog').items() if k in ['id','slug','version','status','verify_jwt','updated_at']})
run('preflight-current',lambda:c.database((OPS/'preflight.sql').read_text()))
run('cron-caller-inventory',lambda:c.database("""select jobid,jobname,active,schedule,md5(command) as command_md5,
 strpos(lower(command),'sync-play-catalog')>0 as catalog_endpoint_reference,
 strpos(lower(command),'play_catalog_cron_secret')>0 as catalog_secret_name_reference,
 strpos(lower(command),'x-play-catalog-cron-secret')>0 as catalog_auth_header_reference
 from cron.job order by jobid;"""))
run('stored-caller-and-webhook-references',lambda:c.database("""select json_build_object(
 'stored_functions',(select json_agg(f) from (select n.nspname as schema,p.proname as name,md5(p.prosrc) as source_md5
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind='f'
 and n.nspname not in ('pg_catalog','information_schema')
 and (strpos(lower(p.prosrc),'sync-play-catalog')>0 or strpos(lower(p.prosrc),'play_catalog_cron_secret')>0 or strpos(lower(p.prosrc),'x-play-catalog-cron-secret')>0)) f),
 'webhooks',(select json_agg(t) from (select n.nspname as schema,cl.relname as relation,t.tgname as name,t.tgenabled as enabled
 from pg_trigger t join pg_class cl on cl.oid=t.tgrelid join pg_namespace n on n.oid=cl.relnamespace
 where not t.tgisinternal and (strpos(lower(pg_get_triggerdef(t.oid)),'sync-play-catalog')>0 or strpos(lower(pg_get_triggerdef(t.oid)),'play_catalog_cron_secret')>0 or strpos(lower(pg_get_triggerdef(t.oid)),'x-play-catalog-cron-secret')>0)) t)
 ) as references;"""))
try:
 secrets=c.management('/secrets')
 rows=[{'name':s['name'],'digest':s['value']} for s in secrets if isinstance(s.get('name'),str) and isinstance(s.get('value'),str) and re.fullmatch(r'[0-9a-fA-F]{64}',s['value'])]
 save('edge-secret-metadata',{'named_catalog_secret_count':sum(s.get('name')=='PLAY_CATALOG_CRON_SECRET' for s in secrets),'secret_count':len(secrets),'digest_metadata_valid_for_all':len(rows)==len(secrets)})
 assert len(rows)==len(secrets),'Unexpected secret metadata format; do not inspect raw values'
 # Only hashes already supplied by the Management API enter this read-only SQL.
 payload=json.dumps(rows).replace("'","''")
 sql="""with canonical as (select decrypted_secret from vault.decrypted_secrets where name='PLAY_CATALOG_CRON_SECRET'),
 edge as (select * from jsonb_to_recordset('PAYLOAD'::jsonb) as x(name text,digest text))
 select json_build_object(
 'captured_at',now(),
 'vault_catalog_entries',(select count(*) from canonical),
 'vault_catalog_all_at_least_32_chars',(select bool_and(length(decrypted_secret)>=32) from canonical),
 'other_vault_names_with_same_value',(select json_agg(name) from vault.decrypted_secrets where name<>'PLAY_CATALOG_CRON_SECRET' and decrypted_secret in (select decrypted_secret from canonical)),
 'edge_secret_names_matching_catalog_value',(select json_agg(name) from edge where lower(digest) in (select encode(sha256(convert_to(decrypted_secret,'UTF8')),'hex') from canonical)),
 'catalog_related_vault_names',(select json_agg(name) from vault.secrets where lower(name) like '%catalog%'),
 'role_read_capabilities',(select json_agg(r) from (select rolname,
 has_schema_privilege(oid,'vault','USAGE') as vault_schema_usage,
 has_table_privilege(oid,'vault.decrypted_secrets','SELECT') as decrypted_view_select,
 has_table_privilege(oid,'vault.secrets','SELECT') as encrypted_table_select
 from pg_roles where rolname in ('anon','authenticated','service_role','postgres','supabase_admin','supabase_read_only_user','supabase_auth_admin')) r)
 ) as secret_custody;""".replace('PAYLOAD',payload)
 run('secret-custody-comparison',lambda:c.database(sql))
except Exception as e:save('secret-custody-check-error',error(e))
