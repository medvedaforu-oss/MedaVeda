"""Synthetic SQL regression. Invoked only by run-mv005-local.py."""
import os, subprocess, json, sys, time
assert os.environ.get('PGHOST','').startswith('/tmp/')
assert os.environ.get('PGDATABASE','').startswith('mv003_')
def sql(q):
    return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',q],text=True,stderr=subprocess.PIPE).strip()
def check(ok, label):
    assert ok, label
    print('PASS '+label, flush=True)
def fails(q):
    try: sql(q)
    except subprocess.CalledProcessError as e:
        assert 'conflicts with captured or terminal state' in e.stderr, e.stderr
        return
    raise AssertionError('illegal transition accepted')
def fresh(n):
    uid=f'00500000-0000-4000-8000-{n:012d}'
    sql(f"insert into auth.users(id,email) values('{uid}','mv005_{n}@example.invalid')")
    r=json.loads(sql(f"select public.create_priced_order('{uid}','seed_product',false)"))
    assert r['ok']
    oid=r['order_id']; provider=f'order_Mv005{n:06d}'; payment=f'pay_Mv005{n:06d}'
    sql(f"update public.orders set razorpay_order_id='{provider}' where id='{oid}'")
    return oid,provider,payment,uid
def grant(f):
    return f"select public.settle_razorpay_payment('evt_{f[2]}','{f[1]}','{f[2]}',4900,now())"
def status(f): return sql(f"select status from orders where id='{f[0]}'")
def proof(f): return sql(f"select public.razorpay_entitlement_committed('{f[0]}','{f[2]}')")
def access(f): return sql(f"select public.user_can_access_note('{f[3]}','seed_note')")
def update(f,state): return f"update public.orders set status='{state}' where id='{f[0]}'"
if sys.argv[1]=='baseline':
    f=fresh(1);sql(grant(f));assert proof(f)=='t'
    sql(update(f,'failed'))
    check(status(f)=='failed' and proof(f)=='f' and access(f)=='t', 'PRE-FIX reproduced privileged paid -> failed with successful payment/purchase and preserved Notes access')
    # Retain this synthetic historical contradiction through migration application.
    sys.exit()
# Historical rows must be untouched and must not receive an invented automatic repair.
f=tuple(sql("select id,razorpay_order_id,razorpay_payment_id,user_id from orders where razorpay_order_id='order_Mv005000001'").split('|'))
check(status(f)=='failed' and proof(f)=='f' and access(f)=='t','historical contradiction retained; entitlement reader remains accessible; proof fails closed')
sql(f"update orders set updated_at=updated_at where id='{f[0]}'")
for n,initial in enumerate(['created','pending','failed','cancelled'],10):
    f=fresh(n)
    sql(update(f,initial))
    check(proof(f)=='f' and sql(f"select count(*) from purchases where order_id='{f[0]}'")=='0','unpaid '+initial+' grants no entitlement')
    sql(grant(f))
    check(status(f)=='paid' and proof(f)=='t','verified capture settles '+initial+' -> paid')
    for target in ['created','pending','failed','cancelled']:
        fails(update(f,target))
    sql(update(f,'failed')+" and status='created'")
    check(status(f)=='paid' and proof(f)=='t' and access(f)=='t','late failure/cancellation rejected; conditional handler update harmless; Notes preserved')
    sql(grant(f));sql(grant(f))
    check(sql(f"select count(*) from purchases where order_id='{f[0]}'")=='1','duplicate settlement idempotent')
    sql(f"select public.handle_payment_refund('{f[2]}',false)")
    check(proof(f)=='t','partial refund keeps legitimate access')
    sql(f"select public.handle_payment_dispute('{f[2]}','opened')")
    check(proof(f)=='f' and access(f)=='f','open dispute suspends access')
    sql(f"select public.handle_payment_dispute('{f[2]}','won')")
    check(proof(f)=='t' and access(f)=='t','won dispute restores access')
    sql(f"select public.handle_payment_refund('{f[2]}',true)")
    for target in ['created','pending','failed','cancelled','paid']: fails(update(f,target))
    sql(grant(f))
    check(status(f)=='refunded' and proof(f)=='f' and access(f)=='f','full refund remains terminal on replay')
f=fresh(20)
sql(f"select public.record_payment_capture('{f[2]}','{f[1]}',4900,null)")
for target in ['pending','failed','cancelled']: fails(update(f,target))
check(proof(f)=='f','capture fact without purchase never proves entitlement')
sql(grant(f));check(proof(f)=='t','captured fact can finish missing settlement')
sql(f"select public.handle_payment_dispute('{f[2]}','lost')")
sql(grant(f));check(status(f)=='refunded' and access(f)=='f','lost dispute cannot regrant')
# Deterministic concurrency: wait until transaction is sleeping with its row lock held.
def racing(first, second):
    env=dict(os.environ,PGAPPNAME='mv005_lock_holder')
    p=subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',f'begin;{first};select pg_sleep(2);commit;'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
    try:
        for _ in range(100):
            if sql("select count(*) from pg_stat_activity where application_name='mv005_lock_holder' and wait_event='PgSleep'")=='1': break
            time.sleep(.02)
        else: raise AssertionError('lock holder did not reach synchronization point')
        second()
    finally:
        _,err=p.communicate(timeout=10)
        assert p.returncode==0,err
f=fresh(21);racing(grant(f),lambda:fails(update(f,'failed')))
check(proof(f)=='t','settlement first: waiting failed writer sees paid row and cannot overwrite it')
f=fresh(22);racing(update(f,'failed'),lambda:sql(grant(f)))
check(proof(f)=='t','failure first: later legitimate capture settles atomically')
f=fresh(23);racing(grant(f),lambda:sql(grant(f)))
check(proof(f)=='t' and sql(f"select count(*) from purchases where order_id='{f[0]}'")=='1','concurrent settlement creates one consistent purchase')
f=fresh(24)
# Force a real error after settlement has written payment/purchase, on order paid UPDATE.
sql("create function public.mv005_abort_paid() returns trigger language plpgsql as $$begin if new.status='paid' then raise exception 'mv005 forced rollback';end if;return new;end$$; create trigger orders_99_mv005_abort before update on orders for each row execute function public.mv005_abort_paid()")
try:
    try: sql(grant(f))
    except subprocess.CalledProcessError as e: assert 'mv005 forced rollback' in e.stderr
    else: raise AssertionError('forced failure absent')
finally: sql('drop trigger orders_99_mv005_abort on orders;drop function public.mv005_abort_paid()')
check(status(f)=='created' and sql(f"select (select count(*) from payments where order_id='{f[0]}')+(select count(*) from purchases where order_id='{f[0]}')+(select count(*) from payment_captures where order_id='{f[0]}')")=='0','SQL exception rolls back payment, purchase, capture and order transaction')
sql(grant(f));check(proof(f)=='t','retry after transaction rollback succeeds')
check(sql("select has_function_privilege('anon','public.guard_razorpay_order_transition()','execute') or has_function_privilege('authenticated','public.guard_razorpay_order_transition()','execute')")=='f','guard has no client execution grant')
