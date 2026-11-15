#!/usr/bin/env python3
import os,subprocess,time
assert os.environ.get('PGHOST','').startswith('/tmp/');db=os.environ['TEMPLATE_DB'];assert db.startswith(('fix5_','ap_ci_'))
u='f5400000-0000-0000-0000-000000000002'
def run(q):return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',q],text=True,capture_output=True)
r=run(f"insert into auth.users(id,email) values('{u}','fix5-new-deposit-race2@example.invalid');");assert r.returncode==0,r.stderr
# The spender's transaction starts first, but the deposit commits before its debit.
a=subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',f"begin;set local statement_timeout='10s';select pg_sleep(1.5);insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('{u}','debit','available',100,'order_payment');commit;"],env=dict(os.environ,PGAPPNAME="fix5_new_credit_first"),text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
for _ in range(100):
 r=run("select count(*) from pg_stat_activity where application_name='fix5_new_credit_first' and wait_event='PgSleep'")
 if r.stdout.strip()=='1':break
 time.sleep(.02)
else:raise AssertionError('spender did not reach synchronization point')
b=run(f"begin;insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('{u}','credit','available',100,'admin_adjustment');select pg_sleep(.5);commit;")
assert b.returncode==0,b.stderr
out,err=a.communicate(timeout=12);assert a.returncode==0,err
r=run(f"select available from public.wallet_balance_of('{u}');");assert r.returncode==0,r.stderr;assert r.stdout.strip()=='0.00'
print('PASS older spending transaction consumes a later committed credit under owner lock; no timestamp-based false shortfall')
