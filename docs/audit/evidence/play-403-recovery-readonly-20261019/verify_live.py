import datetime,hashlib,importlib.util,json,socket,urllib.error,urllib.request
from pathlib import Path
ROOT=Path('/home/ganeshp8545/AyurPulse');OPS=ROOT/'docs/audit/evidence/play-403-single-job-20261019';OUT=Path('/tmp/medveda-r2-recovery-readonly/evidence')
s=importlib.util.spec_from_file_location('reviewed_control',OPS/'control.py');c=importlib.util.module_from_spec(s);s.loader.exec_module(c)
def save(name,data):
 (OUT/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n');print(json.dumps({name:data}),flush=True)
def safe_error(e):
 reason=getattr(e,'reason',None)
 return {'exception_class':type(e).__name__,'http_status':e.code if isinstance(e,urllib.error.HTTPError) else None,'underlying_class':type(reason).__name__ if reason is not None else None,'errno':getattr(reason,'errno',None)}
def run(name,fn):
 try:save(name,fn())
 except Exception as e:save(name+'-error',safe_error(e))
run('function-metadata',lambda:{k:v for k,v in c.management('/functions/sync-play-catalog').items() if k in ['id','slug','version','status','verify_jwt','updated_at','created_at','entrypoint_path','import_map_path']})
run('preflight',lambda:c.database((OPS/'preflight.sql').read_text()))
run('monitor',lambda:c.database((OPS/'monitor.sql').read_text().replace('__REQUEST_ID__','0')))
query="""
select json_build_object(
 'captured_at',now(),
 'cron_jobs',(select json_agg(j order by j.jobid) from (
   select jobid,jobname,active,schedule,md5(command) as command_md5,
     strpos(command,'sync-play-catalog')>0 as references_endpoint,
     strpos(command,'PLAY_CATALOG_CRON_SECRET')>0 as references_secret_name,
     strpos(command,'x-play-catalog-cron-secret')>0 as references_auth_header,
     (select json_agg(m[1]) from regexp_matches(command,'([a-zA-Z_][a-zA-Z_0-9]*[.][a-zA-Z_][a-zA-Z_0-9]*)[[:space:]]*[(]','g') m) as qualified_function_calls
   from cron.job) j),
 'catalog_cron_runs',(select json_agg(r) from (
   select jobid,runid,status,start_time,end_time from cron.job_run_details
   where jobid=8 order by runid desc limit 12) r),
 'all_queued_http_count',(select count(*) from net.http_request_queue),
 'catalog_related_queued_http',(select json_agg(q) from (
    select id,method,timeout_milliseconds,
      strpos(url,'sync-play-catalog')>0 as catalog_url,
      headers ? 'x-play-catalog-cron-secret' as catalog_auth_header_present
    from net.http_request_queue where strpos(url,'sync-play-catalog')>0 or headers ? 'x-play-catalog-cron-secret') q),
 'recent_http_response_summary',(select json_agg(h) from (
    select id,status_code,timed_out,created,
      substring(content from '\"processed\"\\s*:\\s*([0-9]+)') as processed,
      substring(content from '\"status\"\\s*:\\s*\"(failed|retry|ready)\"') as worker_status,
      error_msg is not null as has_transport_error
    from net._http_response where created>='2026-10-19T05:11:32Z'::timestamptz
    order by id desc limit 20) h),
 'catalog_sql_sessions',(select json_agg(a) from (
    select pid,state,query_start,wait_event_type,wait_event,
      strpos(query,'sync-play-catalog')>0 as references_endpoint,
      strpos(query,'claim_play_price_sync')>0 as references_claim
    from pg_stat_activity where pid<>pg_backend_pid() and state='active'
    and (strpos(query,'sync-play-catalog')>0 or strpos(query,'claim_play_price_sync')>0)) a),
 'database_catalog_caller_functions',(select json_agg(f) from (
   select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as args,
     md5(p.prosrc) as source_md5,
     strpos(p.prosrc,'sync-play-catalog')>0 as references_endpoint,
     strpos(p.prosrc,'PLAY_CATALOG_CRON_SECRET')>0 as references_secret_name,
     strpos(p.prosrc,'x-play-catalog-cron-secret')>0 as references_auth_header,
     strpos(p.prosrc,'net.http_post')>0 as uses_http_post
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where p.prokind='f' and n.nspname not in ('pg_catalog','information_schema')
     and (strpos(p.prosrc,'sync-play-catalog')>0 or strpos(p.prosrc,'PLAY_CATALOG_CRON_SECRET')>0
       or strpos(p.prosrc,'x-play-catalog-cron-secret')>0)) f),
 'recent_catalog_events',(select json_agg(e) from (
    select id,price_inr,event,created_at from public.play_price_sync_logs
    where created_at>='2026-10-19T05:11:32Z'::timestamptz order by id desc limit 30) e)
) as invocation_inventory;
"""
run('invocation-inventory',lambda:c.database(query))
run('analytics-capabilities',lambda:c.database("select table_schema,table_name from information_schema.tables where (table_schema in ('analytics','supabase_functions') or table_name ilike '%audit%' or table_name ilike '%hook%') order by 1,2;"))
def bundle():
 token=(Path.home()/'.supabase/access-token').read_text().strip()
 req=urllib.request.Request('https://api.supabase.com/v1/projects/'+c.REF+'/functions/sync-play-catalog/body',headers={'Authorization':'Bearer '+token})
 with urllib.request.urlopen(req,timeout=25) as response:data=response.read()
 (OUT/'current-function.bundle').write_bytes(data)
 return {'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
run('deployed-bundle',bundle)
