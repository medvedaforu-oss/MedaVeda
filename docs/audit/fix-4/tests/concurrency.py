import subprocess,os,json,time,concurrent.futures
assert os.environ.get('PGHOST')=='/tmp/medveda-fix4-socket'
def sql(q,check=True):
 r=subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d','fix4_current','-c',q],text=True,capture_output=True)
 if check and r.returncode:raise AssertionError(r.stderr)
 return r
admin='f4300000-0000-0000-0000-000000000001'; buyer='f4300000-0000-0000-0000-000000000002'; other='f4300000-0000-0000-0000-000000000003'
sql(f"insert into auth.users(id,email)values('{admin}','fix4raceadmin@example.invalid'),('{buyer}','fix4racebuyer@example.invalid');insert into public.admins(id,email)values('{admin}','fix4raceadmin@example.invalid')")
payload='{"title":"Fix4 concurrency","body":"Synthetic","type":"announcement"}'
reserve=f"select public.reserve_notification_request('{admin}','f4300000-0000-0000-0000-000000000004','{payload}')"
with concurrent.futures.ThreadPoolExecutor(2) as pool:results=list(pool.map(lambda _:json.loads(sql(reserve).stdout),range(2)))
assert sum(r['reserved'] for r in results)==1
assert sql("select count(*) from public.notifications where title='Fix4 concurrency'").stdout.strip()=='1'
print('PASS ADM-03 two independent concurrent duplicate requests reserve/persist once')
initial=int(sql('select count(*) from public.profiles').stdout.strip())
query=f"select set_config('request.jwt.claim.sub','{admin}',false); select pg_sleep(1),public.get_admin_analytics(null);"
with concurrent.futures.ThreadPoolExecutor(2) as pool:
 pending=pool.submit(sql,query);time.sleep(.25)
 sql(f"insert into auth.users(id,email)values('{other}','fix4racesnapshot@example.invalid')")
 snapshot=json.loads(pending.result().stdout.strip().split('\n')[-1].lstrip('|'))
assert snapshot['totalUsers']==initial,(snapshot,initial)
after=json.loads(sql(f"select set_config('request.jwt.claim.sub','{admin}',false);select public.get_admin_analytics(null)").stdout.strip().split('\n')[-1])
assert after['totalUsers']==initial+1
print('PASS ADM-08 concurrent insert committed during statement: single snapshot excludes it, next snapshot includes it')
sql(f"insert into public.wallet_ledger(user_id,entry_type,status,amount,source)values('{buyer}','credit','available',100,'admin_adjustment')")
with concurrent.futures.ThreadPoolExecutor(2) as pool:
 debits=list(pool.map(lambda _:sql(f"insert into public.wallet_ledger(user_id,entry_type,status,amount,source)values('{buyer}','debit','available',80,'order_payment')",False),range(2)))
assert sum(r.returncode==0 for r in debits)==1,[r.stderr for r in debits]
assert sql(f"select available from public.wallet_balance_of('{buyer}')").stdout.strip()=='20.00'
print('PASS BACK-11 two independent concurrent debit sessions cannot spend the same credit')
