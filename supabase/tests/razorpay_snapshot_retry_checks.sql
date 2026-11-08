-- Disposable migrated PostgreSQL only. Synthetic verified-capture inputs are
-- injected at the service-only SQL boundary; this is NOT hosted payment proof.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('d9100000-0000-4000-8000-000000000001','fix-scope@example.invalid'),
 ('d9100000-0000-4000-8000-000000000002','fix-referrer@example.invalid'),
 ('d9100000-0000-4000-8000-000000000003','fix-retry@example.invalid'),
 ('d9100000-0000-4000-8000-000000000004','fix-stranger@example.invalid');
update public.profiles set course_id='bams' where id::text like 'd9100000-%';
insert into public.years(id,title,course_id) values('fix_alt_y','Other course','bhms');
insert into public.subjects(id,title,year_id) values('fix_alt_s','Other subject','fix_alt_y');
insert into public.chapters(id,title,subject_id) values('fix_alt_c','Other chapter','fix_alt_s');

do $$
declare s text; j jsonb; o public.orders%rowtype; p public.purchases%rowtype; blocked boolean;
begin
  foreach s in array array['chapter','subject','year','bundle'] loop
    insert into public.products(id,title,scope,price,chapter_id,subject_id,year_id,year_ids,course_id,active,product_type)
    values('fix_scope_'||s,'Ordered '||s,s,500,
      case when s='chapter' then 'seed_c' end,
      case when s='subject' then 'seed_s' end,
      case when s='year' then 'seed_y' end,
      case when s='bundle' then array['seed_y'] end,'bams',true,'notes');
    j:=public.create_priced_order('d9100000-0000-4000-8000-000000000001','fix_scope_'||s,false);
    assert j->>'ok'='true';
    update public.orders set razorpay_order_id='order_fix_scope_'||s where id=j->>'order_id';
    select * into o from public.orders where id=j->>'order_id';
    -- Change all catalog entitlement fields, course and price after authorization.
    update public.products set scope='chapter',chapter_id='fix_alt_c',subject_id=null,
      year_id=null,year_ids=null,course_id='bhms',price=900 where id=o.product_id;
    perform public.settle_razorpay_payment('evt_fix_'||s,o.razorpay_order_id,'pay_fix_'||s,50000,now());
    select * into p from public.purchases where order_id=o.id;
    assert row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id,p.product_id,p.user_id,p.amount)
      is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id,o.product_id,o.user_id,o.amount),
      'catalog change altered authorized entitlement';
    assert p.status='success';
    assert (select course_id=o.course_id from public.orders where id=o.id);
    perform public.settle_razorpay_payment('evt_fix_duplicate_'||s,o.razorpay_order_id,'pay_fix_'||s,50000,now());
    assert (select count(*)=1 from public.purchases where order_id=o.id);
    assert (select count(*)=1 from public.payments where order_id=o.id);
    -- Neither refunds nor callback replays may restore a revoked scope.
    perform public.handle_payment_refund('pay_fix_'||s,false);
    assert (select status='success' from public.purchases where order_id=o.id);
    perform public.handle_payment_refund('pay_fix_'||s,true);
    perform public.handle_payment_refund('pay_fix_'||s,true);
    perform public.settle_razorpay_payment('evt_fix_refund_replay_'||s,o.razorpay_order_id,'pay_fix_'||s,50000,now());
    assert (select status='refunded' from public.purchases where order_id=o.id);
    assert (select status='reversed' from public.payment_captures where payment_id='pay_fix_'||s);
    blocked:=false;
    begin
      update public.orders set chapter_id='fix_alt_c' where id=o.id;
    exception when insufficient_privilege then blocked:=true; end;
    assert blocked,'order entitlement was mutable';
    raise notice 'PASS immutable % scope/course/amount, duplicate callbacks, partial/full refunds and post-refund replay',s;
  end loop;
end $$;

update public.referral_settings set enabled=true,friend_discount_percent=10,
  friend_discount_max=100,require_verified_phone=false,wallet_max_percent=50 where id=true;
insert into public.referrals(referrer_id,referred_id,code_used,status)
 values('d9100000-0000-4000-8000-000000000002','d9100000-0000-4000-8000-000000000003','FIX','pending');
insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type)
 values('fix_retry','Retry','chapter',500,'seed_c','bams',true,'notes'),
 ('fix_after_success','After success','chapter',500,'seed_c','bams',true,'notes');
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,note)
 values('d9100000-0000-4000-8000-000000000003','credit','available',100,'admin_adjustment','fixture');

