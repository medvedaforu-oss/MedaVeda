"""Disposable local PG17 only. Never uses hosted credentials or provider networking."""
import os,pathlib,subprocess,tempfile
root=pathlib.Path(__file__).resolve().parents[2]
bin=pathlib.Path('/usr/lib/postgresql/17/bin');d=pathlib.Path(tempfile.mkdtemp(prefix='medveda-compensation-pg-'))
env={k:os.environ[k] for k in ('PATH','LANG') if k in os.environ}
env.update(PGHOST=str(d),PGPORT='55487',PGUSER='postgres',PGDATABASE='postgres',PGOPTIONS='-c search_path=public,extensions')
def run(args,ok=True):
 p=subprocess.run([str(x) for x in args],cwd=root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if ok and p.returncode:raise RuntimeError(p.stdout[-8000:])
 return p
def sql(s):return run([bin/'psql','-XqAt','-v','ON_ERROR_STOP=1','-c',s]).stdout.strip()
def file(p,ok=True):return run([bin/'psql','-XqAt','-v','ON_ERROR_STOP=1','-f',p],ok)
run([bin/'initdb','-D',d/'data','--auth=trust','--no-locale','-U','postgres'])
run([bin/'pg_ctl','-D',d/'data','-l',d/'server.log','-o',f"-k {d} -p 55487 -h '' -c shared_buffers=16MB -c max_connections=12",'-w','start'])
try:
 file('supabase/tests/support/supabase_stub.sql')
 migration=next((root/'supabase/migrations').glob('*_razorpay_compensation_consumer_fence.sql'))
 for p in sorted((root/'supabase/migrations').glob('*.sql')):
  if p!=migration:file(p)
 file('supabase/tests/support/seed.sql')
 red=file('supabase/tests/razorpay_compensation_consumer_checks.sql',False)
 assert red.returncode and 'claim_razorpay_compensation' in red.stdout,red.stdout
 print('PASS RED missing compensation consumer RPC reproduced',flush=True)
 fingerprint="select jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,pg_get_functiondef(p.oid)) order by p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'"
 before=sql(fingerprint)
 file(migration);file(migration)
 print(file('supabase/tests/razorpay_compensation_consumer_checks.sql').stdout,flush=True)
 # Run only the related permissions suite, using synthetic rolled-back rows.
 print(file('supabase/tests/final_product_permissions_checks.sql').stdout,flush=True)
 # Model cron/pg_net/Vault without extensions, outbound networking or real secrets.
 sql("""create schema if not exists cron;create schema net;create schema vault;
 alter table cron.job add column active boolean default true;
 alter table cron.job add unique(jobname);
 create or replace function cron.schedule(job_name text,schedule text,command text) returns bigint language sql as $$
 insert into cron.job(jobname,schedule,command) values($1,$2,$3)
 on conflict(jobname) do update set schedule=$2,command=$3 returning jobid $$;
 create table vault.decrypted_secrets(name text,decrypted_secret text);
 create table net.fixture_calls(url text,body jsonb,headers jsonb,timeout_ms integer);
 create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds integer default 2000)
 returns bigint language plpgsql as $$begin
 insert into net.fixture_calls values(url,body,headers,timeout_milliseconds);return 1;end $$;""")
 rejected=file('supabase/operations/razorpay-compensation-scheduler.sql',False)
 assert rejected.returncode and 'Unique worker secret' in rejected.stdout
 sql("insert into vault.decrypted_secrets values('razorpay_compensation_worker_secret',repeat('x',64))")
 file('supabase/operations/razorpay-compensation-scheduler.sql');file('supabase/operations/razorpay-compensation-scheduler.sql')
 command=sql("select command from cron.job where jobname='razorpay-compensation'")
 sql(command)
 sql("""do $$begin
 assert (select count(*)=1 from cron.job where jobname='razorpay-compensation');
 assert (select schedule='* * * * *' from cron.job where jobname='razorpay-compensation');
 assert (select url='https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/razorpay-compensation-worker'
 and body='{}'::jsonb and headers->>'x-razorpay-compensation-secret'=repeat('x',64)
 and timeout_ms=120000 from net.fixture_calls);
 end $$""")
 print('PASS scheduler missing-secret denial, idempotent configuration and synthetic HTTP dispatch',flush=True)
 # Independent PostgreSQL sessions must claim one job exactly once.
 sql("""insert into public.payment_captures(payment_id,razorpay_order_id,amount_paise,status,failure_reason)
 values('pay_concurrency','order_concurrency',4900,'compensation_pending','unknown_order');
 insert into public.payment_compensations(payment_id,amount_paise,reason,refund_request_id)
 values('pay_concurrency',4900,'unknown_order','medveda_comp_'||md5('pay_concurrency'));""")
 claim="select public.claim_razorpay_compensation(now()-interval '1 hour')"
 args=[str(bin/'psql'),'-XqAt','-v','ON_ERROR_STOP=1','-c',claim]
 a=subprocess.Popen(args,env=env,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 b=subprocess.Popen(args,env=env,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 ao,ae=a.communicate();bo,be=b.communicate()
 assert a.returncode==b.returncode==0,(ae,be)
 assert sum('pay_concurrency' in x for x in [ao,bo])==1,(ao,bo)
 print('PASS two independent PostgreSQL sessions claim exactly one lease',flush=True)
 import json
 job=json.loads(ao.strip() or bo.strip())
 dispatch="select public.prepare_razorpay_compensation('pay_concurrency','"+job['worker_lease_id']+"',true)"
 args[-1]=dispatch
 a=subprocess.Popen(args,env=env,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 b=subprocess.Popen(args,env=env,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 ao,ae=a.communicate();bo,be=b.communicate()
 assert a.returncode==b.returncode==0,(ae,be)
 assert sum('pay_concurrency' in x for x in [ao,bo])==1,(ao,bo)
 print('PASS two independent PostgreSQL sessions authorize exactly one refund dispatch',flush=True)

 # Verify existing payment functions remain byte-identical after the additive change.
 names=['claim_razorpay_compensation','prepare_razorpay_compensation','finish_razorpay_compensation']
 after=sql(fingerprint+" and p.proname not in ('"+"','".join(names)+"')")
 assert before==after,'existing function bodies changed'
 print('PASS idempotent migration; all existing function definitions preserved',flush=True)
 print('LOCAL_FIXTURE_SOCKET='+str(d),flush=True)
finally:run([bin/'pg_ctl','-D',d/'data','-m','fast','-w','stop'])
