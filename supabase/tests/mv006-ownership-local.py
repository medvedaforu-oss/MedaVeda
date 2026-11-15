"""Actual PostgreSQL MV006 regressions. Only run via isolated runner."""
import os, subprocess, json, sys, time, re
from pathlib import Path
assert os.environ.get('PGHOST','').startswith('/tmp/')
assert re.fullmatch(r'mv003_[0-9a-f]+',os.environ.get('PGDATABASE',''))
def sql(q):
    return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',q],text=True,stderr=subprocess.PIPE).strip()
def check(ok,label):
    assert ok,label
    print('PASS '+label,flush=True)
def fails(q,expected):
    try: sql(q)
    except subprocess.CalledProcessError as e:
        assert expected in e.stderr,e.stderr
        return
    raise AssertionError('conflicting grant unexpectedly accepted')
def user(n):
    u=f'00600000-0000-4000-8000-{n:012d}'
    sql(f"insert into auth.users(id,email) values('{u}','mv006_{n}@example.invalid')")
    return u
def order(n,u,product='seed_product'):
    # Real creation for two pending attempts; explicitly fresh unexpired orders.
    r=json.loads(sql(f"select public.create_priced_order('{u}','{product}',false)"))
    assert r['ok'],r
    f=(r['order_id'],f'order_Mv006{n:06d}',f'pay_Mv006{n:06d}',u,product)
    sql(f"update orders set razorpay_order_id='{f[1]}' where id='{f[0]}'")
    return f
def grant(f): return f"select public.settle_razorpay_payment('evt_{f[2]}','{f[1]}','{f[2]}',4900,now())"
def proof(f):return sql(f"select public.razorpay_entitlement_committed('{f[0]}','{f[2]}')")
def access(u):return sql(f"select public.user_can_access_note('{u}','seed_note')")
def count(u):return sql(f"select count(*) from purchases where user_id='{u}' and product_id='seed_product' and status='success'")
def raw(pid,u,status='success',product='seed_product'):
    return f"insert into purchases(id,user_id,product_id,scope,chapter_id,course_id,status) values('{pid}','{u}','{product}','chapter','seed_c','bams','{status}')"
# Derive the one exception from the local schema, never embed a production ID.
predicate=sql("select pg_get_expr(indpred,indrelid) from pg_index where indexrelid='purchases_one_success_per_product'::regclass")
exception=re.search(r"id <> '([^']+)'",predicate)[1]
if sys.argv[1]=='baseline':
    u=user(1);a=order(1,u);b=order(2,u)
    sql(grant(a))
    sql(f"select public.settle_razorpay_payment_legacy('evt_historical','{b[1]}','{b[2]}',4900,now())")
    # Synthetic historical evidence: two distinct successful payment rows and
    # order-linked successes; only one purchase is outside the partial index.
    sql(f"update purchases set id='mv006_historic_other' where order_id='{a[0]}';update purchases set id='{exception}',status='success' where order_id='{b[0]}'")
    sql(f"delete from payment_captures where payment_id='{a[2]}'")
    check(count(u)=='2','PRE-FIX excluded purchase permits second successful ownership with distinct financial references')
    result=sql(f"begin;select public.handle_payment_refund('{a[2]}',true);"+raw('mv006_gap_grant',u)+f";select count(*) from purchases where user_id='{u}' and status='success';rollback")
    check(result.splitlines()[-1]=='2','PRE-FIX refund of indexed historical purchase permits fresh duplicate beside exempt purchase')
    sql("insert into products(id,title,scope,price,active,chapter_id,course_id,product_type) values('mv006_other','Other','chapter',49,true,'seed_c','bams','notes')")
    sys.exit()

u='00600000-0000-4000-8000-000000000001'
check(count(u)=='2' and access(u)=='t','historical duplicate rows retained; trusted Notes authorization preserved')
sql("update purchases set product_title='historical fixture' where id='mv006_historic_other'")
check(count(u)=='2','existing duplicate metadata update does not revoke or canonicalize history')
fails(raw('mv006_third',u),'Successful purchase ownership already exists')
historical_payment=sql("select o.razorpay_payment_id from orders o join purchases p on p.order_id=o.id where p.id='mv006_historic_other'")
sql(f"select public.handle_payment_refund('{historical_payment}',true)")
fails(raw('mv006_after_refund',u),'Successful purchase ownership already exists')
check(count(u)=='1' and access(u)=='t','refund of one historic row keeps other purchase access; exception no longer permits new grant')
sql(raw('mv006_restore_conflict',u,'disputed'))
fails("update purchases set status='success' where id='mv006_restore_conflict'",'Successful purchase ownership already exists')
check(sql("select status from purchases where id='mv006_restore_conflict'")=='disputed','conflicting restoration transaction rolled back')
# Remaining historical access fully reversed; no row deleted or promoted.
sql(f"update purchases set status='refunded' where user_id='{u}'")
check(access(u)=='f','fully refunded ownership loses backend Notes authorization')
fails("begin isolation level repeatable read;"+raw('mv006_repeatable',u)+';commit','requires read committed')
fails("begin isolation level serializable;"+raw('mv006_serializable',u)+';commit','requires read committed')
# Reproduce true simultaneous writes involving exempt id in rollback-safe fixtures.
# The historical exception row is now refunded; restoring it races a new INSERT.
def race(first,second):
    env=dict(os.environ,PGAPPNAME='mv006_lock_holder')
    p=subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',f'begin;{first};select pg_sleep(1.5);commit'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
    try:
        for _ in range(150):
            if sql("select count(*) from pg_stat_activity where application_name='mv006_lock_holder' and wait_event='PgSleep'")=='1':break
            time.sleep(.02)
        else:raise AssertionError('lock holder synchronization failed')
        second()
    finally:
        _,err=p.communicate(timeout=10)
        assert p.returncode==0,err
