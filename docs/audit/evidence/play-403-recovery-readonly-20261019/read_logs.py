exec(compile(open('/tmp/medveda-r2-recovery-readonly/verify_live.py').read().split("run('function-metadata'")[0],'/tmp/recovery-log-helpers','exec'))
import urllib.parse
SINCE='2026-10-19T05:11:32Z';UNTIL=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
def logs(sql,start=SINCE,end=UNTIL):return c.management('/analytics/endpoints/logs?'+urllib.parse.urlencode({'sql':sql,'iso_timestamp_start':start,'iso_timestamp_end':end}))
run('log-source-counts',lambda:logs('select source, count(*) as event_count from logs group by source'))
run('catalog-diagnostic-counts',lambda:logs("select count(*) as diagnostic_events from logs where source='function_logs' and event_message like '%play_catalog_failure%'"))
run('runtime-log-shape',lambda:logs("select timestamp, source, json_keys(metadata) as metadata_keys from logs where source='function_logs' limit 2"))
run('edge-log-shape',lambda:logs("select timestamp, source, json_keys(metadata) as metadata_keys from logs where source='edge_logs' limit 2"))
query="""
select json_build_object(
 'active_cron_function_checks',(select json_agg(f) from (
  select n.nspname as schema,p.proname as name,md5(p.prosrc) as source_md5,
   strpos(p.prosrc,'http')>0 as mentions_http,
   strpos(lower(p.prosrc),'execute')>0 as mentions_execute,
   strpos(lower(p.prosrc),'catalog')>0 as mentions_catalog,
   (select json_agg(m[1]) from regexp_matches(p.prosrc,'([a-zA-Z_][a-zA-Z_0-9]*[.][a-zA-Z_][a-zA-Z_0-9]*)[[:space:]]*[(]','g') m) as qualified_function_calls
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where p.prokind='f' and n.nspname='public' and p.proname in ('purge_old_analytics_events','purge_old_payment_sessions','release_due_wallet_credits')) f),
 'http_trigger_inventory',(select json_agg(t) from (
  select n.nspname as schema,cl.relname as relation,tr.tgname as trigger,pr.proname as function,tr.tgenabled as enabled,
   strpos(pg_get_triggerdef(tr.oid),'sync-play-catalog')>0 as references_catalog_endpoint,
   strpos(pg_get_triggerdef(tr.oid),'PLAY_CATALOG_CRON_SECRET')>0 as references_secret_name,
   strpos(pg_get_triggerdef(tr.oid),'x-play-catalog-cron-secret')>0 as references_auth_header,
   strpos(pg_get_triggerdef(tr.oid),'http')>0 as mentions_http
  from pg_trigger tr join pg_class cl on cl.oid=tr.tgrelid join pg_namespace n on n.oid=cl.relnamespace join pg_proc pr on pr.oid=tr.tgfoid
  where not tr.tgisinternal and (strpos(pg_get_triggerdef(tr.oid),'http')>0 or strpos(pg_get_triggerdef(tr.oid),'sync-play-catalog')>0)) t),
 'pg_net_settings',(select json_agg(s) from (select name,setting,unit from pg_settings where name like 'pg_net%' and name not like '%password%' and name not like '%secret%') s),
 'retained_http_responses',(select json_build_object('count',count(*),'oldest',min(created),'newest',max(created)) from net._http_response)
) as additional_containment;
"""
run('additional-containment',lambda:c.database(query))
