#!/usr/bin/env python3
import os,subprocess,time
assert os.environ.get('PGHOST','').startswith('/tmp/'),'local socket required'
db=os.environ['TEMPLATE_DB'];assert db.startswith(('fix5_','ap_ci_'))
def sql(q):return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',q],text=True).strip()
u='f5600000-0000-0000-0000-000000000001';f='f5600000-0000-0000-0000-000000000002'
sql(f"""
insert into auth.users(id,email) values('{u}','fix5-held-owner@example.invalid'),('{f}','fix5-held-friend@example.invalid');
insert into public.admins(id,email) values('{u}','fix5-held-owner@example.invalid');
insert into public.referrals(id,referrer_id,referred_id,code_used,status) values('f5610000-0000-0000-0000-000000000001','{u}','{f}','HELD','qualified');
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,status)
values('fix5-held','{f}','seed_product','chapter','seed_c','bams',49,49,'paid');
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,referral_id,order_id,created_at,available_at,expires_at)
values('f5620000-0000-0000-0000-000000000001','{u}','credit','pending',20,'referral_reward','f5610000-0000-0000-0000-000000000001','fix5-held',now()-interval '2 days',now()-interval '1 day',now()-interval '1 day'+interval '0.3 seconds');
insert into public.order_review_flags(id,order_id,user_id,reason,wallet_amount,referral_discount,details)
values('f5630000-0000-0000-0000-000000000001','fix5-held','{u}','referral_shared_network',0,0,'{{}}');
""")
assert sql(f"select public.release_due_wallet_credits('{u}')")=='0'
assert sql(f"select pending from public.wallet_balance_of('{u}')")=='20.00'
assert sql("select status from public.wallet_ledger where id='f5620000-0000-0000-0000-000000000001'")=='pending'
sql(f"""begin;
select set_config('request.jwt.claims','{{"sub":"{u}","role":"authenticated","aal":"aal2"}}',true);
select public.admin_resolve_order_flag('f5630000-0000-0000-0000-000000000001','Synthetic approval');
select public.release_due_wallet_credits('{u}');
do $$ begin
 assert (select available=20 from public.wallet_balance_of('{u}')),'newly approved credit must be available';
 assert (select effective_expires_at=now()+interval '0.3 seconds' from public.wallet_credit_policy where credit_id='f5620000-0000-0000-0000-000000000001'),'clock did not start at approval/release';
end $$;commit;""")
# A new transaction after the real clock boundary, no ledger timestamp edits.
time.sleep(.45)
assert sql(f"select available from public.wallet_balance_of('{u}')")=='0.00'
assert sql(f"select count(*)||'/'||sum(amount) from public.wallet_ledger where user_id='{u}' and entry_type='expiry'")=='1/20.00'
assert sql(f"select public.expire_due_wallet_credits('{u}')")=='0'
print('PASS actual shared-network hold -> admin approval -> first availability -> real-clock expiry20 once; no ledger stamp rewrite')
