exec(compile(open('/tmp/medveda-r2-recovery-readonly/verify_live.py').read().split("run('function-metadata'")[0],'/tmp/recovery-log-helpers','exec'))
import urllib.parse
START='2026-10-19T05:11:32Z';END=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
def logs(sql):
 result=c.management('/analytics/endpoints/logs?'+urllib.parse.urlencode({'sql':sql,'iso_timestamp_start':START,'iso_timestamp_end':END}))
 return {'window_start':START,'window_end':END,**result}
sql="""select timestamp, log_attributes['function_id'] as function_id,
 log_attributes['execution_id'] as execution_id,log_attributes['version'] as version,
 log_attributes['request.method'] as method,log_attributes['request.pathname'] as pathname,
 log_attributes['response.status_code'] as status_code
 from logs where source='function_edge_logs' order by timestamp asc limit 100"""
run('function-invocations',lambda:logs(sql))
sql="""select timestamp,log_attributes['function_id'] as function_id,
 log_attributes['execution_id'] as execution_id, log_attributes['event_type'] as event_type,
 log_attributes['level'] as level,
 if(event_message like '%play_catalog_failure%','catalog_failure',
 if(event_message like '%booted%','boot',if(event_message like '%shutdown%','shutdown','other'))) as event_class
 from logs where source='function_logs' and log_attributes['function_id']='f0e3d974-a8e8-436c-9063-6943e4b36a08'
 order by timestamp asc limit 100"""
run('catalog-runtime-events',lambda:logs(sql))
sql="""select timestamp,log_attributes['request.method'] as method,
 log_attributes['request.path'] as path,log_attributes['response.status_code'] as status_code
 from logs where source='edge_logs' and position(log_attributes['request.path'],'sync-play-catalog')>0
 order by timestamp asc limit 100"""
run('catalog-gateway-events',lambda:logs(sql))
sql="""select count(*) as events, min(timestamp) as earliest, max(timestamp) as latest
 from logs where source='function_edge_logs'
 and (log_attributes['function_id']='f0e3d974-a8e8-436c-9063-6943e4b36a08' or position(log_attributes['request.pathname'],'sync-play-catalog')>0)
 and log_attributes['response.status_code'] not in ('401','405')"""
run('catalog-nonrejected-invocation-count',lambda:logs(sql))
# Read-only inspection of the only two helper callees of active cron functions.
sql="""select n.nspname as schema,p.proname as name,md5(p.prosrc) as source_md5,
 strpos(p.prosrc,'http')>0 as mentions_http,strpos(lower(p.prosrc),'execute')>0 as mentions_execute,
 strpos(lower(p.prosrc),'catalog')>0 as mentions_catalog,
 (select json_agg(m[1]) from regexp_matches(p.prosrc,'([a-zA-Z_][a-zA-Z_0-9]*[.][a-zA-Z_][a-zA-Z_0-9]*)[[:space:]]*[(]','g') m) as qualified_function_calls
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind='f' and n.nspname='public'
 and p.proname in ('order_review_flags','accounts_share_network');"""
run('active-cron-helper-callees',lambda:c.database(sql))
