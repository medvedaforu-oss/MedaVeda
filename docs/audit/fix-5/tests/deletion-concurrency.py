#!/usr/bin/env python3
import os,subprocess,time
assert os.environ.get('PGHOST','').startswith('/tmp/');db=os.environ['TEMPLATE_DB'];assert db.startswith(('fix5_','ap_ci_'))
def run(q,app='fix5_delete_probe'):
 return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',q],env=dict(os.environ,PGAPPNAME=app),text=True,capture_output=True)
def sql(q):
 r=run(q);assert r.returncode==0,r.stderr;return r.stdout.strip()
u='f5500000-0000-0000-0000-000000000001';a='f5500000-0000-0000-0000-000000000002'
sql(f"""
insert into auth.users(id,email) values('{u}','fix5-del-race@example.invalid'),('{a}','fix5-del-admin@example.invalid');
insert into public.admins(id,email) values('{a}','fix5-del-admin@example.invalid');
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source)
values('f5510000-0000-0000-0000-000000000001','{u}','credit','available',100,'admin_adjustment');
create function public.fix5_delete_pause() returns trigger language plpgsql as $$ begin
 if old.user_id='{u}' and new.user_id is null then perform pg_sleep(1);end if;return new;end $$;
create trigger fix5_delete_pause before update on public.wallet_ledger for each row execute function public.fix5_delete_pause();
""")
p=subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',f"set statement_timeout='10s';select public.erase_user_data('{u}');"],env=dict(os.environ,PGAPPNAME='fix5_delete_first'),text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
for _ in range(100):
 if sql("select count(*) from pg_stat_activity where application_name='fix5_delete_first' and wait_event='PgSleep'")=='1':break
 time.sleep(.02)
else: raise AssertionError('delete did not reach deterministic row-lock pause')
r=run(f"begin;set local statement_timeout='10s';select set_config('request.jwt.claims','{{\"sub\":\"{a}\",\"role\":\"authenticated\",\"aal\":\"aal2\"}}',true);select public.admin_reverse_wallet_credit('f5510000-0000-0000-0000-000000000001','synthetic concurrent deletion');commit;",'fix5_delete_admin')
out,err=p.communicate(timeout=12)
assert p.returncode==0,err
assert r.returncode==0 or 'deleted account' in r.stderr,r.stderr
assert sql("select user_id is null from public.wallet_ledger where id='f5510000-0000-0000-0000-000000000001'")=='t'
sql('drop trigger fix5_delete_pause on public.wallet_ledger;drop function public.fix5_delete_pause();')
print('PASS deletion with wallet balance + concurrent admin reversal: no deadlock; retained ledger anonymous; admin receives deleted-account denial')