do $$
declare j jsonb; first_id text; second_id text; final_id text; q jsonb; blocked boolean;
begin
  j:=public.create_priced_order('d9100000-0000-4000-8000-000000000003','fix_retry',false);
  first_id:=j->>'order_id'; assert (j->>'amount')::numeric=450;
  update public.orders set status='failed',razorpay_order_id='order_fix_failed' where id=first_id;
  perform set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000003',true);
  q:=public.quote_my_order('fix_retry',false);
  perform set_config('request.jwt.claim.sub','',true);
  assert (q->>'referral_discount')::numeric=50,'failed attempt suppressed quoted discount';
  j:=public.create_priced_order('d9100000-0000-4000-8000-000000000003','fix_retry',false);
  second_id:=j->>'order_id'; assert (j->>'amount')::numeric=450,'failed attempt consumed discount';
  update public.orders set razorpay_order_id='order_fix_cancelled' where id=second_id;
  j:=public.create_priced_order('d9100000-0000-4000-8000-000000000003','fix_retry',true);
  final_id:=j->>'order_id'; assert (j->>'referral_discount')::numeric=50;
  assert (j->>'wallet_amount')::numeric=100 and (j->>'amount')::numeric=350;
  assert (select status='cancelled' from public.orders where id=second_id);
  assert (select order_id=final_id from public.first_discount_reservations
    where user_id='d9100000-0000-4000-8000-000000000003');
  update public.orders set razorpay_order_id='order_fix_retry' where id=final_id;
  -- Old captures arriving after reassignment receive compensation, no entitlement.
  perform public.settle_razorpay_payment('evt_fix_late_failed','order_fix_failed','pay_fix_failed',45000,now());
  perform public.settle_razorpay_payment('evt_fix_late_cancelled','order_fix_cancelled','pay_fix_cancelled',45000,now());
  assert not exists(select 1 from public.purchases where order_id in (first_id,second_id));
  assert (select count(*)=2 from public.payment_compensations where order_id in (first_id,second_id));
  -- Account and amount cannot be rebound even through service-side insertion.
  blocked:=false;
  begin
    insert into public.purchases(user_id,order_id,product_id,scope,chapter_id,course_id,amount,status)
    values('d9100000-0000-4000-8000-000000000004',final_id,'fix_retry','chapter','seed_c','bams',350,'success');
  exception when raise_exception then blocked:=true; end;
  assert blocked,'purchase account binding bypassed';
  blocked:=false;
  begin
    perform public.settle_razorpay_payment('evt_fix_wrong_amount','order_fix_retry','pay_fix_wrong_amount',34900,now());
  exception when raise_exception then blocked:=true; end;
  assert blocked and not exists(select 1 from public.purchases where order_id=final_id);
  perform public.settle_razorpay_payment('evt_fix_retry','order_fix_retry','pay_fix_retry',35000,now());
  perform public.settle_razorpay_payment('evt_fix_retry_duplicate','order_fix_retry','pay_fix_retry',35000,now()+interval '2 days');
  assert (select status='granted' from public.payment_captures where payment_id='pay_fix_retry');
  assert not exists(select 1 from public.payment_compensations where order_id=final_id),
    'duplicate after expiry queued refund for successful purchase';
  assert (select count(*)=1 from public.purchases where order_id=final_id and status='success');
  assert (select count(*)=1 and sum(amount)=100 from public.wallet_ledger
    where order_id=final_id and entry_type='debit' and source='order_payment');
  j:=public.create_priced_order('d9100000-0000-4000-8000-000000000003','fix_after_success',false);
  assert (j->>'referral_discount')::numeric=0,'successful settlement reused discount';
  perform public.handle_payment_refund('pay_fix_retry',true);
  perform public.handle_payment_refund('pay_fix_retry',true);
  assert (select count(*)=1 and sum(amount)=100 from public.wallet_ledger
    where order_id=final_id and source='order_refund');
  j:=public.create_priced_order('d9100000-0000-4000-8000-000000000003','fix_retry',false);
  assert (j->>'referral_discount')::numeric=0,'refund reset first-purchase eligibility';
  raise notice 'PASS failed/cancelled retry discount, late captures, account binding, amount check, duplicate debit and refund';
end $$;

insert into auth.users(id,email) values
 ('d9100000-0000-4000-8000-000000000005','fix-expired@example.invalid'),
 ('d9100000-0000-4000-8000-000000000006','fix-legacy@example.invalid');
update public.profiles set course_id='bams' where id::text like 'd9100000-%';
insert into public.referrals(referrer_id,referred_id,code_used,status)
values('d9100000-0000-4000-8000-000000000002','d9100000-0000-4000-8000-000000000005','FIX','pending');
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,
 referral_discount,referral_id,status,expires_at,razorpay_order_id)
select 'fix_expired','d9100000-0000-4000-8000-000000000005','fix_retry','chapter','seed_c','bams',450,500,
 50,id,'created',now()-interval '1 minute','order_fix_expired'
from public.referrals where referred_id='d9100000-0000-4000-8000-000000000005';
do $$ declare j jsonb; begin
 j:=public.create_priced_order('d9100000-0000-4000-8000-000000000005','fix_retry',false);
 assert (j->>'referral_discount')::numeric=50,'expiry consumed discount';
 perform public.settle_razorpay_payment('evt_fix_expired','order_fix_expired','pay_fix_expired',45000,now());
 assert not exists(select 1 from public.purchases where order_id='fix_expired');
 assert (select status='compensation_pending' from public.payment_captures where payment_id='pay_fix_expired');
 raise notice 'PASS expired reservation retries safely and late expired capture is compensated';
end $$;
insert into public.orders(id,user_id,product_id,course_id,amount,list_price,status,razorpay_order_id)
values('fix_missing_snapshot','d9100000-0000-4000-8000-000000000006','fix_retry','bams',500,500,'created','order_fix_missing');
select public.settle_razorpay_payment('evt_fix_missing','order_fix_missing','pay_fix_missing',50000,now());
do $$ begin
 assert not exists(select 1 from public.purchases where order_id='fix_missing_snapshot');
 assert (select reason='missing_entitlement_snapshot' from public.payment_compensations where payment_id='pay_fix_missing');
 raise notice 'PASS incomplete legacy order is compensated without inferring entitlement from catalog';
end $$;
rollback;
