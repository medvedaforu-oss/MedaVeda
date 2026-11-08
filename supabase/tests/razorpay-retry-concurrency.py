#!/usr/bin/env python3
"""Real local PostgreSQL sessions: deterministic user-lock interleavings.
Requires TEMPLATE_DB with migrated scratch schema; never run on production.
"""
import os,subprocess,time
DB=os.environ['TEMPLATE_DB']
assert DB.startswith('ap_ci_'), 'scratch database required'
def sql(query,app=None):
 env=dict(os.environ,PGAPPNAME=app or 'razor_retry_check')
 return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',DB,'-c',query],env=env,text=True).strip()
def worker(query,app):
 return subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',DB,'-c',query],env=dict(os.environ,PGAPPNAME=app),stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def wait_locked(app):
 for _ in range(100):
  if sql("select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where l.locktype='advisory' and l.granted and a.application_name='"+app+"'")=='1':return
  time.sleep(.02)
 raise AssertionError('worker did not acquire user lock')
def finish(p):
 out,err=p.communicate(timeout=12)
 assert p.returncode==0,(out,err)
 return out
sql("""
insert into auth.users(id,email) values
 ('d9200000-0000-4000-8000-000000000001','fix-race-referrer@example.invalid'),
 ('d9200000-0000-4000-8000-000000000002','fix-race-create-first@example.invalid'),
 ('d9200000-0000-4000-8000-000000000003','fix-race-settle-first@example.invalid');
update public.profiles set course_id='bams' where id::text like 'd9200000-%';
update public.referral_settings set enabled=true,friend_discount_percent=10,friend_discount_max=100,require_verified_phone=false where id=true;
insert into public.referrals(referrer_id,referred_id,code_used,status) values
 ('d9200000-0000-4000-8000-000000000001','d9200000-0000-4000-8000-000000000002','FIX','pending'),
 ('d9200000-0000-4000-8000-000000000001','d9200000-0000-4000-8000-000000000003','FIX','pending');
insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type)
values('fix_race_a','A','chapter',500,'seed_c','bams',true,'notes'),('fix_race_b','B','chapter',500,'seed_c','bams',true,'notes');
create table public.fix_retry_race(kind text,id text);
""")
for scenario,suffix in [('create_first','2'),('settle_first','3')]:
 uid='d9200000-0000-4000-8000-00000000000'+suffix
 old=sql("select public.create_priced_order('"+uid+"','fix_race_a',false)->>'order_id'")
 provider='order_fix_race_'+scenario
 sql("update public.orders set razorpay_order_id='"+provider+"' where id='"+old+"'")
 lock="select pg_advisory_xact_lock(hashtextextended('wallet:"+uid+"',0));select pg_sleep(1);"
 create="with r as(select public.create_priced_order('"+uid+"','fix_race_b',false) j) insert into public.fix_retry_race select '"+scenario+"',j->>'order_id' from r;"
 settle="select public.settle_razorpay_payment('evt_"+scenario+"','"+provider+"','pay_"+scenario+"',45000,now());"
 first,second=(create,settle) if scenario=='create_first' else (settle,create)
 app='razor_retry_'+scenario
 p1=worker("begin;set local statement_timeout='8s';"+lock+first+'commit;',app)
 wait_locked(app)
 p2=worker("set statement_timeout='8s';"+second,app+'_other')
 finish(p1);finish(p2)
 new=sql("select id from public.fix_retry_race where kind='"+scenario+"'")
 assert sql("select referral_discount from public.orders where id='"+new+"'")==('50.00' if scenario=='create_first' else '0.00')
 if scenario=='create_first':
  assert sql("select reason from public.payment_compensations where order_id='"+old+"'")=='stale_discount'
  sql("update public.orders set razorpay_order_id='order_fix_race_new' where id='"+new+"'")
  # Two real sessions settle the live discounted replacement simultaneously.
  ps=[worker("select public.settle_razorpay_payment('evt_fix_new_"+str(n)+"','order_fix_race_new','pay_fix_race_new',45000,now());",app+'_dup'+str(n)) for n in range(2)]
  for p in ps:finish(p)
  assert sql("select count(*) from public.purchases where order_id='"+new+"' and status='success'")=='1'
 else:
  assert sql("select count(*) from public.purchases where order_id='"+old+"' and status='success'")=='1'
 print('PASS real concurrent retry/settlement '+scenario+': no deadlock, single discount grant, correct late capture/retry price')
