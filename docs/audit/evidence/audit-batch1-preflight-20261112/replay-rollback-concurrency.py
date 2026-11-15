"""Synthetic fixtures only. Real local sessions; no hosted credentials or network."""
from pathlib import Path
import os,json,subprocess,uuid,time
root=Path(__file__).resolve().parents[4]; ev=Path(__file__).parent
assert os.environ.get('PGHOST','').startswith('/tmp/'), 'explicit local socket required'
db='audit_batch1_preflight_'+uuid.uuid4().hex[:10]
env={k:os.environ[k] for k in ('PATH','HOME','PGHOST','PGPORT','PGUSER')}
env.update(PGOPTIONS='-c search_path=public,extensions',PGDATABASE=db)
forward=(root/'supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql').read_text()
body=forward.replace('begin;','',1);body=body[:body.rfind('\ncommit;')]
results=[]
def check(name,ok):
 assert ok,name
 results.append(name);print('PASS '+name,flush=True)
def call(query,database=db,fail=False):
 p=subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',database],input=query,env=env,text=True,capture_output=True)
 if not fail and p.returncode:raise RuntimeError(p.stderr)
 return p

def sql(query):return call(query).stdout.strip()
def apply(path):return call(Path(path).read_text())
def fingerprint():
 tables=['orders','payments','purchases','wallet_ledger','referrals','products','provider_events','payment_captures','payment_compensations','payment_jobs','play_payment_jobs','ucb_external_refunds','wallet_order_reservations','first_discount_reservations','notes_choice_checkouts']
 return sql('select jsonb_build_array('+','.join("(select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public."+t+' t)' for t in tables)+')')
def metadata():
 return sql("select jsonb_agg(jsonb_build_object('name',proname,'definition',pg_get_functiondef(oid),'acl',proacl::text) order by proname) from pg_proc where pronamespace='public'::regnamespace and proname in ('reverse_refunded_capture','queue_capture_compensation','settle_razorpay_payment','user_can_access_note')")
def worker(query,name):
 return subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1'],env={**env,'PGAPPNAME':name},stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def start(query,name):
 p=worker(query,name);p.stdin.write(query);p.stdin.close();p.stdin=None;return p
def finish(p):
 out,err=p.communicate(timeout=12);assert p.returncode==0,(out,err);return out.strip()
def locked(name):
 for _ in range(120):
  if sql("select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='"+name+"' and l.granted and l.locktype in ('advisory','relation') and (l.locktype='advisory' or l.mode='AccessExclusiveLock')")!='0':return
  time.sleep(.02)
 raise AssertionError('expected lock not observed')
def fixture(n,wallet=False):
 user='ab130000-0000-4000-8000-'+str(n).zfill(12)
 sql("insert into auth.users(id,email) values('"+user+"','preflight"+str(n)+"@example.invalid');update public.profiles set course_id='bams' where id='"+user+"'")
 if wallet:sql("select set_config('app.trusted_order_write','true',false);insert into wallet_ledger(user_id,entry_type,status,amount,source) values('"+user+"','credit','available',10,'admin_adjustment')")
 j=json.loads(sql("select create_priced_order('"+user+"','seed_product',"+str(wallet).lower()+")"));assert j['ok'],j
 oid='order_Preflight'+str(n);pid='pay_Preflight'+str(n)
 sql("update orders set razorpay_order_id='"+oid+"' where id='"+j['order_id']+"'")
 amount=int(sql("select round(amount*100)::bigint from orders where id='"+j['order_id']+"'"))
 if wallet:assert sql("select wallet_amount from orders where id='"+j['order_id']+"'")=='10.00'
 return dict(user=user,id=j['order_id'],oid=oid,pid=pid,amount=amount)
def grant(f,event='grant'):
 return "select settle_razorpay_payment('evt_pf_"+event+"','"+f['oid']+"','"+f['pid']+"',"+str(f['amount'])+",now());"
