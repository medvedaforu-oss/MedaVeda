exec(compile(open('/tmp/medveda-catalog-custody-readonly-20261019/check_supabase.py').read().split("run('function-current'")[0],'/tmp/custody-readonly-helpers','exec'))
try:
 metadata={k:v for k,v in c.management('/functions/sync-play-catalog').items() if k in ['id','slug','version','status','verify_jwt','updated_at']}
 assert metadata['version']==3 and metadata['status']=='ACTIVE' and metadata['verify_jwt'] is False
 pre=c.database((OPS/'preflight.sql').read_text());c.one_rupee_precondition(pre,pending=True)
 old=json.loads(Path('/home/ganeshp8545/AyurPulse/docs/audit/evidence/play-403-recovery-readonly-20261019/preflight.json').read_text())[0]['preflight']
 assert sorted(pre[0]['preflight']['catalog'],key=lambda j:j['price_inr'])==sorted(old['catalog'],key=lambda j:j['price_inr'])
 current=json.loads((OUT/'cron-caller-inventory.json').read_text());previous=json.loads(Path('/home/ganeshp8545/AyurPulse/docs/audit/evidence/play-403-recovery-readonly-20261019/invocation-inventory.json').read_text())[0]['invocation_inventory']['cron_jobs']
 index={j['jobid']:j for j in previous};assert len(current)==len(previous)
 for j in current:
  assert j['command_md5']==index[j['jobid']]['command_md5'] and j['active']==index[j['jobid']]['active'] and j['schedule']==index[j['jobid']]['schedule']
 helpers=c.database("select p.proname as name,md5(p.prosrc) as source_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind='f' and n.nspname='public' and p.proname in ('purge_old_analytics_events','purge_old_payment_sessions','release_due_wallet_credits','accounts_share_network');")
 oldhelpers=json.loads(Path('/home/ganeshp8545/AyurPulse/docs/audit/evidence/play-403-recovery-readonly-20261019/additional-containment.json').read_text())[0]['additional_containment']['active_cron_function_checks']
 oldhelpers+=json.loads(Path('/home/ganeshp8545/AyurPulse/docs/audit/evidence/play-403-recovery-readonly-20261019/active-cron-helper-callees.json').read_text())
 expected={j['name']:j['source_md5'] for j in oldhelpers};assert len(helpers)==len(expected)
 for j in helpers:assert j['source_md5']==expected[j['name']]
 save('final-custody-safety-guard',{'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'metadata':metadata,'preflight':pre,'all_seven_cron_definitions_and_states_unchanged':True,'active_cron_helper_sources_unchanged':True,'other_identified_active_catalog_schedulers':0,'production_writes':0,'function_invocations':0,'worker_retries':0,'rollback_attempts':0})
except Exception as e:save('final-custody-safety-guard-error',error(e))
