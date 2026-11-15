"""Only disposable /tmp PostgreSQL; DDL lock/rollback and ACL acceptance."""
import os, subprocess, time
from pathlib import Path
assert os.environ['PGHOST'].startswith('/tmp/medveda-phase-a-final/')
assert os.environ['PGDATABASE'].startswith('mv003_')
def sql(q):
    return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',q],text=True,stderr=subprocess.PIPE).strip()
def check(ok,label):
    assert ok,label
    print('PASS '+label,flush=True)
names="'razorpay_entitlement_committed','guard_razorpay_order_transition','guard_purchase_success_ownership'"
check(sql(f"select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ({names}) and prosecdef and proowner='postgres'::regrole and proconfig @> array['search_path=pg_catalog, public, pg_temp']")=='3','all new functions trusted postgres owner, fixed search path, SECURITY DEFINER')
check(sql(f"select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ({names}) and (has_function_privilege('anon',oid,'execute') or has_function_privilege('authenticated',oid,'execute'))")=='0','all new functions deny client execute')
check(sql("select has_function_privilege('service_role','public.razorpay_entitlement_committed(text,text)','execute')")=='t','service role can execute proof')
# The baseline's default privileges also grant service_role trigger-function execute.
print('INFO actual new function ACLs: '+sql(f"select string_agg(proname||':'||proacl::text,'; ' order by proname) from pg_proc where pronamespace='public'::regnamespace and proname in ({names})"),flush=True)
check(sql("select tgname from pg_trigger where tgrelid='public.purchases'::regclass and not tgisinternal and (tgtype::int & 2)=2 order by tgname desc limit 1")=='purchases_zz_success_ownership','ownership guard runs after existing BEFORE snapshot triggers')
# Block the purchase advisory lock, verify timeout rolls back a multi-step grant.
u='00600000-0000-4000-8000-000000000012'
lock=f"select pg_advisory_xact_lock(hashtextextended('wallet:{u}',0))"
def held(first,second):
    p=subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',f'begin;{first};select pg_sleep(2);rollback'],env=dict(os.environ,PGAPPNAME='phase_a_extra_holder'),stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
    try:
        for _ in range(150):
            if sql("select count(*) from pg_stat_activity where application_name='phase_a_extra_holder' and wait_event='PgSleep'")=='1': break
            time.sleep(.02)
        else: raise AssertionError('holder did not synchronize')
        second()
    finally:
        _,err=p.communicate(timeout=8)
        assert p.returncode==0,err

def timeout_grant():
    q=f"begin;set local lock_timeout='150ms';insert into purchases(id,user_id,product_id,scope,chapter_id,course_id,status) values('phase_a_timeout','{u}','mv006_other','chapter','seed_c','bams','success');commit"
    try: sql(q)
    except subprocess.CalledProcessError as e: assert 'lock timeout' in e.stderr,e.stderr
    else: raise AssertionError('lock timeout absent')
    check(sql("select count(*) from purchases where id='phase_a_timeout'")=='0','advisory lock timeout aborts grant without partial purchase')
held(lock,timeout_grant)
# Exact migration replay under contended DDL; disconnected failed transaction rolls back.
def timeout_ddl():
    before=sql("select oid::text||':'||pg_get_triggerdef(oid) from pg_trigger where tgrelid='public.orders'::regclass and tgname='orders_03_razorpay_transition'")
    p=subprocess.run(['psql','-Xq','-v','ON_ERROR_STOP=1','-c',"set lock_timeout='150ms'",'-f','supabase/migrations/20261110120000_mv005_razorpay_order_transitions.sql'],text=True,capture_output=True)
    assert p.returncode and 'lock timeout' in p.stderr,p.stderr
    check(sql("select oid::text||':'||pg_get_triggerdef(oid) from pg_trigger where tgrelid='public.orders'::regclass and tgname='orders_03_razorpay_transition'")==before,'exact A2 DDL timeout leaves existing trigger intact after rollback')
held('lock table public.orders in row exclusive mode',timeout_ddl)
# Rollback all three DDL bodies in a single transaction, preserving their original bytes otherwise.
files=[Path('supabase/migrations')/n for n in ['20261110100000_mv003_razorpay_entitlement_commitment.sql','20261110120000_mv005_razorpay_order_transitions.sql','20261110130000_mv006_purchase_ownership_guard.sql']]
body=[]
for f in files:
    s=f.read_text();assert s.count('begin;')==1 and s.count('commit;')==1
    body.append(s.replace('begin;','',1).replace('commit;','',1))
def meta():return sql(f"select md5(string_agg(oid::text||pg_get_functiondef(oid)||proacl::text,'' order by proname)) from pg_proc where pronamespace='public'::regnamespace and proname in ({names})")+'|'+sql("select string_agg(oid::text||pg_get_triggerdef(oid),'' order by tgname) from pg_trigger where tgname in ('orders_03_razorpay_transition','purchases_zz_success_ownership')")
before=meta()
try: sql('begin;'+''.join(body)+'select 1/0;commit;')
except subprocess.CalledProcessError as e: assert 'division by zero' in e.stderr
else:raise AssertionError('forced DDL abort absent')
check(meta()==before,'forced error after all three DDL bodies restores function ACLs and original trigger OIDs')