def lock(f):return "select pg_advisory_xact_lock(hashtextextended('wallet:"+f['user']+"',0));"
def access(f):return sql("select user_can_access_note('"+f['user']+"','seed_note')")=='t'
try:
 call('create database '+db,database='postgres')
 apply(root/'supabase/tests/support/supabase_stub.sql')
 for m in sorted((root/'supabase/migrations').glob('*.sql')):
  if m.name!='20261112104610_audit_batch1_refund_revocation.sql':apply(m)

 live=json.loads((ev/'production-schema.json').read_text())
 for f in live['functions']:
  if f['name'] in ('reverse_refunded_capture','queue_capture_compensation'):continue
  row=json.loads(sql("select jsonb_build_object('definition',pg_get_functiondef(oid),'acl',proacl::text) from pg_proc where pronamespace='public'::regnamespace and proname='"+f['name']+"'"))
  assert row['definition']==f['definition'] and row['acl']==f['acl'],f['name']+' production dependency drift'
 check('all captured existing dependency RPC definitions/ACLs match current production',True)
 tables=sorted(set(x['table_name'] for x in live['columns']))
 cols=json.loads(sql("select jsonb_agg(jsonb_build_array(table_name,column_name,data_type)) from information_schema.columns where table_schema='public' and table_name in ("+','.join("'"+x+"'" for x in tables)+")"))
 assert sorted(tuple(x) for x in cols)==sorted((x['table_name'],x['column_name'],x['data_type']) for x in live['columns'])
 check('all captured dependency-table column names/types match current production',True)
 apply(root/'supabase/tests/support/seed.sql')
 sql("update referral_settings set enabled=true,require_verified_phone=false,wallet_max_percent=50 where id=true")
 # Original valid financial rows and durable pending/parked queue facts precede DDL.
 original=fixture(1);sql(grant(original,'before'));check('baseline legitimate purchase grants paid PDF',access(original))
 sql("select record_provider_event('evt_pf_pending','payment.dispute.created',null,'pay_PfPending','disp_PfPending',repeat('a',64),null);select record_provider_event('evt_pf_parked','refund.processed',null,'pay_PfParked','rfnd_PfParked',repeat('b',64),null);update provider_events set status='parked' where event_id='evt_pf_parked';select record_payment_capture('pay_PfOrphan','order_PfOrphan',4900,null);insert into payment_compensations(payment_id,amount_paise,reason,refund_request_id) values('pay_PfOrphan',4900,'unknown_order','medveda_comp_pf_orphan');insert into payment_jobs(kind,target_id,deadline_at) values('events','evt_pf_pending',now()+interval '1 day');")
 before=fingerprint();meta=metadata()
 p=call('begin;set local lock_timeout=\'1s\';set local statement_timeout=\'5s\';'+body+'\nselect 1/0;commit;',fail=True)
 check('forced deployment error rolls back every definition/ACL and all financial/queue rows',p.returncode!=0 and metadata()==meta and fingerprint()==before)
 # Blocked SQL-function validation must abort safely rather than wait unboundedly.
 blocker=start("begin;lock table public.orders in access exclusive mode;select pg_sleep(1.5);commit;",'pf_ddl_lock')
 locked('pf_ddl_lock')
 p=call("begin;set local lock_timeout='200ms';set local statement_timeout='3s';"+body+'\ncommit;',fail=True)
 finish(blocker)
 check('DDL lock timeout leaves schema and financial/queue state unchanged',p.returncode!=0 and 'lock timeout' in p.stderr and metadata()==meta and fingerprint()==before)
 call(forward);check('forward migration changes no existing financial or pending/parked queue rows',fingerprint()==before)
 applied=metadata();call(forward)
 check('migration replay is definition/ACL/data idempotent',metadata()==applied and fingerprint()==before)
 check('historical legitimate purchase survives both applications',access(original))
 subprocess.run(['node',str(ev/'legacy-handlers.cjs')],cwd=root,env={**env,'WH_DB':db},check=True)
 check('exact unchanged deployed payment handlers remain compatible after migration',True)
 # Replacing definitions during a real pending payment transaction is compatible.
 f=fixture(2);w=start('begin;'+lock(f)+'select pg_sleep(1);'+grant(f,'during_ddl')+'commit;','pf_migrate_active')
 locked('pf_migrate_active');call(forward);finish(w)
 check('migration can coexist with in-flight legacy settlement without duplicate entitlement',access(f) and sql("select count(*) from purchases where order_id='"+f['id']+"'")=='1')
 # Parallel client/webhook calls grant once.
 f=fixture(3);workers=[start(grant(f,'duplicate_'+str(n)),'pf_duplicate_'+str(n)) for n in range(4)]
 for w in workers:finish(w)
 check('four concurrent callback/webhook settlements create one payment and one purchase',sql("select count(*) from purchases where order_id='"+f['id']+"'")=='1' and sql("select count(*) from payments where order_id='"+f['id']+"'")=='1')
 # Capture grant and refund in each serialized order; wallet restores only when debited.
 for n,refund_first in [(4,False),(5,True)]:
  f=fixture(n,True);sql("select record_payment_capture('"+f['pid']+"','"+f['oid']+"',"+str(f['amount'])+",null)")
  reverse="select reverse_refunded_capture('"+f['pid']+"');"
  first,second=(reverse,grant(f,'refund_first')) if refund_first else (grant(f,'grant_first'),reverse)
  name='pf_refund_'+str(n);a=start('begin;'+lock(f)+'select pg_sleep(1);'+first+'commit;',name);locked(name);b=start(second,name+'_waiting');finish(a);finish(b)
  check(('refund then capture' if refund_first else 'capture then refund')+' concurrency cannot retain PDF or duplicate wallet restoration',not access(f) and sql("select count(*) from wallet_ledger where order_id='"+f['id']+"' and source='order_refund' and entry_type='credit'")==('0' if refund_first else '1'))
 f=fixture(6,True);sql(grant(f,'duplicate_refund'));workers=[start("select reverse_refunded_capture('"+f['pid']+"');",'pf_dup_refund_'+str(n)) for n in range(4)]
 for w in workers:finish(w)
 check('four concurrent full refunds restore buyer wallet once',not access(f) and sql("select count(*) from wallet_ledger where order_id='"+f['id']+"' and source='order_refund' and entry_type='credit'")=='1')
 f=fixture(7);sql("select record_payment_capture('"+f['pid']+"','"+f['oid']+"',"+str(f['amount'])+",null)")
 a=start('begin;'+lock(f)+'select pg_sleep(1);'+grant(f,'queue_race')+'commit;','pf_queue_race');locked('pf_queue_race')
 b=start("select queue_capture_compensation('"+f['pid']+"');",'pf_queue_wait');finish(a);out=finish(b)
 check('queued-compensation race waits for grant and cannot publish refund obligation',out=='retry' and access(f) and sql("select count(*) from payment_compensations where payment_id='"+f['pid']+"'")=='0')
 # Technical rollback in local DB only: never an approved production strategy.
 baseline=json.loads((root/'supabase/releases/audit-batch1-20261112/production-contracts.json').read_text())
 definitions='\n'.join(f['definition'].rstrip()+';' for f in baseline['functions'] if f['name'] in ('settle_razorpay_payment','user_can_access_note'))
 changed=fingerprint()
 call('begin;'+definitions+'drop function public.reverse_refunded_capture(text);drop function public.queue_capture_compensation(text);commit;')
 check('local schema rollback restores original definitions/ACLs without undoing financial/queue rows',metadata()==meta and fingerprint()==changed and access(original))
 check('already reversed purchases stay revoked after schema-only rollback',sql("select count(*) from purchases where order_id in (select id from orders where razorpay_order_id in ('order_Preflight4','order_Preflight5','order_Preflight6')) and status='success'")=='0')
 call(forward);check('forward reapplication after local rollback preserves all financial/queue rows',fingerprint()==changed)
 check('new RPCs are service-only',sql("select not has_function_privilege('anon','reverse_refunded_capture(text)','execute') and not has_function_privilege('authenticated','reverse_refunded_capture(text)','execute') and not has_function_privilege('anon','queue_capture_compensation(text)','execute') and not has_function_privilege('authenticated','queue_capture_compensation(text)','execute') and has_function_privilege('service_role','reverse_refunded_capture(text)','execute') and has_function_privilege('service_role','queue_capture_compensation(text)','execute')")=='t')
 (ev/'local-preflight-results.json').write_text(json.dumps({'status':'PASS','checks':results,'scope':'synthetic fixtures, real local PostgreSQL; no production backup restored'},indent=2)+'\n')
finally:
 call('drop database if exists '+db,database='postgres')
