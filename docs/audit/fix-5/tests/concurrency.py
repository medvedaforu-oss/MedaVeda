#!/usr/bin/env python3
"""Synthetic local-only PostgreSQL sessions. Never accepts a remote host."""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
host=os.environ.get('PGHOST','')
assert host.startswith('/tmp/'), 'disposable local socket required'
db=os.environ.get('TEMPLATE_DB','')
assert db.startswith(('fix5_','ap_ci_')), 'disposable database required'
def sql(q):
 r=subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',q],text=True,capture_output=True)
 if r.returncode: raise AssertionError(r.stderr)
 return r.stdout.strip()
def parallel(queries):
 def run(q):
  return sql("begin;set local statement_timeout='12s';"+q+"commit;")
 with ThreadPoolExecutor(max_workers=len(queries)) as ex:
  return list(ex.map(run,queries))
mode=sys.argv[1] if len(sys.argv)>1 else 'expiry'
if mode=='reciprocal':
 a='f5800000-0000-0000-0000-000000000001';b='f5800000-0000-0000-0000-000000000002'
 sql(f"""
 insert into auth.users(id,email) values('{a}','fix5-recip-a@example.invalid'),('{b}','fix5-recip-b@example.invalid');
 insert into public.referrals(referrer_id,referred_id,code_used,status) values('{a}','{b}','RECIP1','rewarded'),('{b}','{a}','RECIP2','rewarded');
 insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,provider,amount,list_price,status,razorpay_order_id,razorpay_payment_id)
 values('fix5-recip-a','{a}','seed_product','chapter','seed_c','bams','razorpay',49,49,'paid','order_fix5_recip_a','pay_fix5_recip_a'),
 ('fix5-recip-b','{b}','seed_product','chapter','seed_c','bams','razorpay',49,49,'paid','order_fix5_recip_b','pay_fix5_recip_b');
 insert into public.wallet_ledger(user_id,entry_type,status,amount,source,order_id,referral_id)
 select '{b}','credit','available',50,'referral_reward','fix5-recip-a',id from public.referrals where referred_id='{a}';
 insert into public.wallet_ledger(user_id,entry_type,status,amount,source,order_id,referral_id)
 select '{a}','credit','available',50,'referral_reward','fix5-recip-b',id from public.referrals where referred_id='{b}';
 create function public.fix5_refund_pause() returns trigger language plpgsql as $$ begin
  if new.id in('fix5-recip-a','fix5-recip-b') and new.status='refunded' then perform pg_sleep(0.6); end if;return new;end $$;
 create trigger fix5_refund_pause before update on public.orders for each row execute function public.fix5_refund_pause();
 """)
 parallel(["select public.handle_payment_refund('pay_fix5_recip_a',true);","select public.handle_payment_refund('pay_fix5_recip_b',true);"])
 assert sql(f"select sum(available) from (select available from public.wallet_balance_of('{a}') union all select available from public.wallet_balance_of('{b}')) b")=='0.00'
 sql('drop trigger fix5_refund_pause on public.orders;drop function public.fix5_refund_pause();')
 print('PASS WR-05 reciprocal provider refunds: two real sessions, no deadlock, no negative funds')
else:
 u='f5900000-0000-0000-0000-000000000001'
 sql(f"""
 insert into auth.users(id,email) values('{u}','fix5-expiry-race@example.invalid');
 update public.profiles set course_id='bams' where id='{u}';
 insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type)
 values('fix5-race-product','Synthetic race','chapter',500,'seed_c','bams',true,'notes');
 insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,provider,amount,list_price,wallet_amount,status,razorpay_order_id,razorpay_payment_id)
 values('fix5-old-order','{u}','seed_product','chapter','seed_c','bams','razorpay',9,49,40,'paid','order_fix5_race_old','pay_fix5_race_old'),
 ('fix5-new-order','{u}','fix5-race-product','chapter','seed_c','bams','razorpay',420,500,80,'created','order_fix5_race_new',null);
 insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,expires_at)
 values('f5910000-0000-0000-0000-000000000001','{u}','credit','available',100,'admin_adjustment',now()-interval '40 days',now()-interval '10 days');
 -- Historical fixture only; runtime sessions use all ordinary triggers.
 alter table public.wallet_ledger disable trigger wallet_ledger_03_no_overdraw;
 insert into public.wallet_ledger(user_id,entry_type,status,amount,source,order_id,created_at)
 values('{u}','debit','available',40,'order_payment','fix5-old-order',now()-interval '35 days');
 alter table public.wallet_ledger enable trigger wallet_ledger_03_no_overdraw;
 insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('{u}','credit','available',100,'admin_adjustment');
 insert into public.wallet_order_reservations(order_id,user_id,amount,expires_at) values('fix5-new-order','{u}',80,now()+interval '30 minutes');
 """)
 parallel([f"select public.expire_due_wallet_credits('{u}');select pg_sleep(0.2);",
 "select public.settle_razorpay_payment('evt_fix5_race_new','order_fix5_race_new','pay_fix5_race_new',42000,now());",
 "select public.handle_payment_refund('pay_fix5_race_old',true);"])
 assert sql(f"select available from public.wallet_balance_of('{u}')")=='60.00'
 assert sql(f"select count(*)||'/'||sum(amount) from public.wallet_ledger where user_id='{u}' and entry_type='expiry'")=='1/60.00'
 assert sql("select count(*) from public.purchases where order_id='fix5-new-order' and status='success'")=='1'
 assert sql(f"select count(*) from public.wallet_ledger where user_id='{u}' and source='order_refund'")=='1'
 parallel([f"select public.expire_due_wallet_credits('{u}');","select public.handle_payment_refund('pay_fix5_race_old',true);"])
 assert sql(f"select available from public.wallet_balance_of('{u}')")=='60.00'
 print('PASS concurrent checkout settlement + expiry + refund: 3 real sessions, balance60, expiry60 once, restore40 once, grant once; replay stable')