race(f"update purchases set status='success' where id='{exception}'",lambda:fails(raw('mv006_racing',u),'Successful purchase ownership already exists'))
check(count(u)=='1','concurrent exempt restore then insert: waiting statement sees committed ownership')
sql(f"update purchases set status='refunded' where id='{exception}'")
race(raw('mv006_racing_winner',u),lambda:fails(f"update purchases set status='success' where id='{exception}'",'Successful purchase ownership already exists'))
check(count(u)=='1','concurrent insert then exempt restore: one authoritative success')
# Multiple rows in one statement also checked, including excluded id.
sql(f"update purchases set status='refunded' where user_id='{u}'")
fails(f"update purchases set status='success' where id in ('{exception}','mv006_racing_winner')",'Successful purchase ownership already exists')
check(count(u)=='0','multi-row conflicting grants roll back atomically')

u=user(10);a=order(10,u);b=order(11,u)
race(grant(a),lambda:sql(grant(b)))
check(count(u)=='1' and proof(a)=='t' and proof(b)=='f','two captured orders settle concurrently: exactly one ownership, second never proves commitment')
check(sql(f"select reason from payment_compensations where payment_id='{b[2]}'")=='already_owned','already-owned new capture durably queued for compensation; no fictional entitlement')
check(sql(f"select status from payment_captures where payment_id='{b[2]}'")=='compensation_pending','separate provider reference retained as compensation evidence')
for f in (a,b):sql(grant(f));sql(grant(f))
check(count(u)=='1' and sql(f"select count(*) from payment_compensations where payment_id='{b[2]}'")=='1','duplicate delivery of both payments remains idempotent')
check(json.loads(sql(f"select public.create_priced_order('{u}','seed_product',false)"))['code']=='already_owned','same user/product checkout blocked before another order')
# Different users and products remain independent.
u2=user(11);c=order(12,u2);sql(grant(c))
check(proof(c)=='t','different users buy same product')
d=order(13,u2,'mv006_other');sql(grant(d))
check(proof(d)=='t','same user buys different products')
# Remove only a synthetic marker: valid historic purchase must not depend on it.
sql(f"delete from payment_captures where payment_id='{c[2]}'")
check(proof(c)=='t' and access(u2)=='t','valid purchase without capture marker restores backend Notes access')
sql(f"select public.handle_payment_dispute('{a[2]}','opened')")
check(access(u)=='f','unsuccessful disputed ownership does not authorize Notes')
sql(f"select public.handle_payment_dispute('{a[2]}','won')")
check(proof(a)=='t','legitimate dispute restoration still works')
sql(f"select public.handle_payment_refund('{a[2]}',true)")
check(access(u)=='f' and count(u)=='0','fully refunded purchase plus compensated capture never authorize Notes')
sql(grant(a));sql(grant(b))
check(access(u)=='f','refunded/compensated deliveries never regrant access')
# Legacy product-less scope purchase remains readable and restorable.
u3=user(12);sql(raw('mv006_legacy',u3).replace("'seed_product'","null"))
check(access(u3)=='t','legacy scope-based success without product retains Notes access')
sql("update purchases set status='disputed' where id='mv006_legacy'")
sql("update purchases set status='success' where id='mv006_legacy'")
check(access(u3)=='t','legacy NULL-product restore preserved without guessing a product')
# Generic guard causes the entire financial transaction to roll back.
fails(f"begin;insert into payments(order_id,user_id,product_id,amount,razorpay_order_id,razorpay_payment_id,status) values('{c[0]}','{u2}','seed_product',49,'{c[1]}','pay_Mv006Rollback','success');"+raw('mv006_rollback',u2)+';commit','Successful purchase ownership already exists')
check(sql("select count(*) from payments where razorpay_payment_id='pay_Mv006Rollback'")=='0','ownership violation rolls back financial write in same transaction')
fails(raw('mv006_wrong_role',u3).replace('insert into','set role authenticated;insert into'),'permission denied')
check(sql("select has_function_privilege('anon','public.guard_purchase_success_ownership()','execute') or has_function_privilege('authenticated','public.guard_purchase_success_ownership()','execute')")=='f','guard service-definer function has no client execution grant')
# Verify the underlying order/payment unique indexes remain in force.
fails(f"insert into payments(order_id,user_id,product_id,amount,razorpay_order_id,razorpay_payment_id,status) select order_id,user_id,product_id,amount,razorpay_order_id,razorpay_payment_id,status from payments where razorpay_payment_id='{d[2]}'",'duplicate key')
fails(f"insert into purchases(order_id,user_id,product_id,amount,status,scope) values('{d[0]}','{u2}','mv006_other',49,'duplicate','chapter')",'duplicate key')
check(True,'provider-payment and purchase-order uniqueness retained')

# Direct legacy replays and INSERT/ON CONFLICT remain safe under the guard.
sql(f"select public.settle_razorpay_payment_legacy('evt_legacy_replay','{d[1]}','{d[2]}',4900,now())")
check(proof(d)=='t' and sql(f"select count(*) from purchases where order_id='{d[0]}'")=='1','legacy same-order replay remains idempotent')
# Two direct privileged inserts for the SAME order must coalesce too, even if
# the second statement starts before the first commits its purchase.
u4=user(13);e=order(14,u4)
replay=f"insert into purchases(order_id,user_id,product_id,amount,scope,status) values('{e[0]}','{u4}','seed_product',49,'chapter','success') on conflict(order_id) do nothing"
race(replay,lambda:sql(replay))
check(count(u4)=='1' and sql(f"select count(*) from purchases where order_id='{e[0]}'")=='1','concurrent same-order INSERT ON CONFLICT replays coalesce without ownership errors')
