-- Disposable localhost DB only. All fixture changes roll back.
begin;
do $$ begin
  if (select enabled from public.nonplay_test_config) then raise exception 'default enable flag is not OFF'; end if;
end $$;

-- Prove the restrictive policy denies even a future permissive storage policy.
insert into storage.objects(bucket_id,name) values('nonplay-test-notes','synthetic/rls-probe.pdf');
create policy nonplay_test_probe_allow on storage.objects for select to authenticated,anon using(bucket_id='nonplay-test-notes');
set local role authenticated;
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='nonplay-test-notes') then raise exception 'authenticated direct test storage read'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='nonplay-test-notes') then raise exception 'anonymous direct test storage read'; end if;
end $$;
reset role;
drop policy nonplay_test_probe_allow on storage.objects;
do $$ begin raise notice 'PASS restrictive bucket policy denies actual authenticated/anon reads despite permissive policy'; end $$;
insert into auth.users(id,email,raw_app_meta_data) values
 ('d9500000-0000-4000-8000-000000000001','nonplay-sql@example.invalid','{"medveda_nonplay_test":true}'),
 ('d9500000-0000-4000-8000-000000000002','nonplay-real@example.invalid','{}');
update public.profiles set course_id='bams' where id in ('d9500000-0000-4000-8000-000000000001','d9500000-0000-4000-8000-000000000002');
insert into public.nonplay_test_users(user_id,active) values
 ('d9500000-0000-4000-8000-000000000001',true),('d9500000-0000-4000-8000-000000000002',true);
insert into public.nonplay_test_products(id,title,price_paise,subject_id,year_id,course_id,active)
 values('npt_product_d9500000-0000-4000-8000-000000000010','[TEST] SQL Notes',4900,'seed_s','seed_y','bams',true);

create temp table npt_financial_before as
select name, md5(coalesce(string_agg(row_data,'' order by row_data),'')) fingerprint from (
 select 'orders' name,to_jsonb(t)::text row_data from public.orders t union all
 select 'payments',to_jsonb(t)::text from public.payments t union all
 select 'purchases',to_jsonb(t)::text from public.purchases t union all
 select 'products',to_jsonb(t)::text from public.products t union all
 select 'wallet_ledger',to_jsonb(t)::text from public.wallet_ledger t union all
 select 'referrals',to_jsonb(t)::text from public.referrals t union all
 select 'first_discount_reservations',to_jsonb(t)::text from public.first_discount_reservations t union all
 select 'provider_events',to_jsonb(t)::text from public.provider_events t union all
 select 'payment_captures',to_jsonb(t)::text from public.payment_captures t
) x group by name;

