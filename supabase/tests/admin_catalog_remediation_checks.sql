-- Local disposable database only. Catalog fixtures and all edits roll back.
begin;
do $$ begin
  assert exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='products' and column_name='revision'), 'products revision guard missing';
end $$;
insert into auth.users(id,email) values('a9000000-0000-0000-0000-000000000001','catalog-admin@example.invalid');
insert into public.admins(id,email) values('a9000000-0000-0000-0000-000000000001','catalog-admin@example.invalid');
select set_config('request.jwt.claim.sub','a9000000-0000-0000-0000-000000000001',true);
update public.admin_settings set require_mfa=true;
select set_config('request.jwt.claims','{"sub":"a9000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}',true);
do $$ begin
  begin
    perform public.products_update('seed_product',(select revision from public.products where id='seed_product'),'{"active":false}');
    raise exception 'password-only Admin bypassed required MFA';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"a9000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',true);
do $$
declare r integer; saved public.products; before_orders jsonb; before_purchases jsonb; sku text;
begin
  assert not has_table_privilege('authenticated','public.products','UPDATE'), 'direct product UPDATE bypasses precondition';
  assert not has_function_privilege('anon','public.products_update(text,integer,jsonb)','EXECUTE'), 'anonymous product edit RPC';
  select jsonb_agg(to_jsonb(o)) into before_orders from public.orders o;
  select jsonb_agg(to_jsonb(p)) into before_purchases from public.purchases p;
  select revision into r from public.products where id='seed_product';
  select * into saved from public.products_update('seed_product',r,'{"active":false}');
  assert not saved.active and saved.revision=r+1, 'publish edit did not advance revision';
  begin
    perform public.products_update('seed_product',r,'{"title":"Stale edit","active":true,"price":49}');
    raise exception 'stale title edit republished product';
  exception when serialization_failure then null; end;
  assert (select not active from public.products where id='seed_product');
  select * into saved from public.products_update('seed_product',r+1,'{"price":137.25}');
  begin
    perform public.products_update('seed_product',r+1,'{"scope":"year","year_id":"seed_y","chapter_id":null,"price":49}');
    raise exception 'stale scope edit rolled back newer price';
  exception when serialization_failure then null; end;
  assert (select price=137.25 and scope='chapter' from public.products where id='seed_product');
  begin
    perform public.products_update('seed_product',r+2,'{"revision":999,"id":"hijack"}');
    raise exception 'caller supplied immutable fields';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.products_update('seed_product',null,'{"title":"No revision"}');
    raise exception 'missing revision accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.products_update('seed_product',r+2,'{"title":null}');
    raise exception 'null title accepted';
  exception when not_null_violation then null; end;
  update public.products set revision=999 where id='seed_product';
  assert (select revision=r+3 from public.products where id='seed_product'), 'direct writer controlled revision';
  assert before_orders is not distinct from (select jsonb_agg(to_jsonb(o)) from public.orders o), 'catalog edits altered order snapshots';
  assert before_purchases is not distinct from (select jsonb_agg(to_jsonb(p)) from public.purchases p), 'catalog edits altered entitlements';
  -- Readiness is independent of publication and requires exact verified India INR mapping.
  update public.products set active=true,price=49 where id='seed_product';
  select candidate_sku into sku from public.play_price_sync where price_inr=49;
  insert into public.play_price_tiers(price_inr,play_sku,active,purchase_option_id,currency_code,region_code,verified_at)
    values(49,sku,true,'buy','INR','IN',now());
  update public.play_price_sync set status='ready',last_synced_at=now(),last_error=null where price_inr=49;
  assert (select billing_status='ready' from public.admin_play_billing_status where product_id='seed_product'), 'verified mapping not ready';
  assert (select product_revision=(select revision from public.products where id='seed_product') from public.admin_play_billing_status where product_id='seed_product'), 'readiness revision differs from product';
  update public.products set price=50 where id='seed_product';
  assert (select billing_status<>'ready' and product_revision=(select revision from public.products where id='seed_product') from public.admin_play_billing_status where product_id='seed_product'), 'new price retained old readiness/revision';
  update public.products set price=49 where id='seed_product';
  update public.play_price_tiers set region_code='US' where play_sku=sku;
  assert (select billing_status='stale' from public.admin_play_billing_status where product_id='seed_product'), 'wrong region marked ready';
  update public.play_price_tiers set region_code='IN',price_inr=48 where play_sku=sku;
  assert (select billing_status='stale' from public.admin_play_billing_status where product_id='seed_product'), 'wrong price marked ready';
  update public.play_price_tiers set price_inr=49,active=false where play_sku=sku;
  assert (select billing_status='tier_inactive' from public.admin_play_billing_status where product_id='seed_product'), 'inactive option not shown';
  update public.play_price_tiers set active=true,verified_at=now()-interval '25 hours' where play_sku=sku;
  assert (select billing_status='stale' from public.admin_play_billing_status where product_id='seed_product'), 'stale verification marked ready';
  update public.play_price_sync set status='failed',last_error='403 PERMISSION_DENIED private_key=TOP_SECRET Bearer TOKEN' where price_inr=49;
  assert (select billing_status='failed' and last_error not like '%TOP_SECRET%' and last_error not like '%TOKEN%'
    from public.admin_play_billing_status where product_id='seed_product'), 'failure diagnostic leaked secret';
  update public.play_price_sync set status='running' where price_inr=49;
  assert (select billing_status='running' from public.admin_play_billing_status where product_id='seed_product');
  update public.products set active=false where id='seed_product';
  assert (select billing_status='catalog_inactive' and product_revision=(select revision from public.products where id='seed_product') from public.admin_play_billing_status where product_id='seed_product');
  update public.products set active=true,price=0 where id='seed_product';
  assert (select billing_status='free' from public.admin_play_billing_status where product_id='seed_product'), 'free unreachable';
  update public.products set price=49,product_type='other' where id='seed_product';
  assert (select billing_status='not_billable_notes' from public.admin_play_billing_status where product_id='seed_product');
  update public.products set price=991.23,product_type='notes' where id='seed_product';
  delete from public.play_price_sync where price_inr=991.23;
  assert (select billing_status='pending' from public.admin_play_billing_status where product_id='seed_product'), 'missing tier not pending';
end $$;
select set_config('request.jwt.claim.sub','5eed0000-0000-0000-0000-00000000000b',true);
select set_config('request.jwt.claims','{"sub":"5eed0000-0000-0000-0000-00000000000b","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*)=0 from public.admin_play_billing_status), 'student read catalog admin diagnostics';
  begin
    perform public.products_update('seed_product',1,'{"active":true}');
    raise exception 'student called admin update';
  exception when insufficient_privilege then null; end;
  begin
    update public.products set active=true where id='seed_product';
    raise exception 'direct authenticated update succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
