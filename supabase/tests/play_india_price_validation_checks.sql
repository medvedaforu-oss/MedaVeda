-- Disposable migrated PostgreSQL only. Synthetic fixtures; never hosted SQL.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('a9400000-0000-4000-8000-000000000001','pricing-admin@example.invalid'),
 ('a9400000-0000-4000-8000-000000000002','pricing-buyer@example.invalid');
insert into public.admins(id,email) values
 ('a9400000-0000-4000-8000-000000000001','pricing-admin@example.invalid');
update public.profiles set course_id='bams' where id='a9400000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','a9400000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a9400000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);

do $$
<<price_test>>
declare price numeric; p public.products; j record; result jsonb; sku text;
  old_orders jsonb; old_purchases jsonb; history jsonb; r integer; valid_lease uuid;
begin
  -- First assertion reproduces the bug before the migration exists.
  insert into public.products(id,title,scope,price,active,chapter_id,course_id,product_type)
    values('price_test_low','Low price','chapter',1,true,'seed_c','bams','notes') returning * into p;
  assert not public.play_notes_product_eligible(p), 'INR 1 became Play eligible';
  assert not exists(select 1 from public.play_price_sync where price_inr=1), 'INR 1 auto-queued';
  foreach price in array array[0,1,2,3.99,84000.01] loop
    update public.products set price=price_test.price where id='price_test_low' returning * into p;
    assert not public.play_notes_product_eligible(p), 'unsupported price eligible';
    perform public.queue_play_price_sync(price);
    assert not exists(select 1 from public.play_price_sync where price_inr=price_test.price), 'unsupported direct queue';
    assert (select billing_status=case when price_test.price=0 then 'free' else 'unsupported_price' end
      and product_revision=p.revision from public.admin_play_billing_status where product_id=p.id),
      'unsupported/free readiness or revision incorrect';
  end loop;
  assert public.play_price_validation(4.001) is not null, 'precision silently rounded';
  assert public.play_price_validation(null) is not null;
  assert public.play_price_validation('NaN'::numeric) is not null;
  assert not has_function_privilege('anon','public.play_price_validation(numeric)','execute');
  assert has_function_privilege('service_role','public.play_price_validation(numeric)','execute');

  -- Historical jobs are retained. No repeated automatic or explicit retry.
  insert into public.play_price_sync(price_inr,status,candidate_sku,attempts,last_error)
    values(1,'failed','price_test_old_1',3,'historical 403'),(2,'pending','price_test_old_2',2,'historical 403');
  history:=(select jsonb_agg(to_jsonb(s) order by price_inr) from public.play_price_sync s where price_inr in (1,2));
  foreach price in array array[1,2] loop
    update public.products set price=price_test.price where id=p.id returning * into p;
    assert not public.retry_play_price_sync(price), 'unsupported Admin retry accepted';
    assert not public.play_price_has_eligible_product(price);
    assert not public.finish_play_price_sync(price,gen_random_uuid(),'price_test_old_'||price,'buy');
  end loop;
  assert history=(select jsonb_agg(to_jsonb(s) order by price_inr) from public.play_price_sync s where price_inr in (1,2)),
    'old unsupported jobs mutated';
  -- Exercise finalization with a genuinely matching live lease, not an early
  -- lease failure. An older worker cannot register an unsupported verified tier.
  valid_lease:=gen_random_uuid();
  update public.play_price_sync set status='running',lease_id=valid_lease,
    lease_until=now()+interval '3 minutes' where price_inr=2;
  history:=(select to_jsonb(s) from public.play_price_sync s where price_inr=2);
  assert not public.finish_play_price_sync(2,valid_lease,'price_test_old_2','buy');
  assert history=(select to_jsonb(s) from public.play_price_sync s where price_inr=2), 'unsupported finish changed job';
  assert not exists(select 1 from public.play_price_tiers where price_inr=2), 'unsupported finish wrote tier';
  update public.play_price_sync set status='pending',lease_id=null,lease_until=null where price_inr=2;
  update public.play_price_sync set next_attempt_at=now()+interval '1 day' where price_inr not in (1,2);
  assert (select count(*)=0 from public.claim_play_price_sync()), 'unsupported job claimed';

  -- Free price and old purchases stay intact during publication/price edits.
  select jsonb_agg(to_jsonb(o) order by id) into old_orders from public.orders o;
  select jsonb_agg(to_jsonb(b) order by id) into old_purchases from public.purchases b;
  update public.products set price=0 where id=p.id;
  assert old_orders is not distinct from (select jsonb_agg(to_jsonb(o) order by id) from public.orders o);
  assert old_purchases is not distinct from (select jsonb_agg(to_jsonb(b) order by id) from public.purchases b);
  assert not exists(select 1 from public.play_price_sync where price_inr=0);

  foreach price in array array[4,5,10,20,4.01,137.25,84000] loop
    update public.products set price=price_test.price where id=p.id returning * into p;
    assert public.play_price_validation(price) is null;
    assert public.play_notes_product_eligible(p), 'supported Notes price ineligible';
    assert public.play_price_has_eligible_product(price);
    assert (select count(*)=1 from public.play_price_sync where price_inr=price_test.price), 'new price not queued';
    assert (select billing_status='pending' and product_revision=p.revision
      from public.admin_play_billing_status where product_id=p.id), 'publication falsely ready';
  end loop;

  -- Simulate service-only Google verification at the DB boundary, then reuse it.
  update public.products set price=5 where id=p.id returning * into p;
  update public.play_price_sync set next_attempt_at=now()+interval '1 day' where price_inr<>5;
  select * into j from public.claim_play_price_sync();
  assert j.price_inr=5;
  assert public.finish_play_price_sync(5,j.lease_id,j.candidate_sku,'buy');
  sku:=j.candidate_sku;
  insert into public.products(id,title,scope,price,active,chapter_id,course_id,product_type)
    values('price_test_same','Same price','chapter',5,true,'seed_c','bams','notes');
  perform public.queue_play_price_sync(5);
  assert (select count(*)=1 from public.play_price_sync where price_inr=5);
  assert (select candidate_sku=sku and status='ready' from public.play_price_sync where price_inr=5);
  assert (select count(*)=1 from public.play_price_tiers where price_inr=5 and active and verified_at is not null);
  assert (select billing_status='ready' and product_revision=p.revision
    from public.admin_play_billing_status where product_id=p.id);
  begin
    insert into public.play_price_tiers(price_inr,play_sku,active,verified_at)
      values(5,'price_test_duplicate',true,now());
    raise exception 'duplicate verified tier accepted';
  exception when unique_violation then null; end;
  r:=p.revision;
  perform public.products_update(p.id,r,'{"price":2}');
  begin
    perform public.products_update(p.id,r,'{"price":5}');
    raise exception 'stale Admin revision accepted';
  exception when serialization_failure then null; end;
  assert (select billing_status='unsupported_price' and product_revision=r+1
    and last_error like '%4.00%' from public.admin_play_billing_status where product_id=p.id);
  -- Even a synthetic ready legacy tier must not bypass the checkout gate.
  update public.play_price_sync set status='ready',last_synced_at=now() where price_inr=2;
  insert into public.play_price_tiers(price_inr,play_sku,active,purchase_option_id,verified_at)
    values(2,'price_test_old_2',true,'buy',now());
  result:=public.create_play_order('a9400000-0000-4000-8000-000000000002',p.id);
  assert result->>'ok'='false', 'unsupported Play checkout succeeded';
  update public.play_price_sync set last_synced_at=now()-interval '25 hours' where price_inr in (1,2);
  perform public.requeue_stale_play_price_sync();
  assert (select status='ready' from public.play_price_sync where price_inr=2), 'unsupported stale job requeued';

  -- Existing Razorpay accepts the original exact low prices, independently of Play.
  foreach price in array array[1,2,5] loop
    update public.products set price=price_test.price where id=p.id;
    result:=public.create_priced_order('a9400000-0000-4000-8000-000000000002',p.id,false);
    assert result->>'ok'='true', 'Razorpay pricing changed';
    assert (select amount=price_test.price and list_price=price_test.price and provider='razorpay'
      from public.orders where id=result->>'order_id'), 'Razorpay price rounded/rebound';
  end loop;
  select jsonb_agg(to_jsonb(o) order by id) into old_orders from public.orders o;
  select jsonb_agg(to_jsonb(b) order by id) into old_purchases from public.purchases b;
  update public.products set price=20,active=false where id=p.id;
  assert old_orders is not distinct from (select jsonb_agg(to_jsonb(o) order by id) from public.orders o), 'order snapshots changed';
  assert old_purchases is not distinct from (select jsonb_agg(to_jsonb(b) order by id) from public.purchases b), 'entitlements changed';
end $$ language plpgsql;
rollback;
\echo PASS India pricing, free, supported prices, queue/retry/finish/checkout guards, shared tiers, revisions, Razorpay and entitlements