do $$ declare o jsonb; again jsonb; result jsonb; oid uuid; n integer; begin
  if public.nonplay_test_user_allowed('d9500000-0000-4000-8000-000000000001') then raise exception 'DB default OFF bypass'; end if;
  update public.nonplay_test_config set enabled=true;
  if public.nonplay_test_user_allowed('d9500000-0000-4000-8000-000000000002') then raise exception 'unmarked real user accepted'; end if;
  if public.nonplay_test_product_allowed('d9500000-0000-4000-8000-000000000001','seed_product') then raise exception 'live product accepted'; end if;
  begin
    perform public.nonplay_test_prepare_order('d9500000-0000-4000-8000-000000000001','npt_product_d9500000-0000-4000-8000-000000000010',gen_random_uuid(),'rzp_live_fixture');
    raise exception 'live key accepted';
  exception when insufficient_privilege then null; end;
  o:=public.nonplay_test_prepare_order('d9500000-0000-4000-8000-000000000001','npt_product_d9500000-0000-4000-8000-000000000010','d9500000-0000-4000-8000-000000000011','rzp_test_fixture');
  oid:=(o->>'id')::uuid;
  if (o->>'claimed')::boolean is not true or (o->>'amount_paise')::integer<>4900 then raise exception 'server snapshot incorrect'; end if;
  again:=public.nonplay_test_prepare_order('d9500000-0000-4000-8000-000000000001','npt_product_d9500000-0000-4000-8000-000000000010',gen_random_uuid(),'rzp_test_fixture');
  if again->>'id'<>oid::text or (again->>'claimed')::boolean then raise exception 'duplicate creation claim'; end if;
  begin
    update public.nonplay_test_orders set amount_paise=100 where id=oid;
    raise exception 'snapshot mutation accepted';
  exception when raise_exception then if sqlerrm<>'immutable test order' then raise; end if; end;
  perform public.nonplay_test_attach_order('d9500000-0000-4000-8000-000000000001',oid,'order_sqlfixture');
  begin
    perform public.nonplay_test_observe_payment(oid,'pay_wrongamount','captured',100,'INR','order_sqlfixture',now());
    raise exception 'wrong amount accepted';
  exception when raise_exception then if sqlerrm<>'provider facts do not match test order' then raise; end if; end;
  result:=public.nonplay_test_observe_payment(oid,'pay_sqlpending','authorized',4900,'INR','order_sqlfixture',now());
  if result->>'success'<>'false' or result->>'pending'<>'true' then raise exception 'pending classification'; end if;
  result:=public.nonplay_test_observe_payment(oid,'pay_sqlfailed','failed',4900,'INR','order_sqlfixture',now());
  if result->>'success'<>'false' or result->>'pending'<>'false' then raise exception 'failed classification'; end if;
  update public.nonplay_test_checkouts set state='cancelled' where order_id=oid;
  if exists(select 1 from public.nonplay_test_entitlements where order_id=oid) then raise exception 'pending/failed/cancelled grant'; end if;
  result:=public.nonplay_test_observe_payment(oid,'pay_sqlcapture','captured',4900,'INR','order_sqlfixture',now());
  if result->>'success'<>'true' then raise exception 'captured test entitlement missing'; end if;
  perform public.nonplay_test_observe_payment(oid,'pay_sqlcapture','captured',4900,'INR','order_sqlfixture',now());
  select count(*) into n from public.nonplay_test_entitlements where order_id=oid;
  if n<>1 then raise exception 'duplicate entitlement'; end if;
  result:=public.nonplay_test_observe_payment(oid,'pay_extracapture','captured',4900,'INR','order_sqlfixture',now());
  if result->>'success'<>'false' then raise exception 'extra capture accepted as original'; end if;
  perform public.nonplay_test_observe_payment(oid,'pay_extracapture','refunded',4900,'INR','order_sqlfixture',now());
  if not exists(select 1 from public.nonplay_test_entitlements where order_id=oid and revoked_at is null) then raise exception 'extra-payment refund revoked original test entitlement'; end if;
  perform public.nonplay_test_observe_payment(oid,'pay_sqlcapture','refunded',4900,'INR','order_sqlfixture',now());
  result:=public.nonplay_test_observe_payment(oid,'pay_sqlcapture','captured',4900,'INR','order_sqlfixture',now());
  if result->>'success'<>'false' then raise exception 'stale capture regranted revoked test entitlement'; end if;
  if public.user_can_access_note('d9500000-0000-4000-8000-000000000001','seed_note') then raise exception 'test payment unlocked real paid note'; end if;
  raise notice 'PASS SQL OFF switch, protected synthetic metadata, approved products, test keys, immutable pricing, dedupe, pending/failed/cancelled, captured replay, extra capture, reversal and real Notes denial';
end $$;

do $$ declare t record; f record; begin
 for t in select c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relname like 'nonplay\_test\_%' escape '\' loop
  if not t.relrowsecurity or not t.relforcerowsecurity then raise exception 'RLS missing %',t.relname; end if;
  if has_table_privilege('authenticated',t.oid,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('anon',t.oid,'SELECT,INSERT,UPDATE,DELETE') then raise exception 'client grants %',t.relname; end if;
 end loop;
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nonplay\_test\_%' escape '\' loop
  if has_function_privilege('authenticated',f.oid,'EXECUTE') or has_function_privilege('anon',f.oid,'EXECUTE') then raise exception 'client RPC execute grant'; end if;
 end loop;
 if (select public from storage.buckets where id='nonplay-test-notes') then raise exception 'public test bucket'; end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='nonplay_test_no_direct_storage' and permissive='RESTRICTIVE') then raise exception 'missing restrictive test storage policy'; end if;
 raise notice 'PASS every test table has forced RLS/no client grants; every test RPC service-only; private test bucket restrictive policy';
end $$;

do $$ declare after_hash jsonb; before_hash jsonb; begin
 select jsonb_object_agg(name,fingerprint) into before_hash from npt_financial_before;
 select jsonb_object_agg(name,fingerprint) into after_hash from (
  select name,md5(coalesce(string_agg(row_data,'' order by row_data),'')) fingerprint from (
   select 'orders' name,to_jsonb(t)::text row_data from public.orders t union all
   select 'payments',to_jsonb(t)::text from public.payments t union all
   select 'purchases',to_jsonb(t)::text from public.purchases t union all
   select 'products',to_jsonb(t)::text from public.products t union all
   select 'wallet_ledger',to_jsonb(t)::text from public.wallet_ledger t union all
   select 'referrals',to_jsonb(t)::text from public.referrals t union all
   select 'first_discount_reservations',to_jsonb(t)::text from public.first_discount_reservations t union all
   select 'provider_events',to_jsonb(t)::text from public.provider_events t union all
   select 'payment_captures',to_jsonb(t)::text from public.payment_captures t
  ) x group by name
 ) fingerprints;
 if before_hash is distinct from after_hash then raise exception 'live financial data changed'; end if;
 raise notice 'PASS unchanged fingerprints: live orders/payments/purchases/products/wallet/referrals/discount reservations/provider inbox/captures';
end $$;
rollback;
