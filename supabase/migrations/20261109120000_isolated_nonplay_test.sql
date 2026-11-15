-- Additive, default OFF. No writes to live catalog, payment, wallet or purchase tables.
-- This lane does not depend on the undeployed Play choice/recovery migrations.
begin;
set local search_path=pg_catalog,public,pg_temp;

do $migration$
declare
  expected constant jsonb := $contract${
  "function nonplay_test_attach_order(p_user uuid, p_order uuid, p_provider text)": "6b4eff2996a48f3196cfd72a5f1dc76c",
  "function nonplay_test_immutable_order()": "5550fec0fa10fd4459a714fe978236ea",
  "function nonplay_test_observe_payment(p_order uuid, p_payment text, p_status text, p_amount integer, p_currency text, p_provider text, p_created timestamp with time zone)": "5fdc9d41ffc6e00fe7beb0825c1e3491",
  "function nonplay_test_prepare_order(p_user uuid, p_product text, p_key uuid, p_key_id text)": "d2e4b7263f93f65f7f7a5434f768e237",
  "function nonplay_test_product_allowed(p_user uuid, p_product text)": "b0daf5e0e0a8656e971226e2f273a291",
  "function nonplay_test_quote(p_user uuid, p_product text)": "b18cfffae3a5c4906ad5a4844ca82633",
  "function nonplay_test_user_allowed(p_user uuid)": "b59931bb69ddce5a1fc34eaf597e599a",
  "relation nonplay_test_attempts": "0ebf731628687ff5aa20aa94e2a6ad1d",
  "relation nonplay_test_audit": "1171087dd970f0cb997b6a9200e50672",
  "relation nonplay_test_audit_id_seq": "ee1b2c016834a1a5de1db3e915b6c195",
  "relation nonplay_test_checkouts": "0fbe64907a8700195fb1131f54101017",
  "relation nonplay_test_config": "3a4fac597118a2e63e8f7646e08a85d1",
  "relation nonplay_test_entitlements": "3af607633d24fb32836c2d8bd44c9ec6",
  "relation nonplay_test_notes": "58254e511a2b0898c5c7becf340564e0",
  "relation nonplay_test_orders": "e04527dc54cedaed7eccf55d68e8c683",
  "relation nonplay_test_products": "695cec6b243cae1382a5196f3d405fad",
  "relation nonplay_test_users": "12e0a971cb9f58f224acd8758b158fc1",
  "relation nonplay_test_webhooks": "f1cac9c4e9ce8412a541364859b0c0d4",
  "standalone types": "d751713988987e9331980363e24189ce",
  "storage bucket": "e83b5b485ff214df254769e3958454dd",
  "storage policy": "50eaa19fbfc7caa1389719645b1b534d"
}$contract$::jsonb;
  actual jsonb;
  conflicting_object text;
  already_present boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('medveda:20261109120000:isolated_nonplay_test',0));
  select exists(select 1 from pg_class where relnamespace='public'::regnamespace and relname like 'nonplay\_test\_%' escape '\')
    or exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname like 'nonplay\_test\_%' escape '\')
    or exists(select 1 from pg_type where typnamespace='public'::regnamespace and typname like 'nonplay\_test\_%' escape '\')
    or exists(select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='nonplay_test_no_direct_storage')
    or exists(select 1 from storage.buckets where id='nonplay-test-notes' or name='nonplay-test-notes')
    into already_present;
  if not already_present then
    execute $install$
create table public.nonplay_test_config (
  environment text primary key check (environment='production-isolated-razorpay-test-v1'),
  enabled boolean not null default false
);
insert into public.nonplay_test_config(environment) values ('production-isolated-razorpay-test-v1');

create table public.nonplay_test_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default false
);
create table public.nonplay_test_products (
  id text primary key default ('npt_product_' || gen_random_uuid()::text) check (id ~ '^npt_product_[0-9a-f-]{36}$'),
  title text not null check (title like '[TEST] %'),
  price_paise integer not null check (price_paise between 100 and 1000000),
  chapter_id text not null unique default ('npt_chapter_' || gen_random_uuid()::text) check (chapter_id ~ '^npt_chapter_[0-9a-f-]{36}$'),
  -- Read-only association with the existing browsing hierarchy. Never a real chapter ID.
  subject_id text not null, year_id text not null, course_id text not null,
  active boolean not null default false
);
create table public.nonplay_test_notes (
  id text primary key default ('npt_note_' || gen_random_uuid()::text) check (id ~ '^npt_note_[0-9a-f-]{36}$'),
  product_id text not null references public.nonplay_test_products(id),
  title text not null check (title like '[TEST] %'),
  object_path text not null unique check (object_path ~ '^synthetic/[A-Za-z0-9/_-]+[.]pdf$' and object_path not like '%..%'),
  active boolean not null default false
);
create table public.nonplay_test_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.nonplay_test_users(user_id) on delete cascade,
  product_id text not null references public.nonplay_test_products(id),
  idempotency_key uuid not null,
  environment text not null default 'production-isolated-razorpay-test-v1' references public.nonplay_test_config(environment),
  key_id text not null check (key_id ~ '^rzp_test_[A-Za-z0-9]+$'),
  amount_paise integer not null check (amount_paise>=100),
  currency text not null default 'INR' check (currency='INR'),
  title text not null,
  status text not null default 'pending' check (status in ('pending','created','paid','expired','reversed')),
  razorpay_order_id text unique check (razorpay_order_id ~ '^order_[A-Za-z0-9]+$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '30 minutes'),
  unique(user_id,idempotency_key)
);
create unique index nonplay_test_one_open_order on public.nonplay_test_orders(user_id,product_id)
  where status in ('pending','created');
create table public.nonplay_test_checkouts (
  order_id uuid primary key references public.nonplay_test_orders(id) on delete cascade,
  -- Permanent claim: ambiguous CREATE outcomes are recovered by receipt GET, never another POST.
  provider_create_claimed boolean not null default true check (provider_create_claimed),
  state text not null default 'pending' check (state in ('pending','open','failed','cancelled','complete','reversed')),
  updated_at timestamptz not null default now()
);
create table public.nonplay_test_attempts (
  payment_id text primary key check (payment_id ~ '^pay_[A-Za-z0-9]+$'),
  order_id uuid not null references public.nonplay_test_orders(id) on delete cascade,
  status text not null check (status in ('created','authorized','captured','failed','refunded')),
  amount_paise integer not null check (amount_paise>=100),
  observed_at timestamptz not null default now()
);
create table public.nonplay_test_entitlements (
  user_id uuid not null references public.nonplay_test_users(user_id) on delete cascade,
  product_id text not null references public.nonplay_test_products(id),
  order_id uuid not null unique references public.nonplay_test_orders(id) on delete cascade,
  payment_id text not null unique references public.nonplay_test_attempts(payment_id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key(user_id,product_id)
);
create table public.nonplay_test_webhooks (
  event_id text primary key check (length(event_id) between 1 and 200),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'received' check (status in ('received','processed','failed')),
  received_at timestamptz not null default now()
);
create table public.nonplay_test_audit (
  id bigint generated always as identity primary key,
  order_id uuid references public.nonplay_test_orders(id) on delete cascade,
  event text not null check (event in ('reserved','attached','created','authorized','captured','failed','refunded','checkout_cancelled','checkout_failed','checkout_pending')),
  created_at timestamptz not null default now()
);
-- Match the repository's FK-index invariant without indexing any live table.
create index nonplay_test_notes_product on public.nonplay_test_notes(product_id);
create index nonplay_test_orders_product on public.nonplay_test_orders(product_id);
create index nonplay_test_orders_environment on public.nonplay_test_orders(environment);
create index nonplay_test_attempts_order on public.nonplay_test_attempts(order_id);
create index nonplay_test_entitlements_product on public.nonplay_test_entitlements(product_id);
create index nonplay_test_audit_order on public.nonplay_test_audit(order_id);

-- No browser/Auth direct reads or writes, including synthetic users. Edge routes check
-- package/profile hints PLUS verified Auth, protected synthetic metadata and both allowlists.
do $$ declare t text; begin
  foreach t in array array['config','users','products','notes','orders','checkouts','attempts','entitlements','webhooks','audit'] loop
    execute format('alter table public.nonplay_test_%I enable row level security',t);
    execute format('alter table public.nonplay_test_%I force row level security',t);
    execute format('revoke all on public.nonplay_test_%I from public,anon,authenticated',t);
    execute format('grant all on public.nonplay_test_%I to service_role',t);
  end loop;
end $$;
revoke all on sequence public.nonplay_test_audit_id_seq from public,anon,authenticated;
grant usage,select on sequence public.nonplay_test_audit_id_seq to service_role;

create function public.nonplay_test_user_allowed(p_user uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.nonplay_test_config where enabled)
    and exists(select 1 from public.nonplay_test_users t join auth.users u on u.id=t.user_id
      join public.profiles p on p.id=u.id
      where t.user_id=p_user and t.active and not coalesce(p.blocked,true)
        and u.raw_app_meta_data->>'medveda_nonplay_test'='true'
        and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()));
$$;
create function public.nonplay_test_product_allowed(p_user uuid,p_product text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select public.nonplay_test_user_allowed(p_user) and exists(
    select 1 from public.nonplay_test_products t join public.profiles p on p.id=p_user
      join public.subjects s on s.id=t.subject_id join public.years y on y.id=t.year_id
    where t.id=p_product and t.active and t.course_id=p.course_id
      and s.year_id=y.id and s.course_id=t.course_id and y.course_id=t.course_id and s.active and y.active
      and not exists(select 1 from public.chapters c where c.id=t.chapter_id)
      and not exists(select 1 from public.products r where r.id=t.id));
$$;
create function public.nonplay_test_quote(p_user uuid,p_product text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.nonplay_test_products%rowtype;
begin
  if not public.nonplay_test_product_allowed(p_user,p_product) then raise exception 'test checkout unavailable' using errcode='42501'; end if;
  select * into strict t from public.nonplay_test_products where id=p_product;
  return jsonb_build_object('ok',true,'listPrice',t.price_paise/100.0,'amount',t.price_paise/100.0,
    'referralDiscount',0,'walletEligible',false,'walletAvailable',0,'walletMaxUsable',0,'walletAmount',0);
end $$;

create function public.nonplay_test_prepare_order(p_user uuid,p_product text,p_key uuid,p_key_id text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.nonplay_test_orders%rowtype; t public.nonplay_test_products%rowtype; claimed boolean:=false;
begin
  if not public.nonplay_test_product_allowed(p_user,p_product) or p_key is null or p_key_id !~ '^rzp_test_[A-Za-z0-9]+$' then
    raise exception 'test checkout unavailable' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('nonplay_test:'||p_user::text,0));
  select * into o from public.nonplay_test_orders where user_id=p_user and idempotency_key=p_key for update;
  if found and (o.product_id<>p_product or o.key_id<>p_key_id) then raise exception 'idempotency conflict'; end if;
  if o.id is null then
    update public.nonplay_test_orders set status='expired' where user_id=p_user and product_id=p_product
      and status in ('pending','created') and expires_at<=now();
    select * into o from public.nonplay_test_orders where user_id=p_user and product_id=p_product
      and status in ('pending','created') for update;
  end if;
  if o.id is null then
    if exists(select 1 from public.nonplay_test_entitlements where user_id=p_user and product_id=p_product) then
      raise exception 'test product already fulfilled; reconcile existing entitlement'; end if;
    select * into strict t from public.nonplay_test_products where id=p_product;
    insert into public.nonplay_test_orders(user_id,product_id,idempotency_key,key_id,amount_paise,title)
      values(p_user,p_product,p_key,p_key_id,t.price_paise,t.title) returning * into o;
    insert into public.nonplay_test_checkouts(order_id) values(o.id);
    insert into public.nonplay_test_audit(order_id,event) values(o.id,'reserved');
    claimed:=true;
  end if;
  if o.key_id<>p_key_id then raise exception 'test credential rotation requires reconciliation'; end if;
  return to_jsonb(o)||jsonb_build_object('claimed',claimed);
end $$;

create function public.nonplay_test_attach_order(p_user uuid,p_order uuid,p_provider text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.nonplay_test_orders%rowtype;
begin
  select * into strict o from public.nonplay_test_orders where id=p_order and user_id=p_user for update;
  if not public.nonplay_test_product_allowed(p_user,o.product_id) or p_provider !~ '^order_[A-Za-z0-9]+$'
    or o.status not in ('pending','created') or o.expires_at<=now() then raise exception 'test order unavailable'; end if;
  if o.razorpay_order_id is not null and o.razorpay_order_id<>p_provider then raise exception 'provider binding conflict'; end if;
  update public.nonplay_test_orders set razorpay_order_id=p_provider,status='created' where id=o.id returning * into o;
  update public.nonplay_test_checkouts set state='open',updated_at=now() where order_id=o.id and state='pending';
  insert into public.nonplay_test_audit(order_id,event) values(o.id,'attached');
  return to_jsonb(o);
end $$;

create function public.nonplay_test_observe_payment(p_order uuid,p_payment text,p_status text,p_amount integer,p_currency text,p_provider text,p_created timestamptz) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.nonplay_test_orders%rowtype; a public.nonplay_test_attempts%rowtype; e public.nonplay_test_entitlements%rowtype;
begin
  select * into strict o from public.nonplay_test_orders where id=p_order for update;
  if not public.nonplay_test_product_allowed(o.user_id,o.product_id) or p_amount is distinct from o.amount_paise
    or p_currency is distinct from 'INR' or p_provider is distinct from o.razorpay_order_id
    or p_payment is null or p_payment !~ '^pay_[A-Za-z0-9]+$'
    or p_status is null or p_status not in ('created','authorized','captured','failed','refunded')
    or p_created is null or p_created<o.created_at-interval '60 seconds' or p_created>now()+interval '60 seconds' then
    raise exception 'provider facts do not match test order'; end if;
  select * into a from public.nonplay_test_attempts where payment_id=p_payment for update;
  if found and a.order_id<>o.id then raise exception 'payment ownership conflict'; end if;
  insert into public.nonplay_test_attempts(payment_id,order_id,status,amount_paise) values(p_payment,o.id,p_status,p_amount)
    on conflict(payment_id) do update set status=case
      when nonplay_test_attempts.status='refunded' then 'refunded'
      when nonplay_test_attempts.status='captured' and excluded.status<>'refunded' then 'captured'
      else excluded.status end,observed_at=now() returning * into a;
  insert into public.nonplay_test_audit(order_id,event) values(o.id,a.status);
  if a.status='refunded' then
    update public.nonplay_test_entitlements set revoked_at=coalesce(revoked_at,now()) where order_id=o.id and payment_id=p_payment;
    if not exists(select 1 from public.nonplay_test_entitlements where order_id=o.id and payment_id<>p_payment and revoked_at is null) then
      update public.nonplay_test_orders set status='reversed' where id=o.id;
      update public.nonplay_test_checkouts set state='reversed',updated_at=now() where order_id=o.id;
    end if;
  elsif a.status='captured' and p_created<=o.expires_at and o.status<>'reversed' then
    insert into public.nonplay_test_entitlements(user_id,product_id,order_id,payment_id)
      values(o.user_id,o.product_id,o.id,p_payment) on conflict(user_id,product_id) do nothing;
    select * into e from public.nonplay_test_entitlements where user_id=o.user_id and product_id=o.product_id;
    if e.order_id=o.id and e.payment_id=p_payment and e.revoked_at is null then
      update public.nonplay_test_orders set status='paid' where id=o.id;
      update public.nonplay_test_checkouts set state='complete',updated_at=now() where order_id=o.id;
      return jsonb_build_object('success',true,'orderId',o.id,'amount',o.amount_paise/100.0);
    end if;
    return jsonb_build_object('success',false,'pending',false,'message','A different test capture already fulfilled this product.');
  end if;
  select * into e from public.nonplay_test_entitlements where order_id=o.id and revoked_at is null;
  if found and o.status<>'reversed' then return jsonb_build_object('success',true,'orderId',o.id,'amount',o.amount_paise/100.0); end if;
  return jsonb_build_object('success',false,'pending',a.status in ('created','authorized') and now()<o.expires_at,
    'message',case when a.status='failed' then 'Test payment failed.' when a.status='refunded' then 'Test payment reversed.' else 'Test payment is not captured.' end);
end $$;

create function public.nonplay_test_immutable_order() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if row(new.id,new.user_id,new.product_id,new.idempotency_key,new.environment,new.key_id,new.amount_paise,new.currency,new.title,new.created_at,new.expires_at)
    is distinct from row(old.id,old.user_id,old.product_id,old.idempotency_key,old.environment,old.key_id,old.amount_paise,old.currency,old.title,old.created_at,old.expires_at)
    or (old.razorpay_order_id is not null and new.razorpay_order_id is distinct from old.razorpay_order_id) then raise exception 'immutable test order'; end if;
  return new;
end $$;
create trigger nonplay_test_order_snapshot before update on public.nonplay_test_orders for each row execute function public.nonplay_test_immutable_order();

-- All new RPCs are service-only; clients must pass through the dedicated handlers.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'nonplay\_test\_%' escape '\' loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('nonplay-test-notes','nonplay-test-notes',false,10485760,array['application/pdf']);
-- Restrictive policy also defeats a broader pre-existing permissive storage policy.
create policy nonplay_test_no_direct_storage on storage.objects as restrictive for all to anon,authenticated
  using(bucket_id<>'nonplay-test-notes') with check(bucket_id<>'nonplay-test-notes');
$install$;
  end if;

with acl as (
  select 'relation' kind,c.oid,
    jsonb_agg(jsonb_build_array(
      case when a.grantor=c.relowner then '$owner' else pg_get_userbyid(a.grantor) end,
      case when a.grantee=0 then 'PUBLIC' when a.grantee=c.relowner then '$owner' else pg_get_userbyid(a.grantee) end,
      a.privilege_type,a.is_grantable) order by a.grantor=c.relowner,a.grantee=0,a.grantee=c.relowner,pg_get_userbyid(a.grantee),a.privilege_type) grants
  from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) a
  where c.relnamespace='public'::regnamespace and c.relname like 'nonplay\_test\_%' escape '\'
  group by c.oid
  union all
  select 'function',p.oid,
    jsonb_agg(jsonb_build_array(
      case when a.grantor=p.proowner then '$owner' else pg_get_userbyid(a.grantor) end,
      case when a.grantee=0 then 'PUBLIC' when a.grantee=p.proowner then '$owner' else pg_get_userbyid(a.grantee) end,
      a.privilege_type,a.is_grantable) order by a.grantor=p.proowner,a.grantee=0,a.grantee=p.proowner,pg_get_userbyid(a.grantee),a.privilege_type)
  from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where p.pronamespace='public'::regnamespace and p.proname like 'nonplay\_test\_%' escape '\'
  group by p.oid
), objects as (
  select 'relation '||c.relname name,jsonb_build_object(
    'kind',c.relkind,'owner',c.relowner=(select oid from pg_roles where rolname=current_user),
    'persistence',c.relpersistence,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
    'options',c.reloptions,'replica_identity',c.relreplident,'grants',acl.grants,
    'columns',(select jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),
      a.attnotnull,a.attidentity,a.attgenerated,co.collname,pg_get_expr(d.adbin,d.adrelid),a.attacl::text)
      order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
      left join pg_collation co on co.oid=a.attcollation where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_array(k.conname,pg_get_constraintdef(k.oid),k.convalidated,
      k.condeferrable,k.condeferred,k.connoinherit) order by k.conname)
      from pg_constraint k where k.conrelid=c.oid and k.contype<>'n'),
    'indexes',(select jsonb_agg(jsonb_build_array(i.relname,pg_get_indexdef(i.oid),x.indisvalid,x.indisready,
      x.indislive,i.reloptions) order by i.relname) from pg_index x join pg_class i on i.oid=x.indexrelid where x.indrelid=c.oid),
    'triggers',(select jsonb_agg(jsonb_build_array(t.tgname,pg_get_triggerdef(t.oid),t.tgenabled)
      order by t.tgname) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal),
    'policies',(select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_policies p where p.schemaname='public' and p.tablename=c.relname),
    'rules',(select jsonb_agg(pg_get_ruledef(r.oid) order by r.rulename) from pg_rewrite r where r.ev_class=c.oid),
    'sequence',(select jsonb_build_array(format_type(s.seqtypid,null),s.seqstart,s.seqincrement,s.seqmax,s.seqmin,s.seqcache,s.seqcycle)
      from pg_sequence s where s.seqrelid=c.oid)
  ) definition from pg_class c left join acl on acl.kind='relation' and acl.oid=c.oid
  where c.relnamespace='public'::regnamespace and c.relname like 'nonplay\_test\_%' escape '\'
    and c.relkind not in ('i','I')
  union all
  select 'function '||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
    jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',p.proowner=(select oid from pg_roles where rolname=current_user),
      'grants',acl.grants)
  from pg_proc p left join acl on acl.kind='function' and acl.oid=p.oid
  where p.pronamespace='public'::regnamespace and p.proname like 'nonplay\_test\_%' escape '\'
  union all
  select 'storage policy',coalesce(jsonb_agg(to_jsonb(p) order by p.policyname),'[]'::jsonb)
  from pg_policies p where p.schemaname='storage' and p.tablename='objects' and p.policyname='nonplay_test_no_direct_storage'
  union all
  select 'storage bucket',coalesce(jsonb_agg(jsonb_build_array(id,name,public,file_size_limit,allowed_mime_types) order by id),'[]'::jsonb)
  from storage.buckets where id='nonplay-test-notes' or name='nonplay-test-notes'
  union all
  select 'standalone types',coalesce(jsonb_agg(t.typname order by t.typname),'[]'::jsonb)
  from pg_type t where t.typnamespace='public'::regnamespace and t.typrelid=0 and t.typname like 'nonplay\_test\_%' escape '\'
)
select jsonb_object_agg(name,md5(definition::text)) into actual from objects;
  if actual is distinct from expected then
    select key into conflicting_object from (
      select jsonb_object_keys(expected) key union select jsonb_object_keys(actual)
    ) keys where actual->key is distinct from expected->key order by key limit 1;
    raise exception 'Isolated non-Play migration incompatible or incomplete object: %',conflicting_object
      using errcode='55000',
        detail=format('Expected definition/security digest %s; observed %s.',
          coalesce(expected->>conflicting_object,'absent'),coalesce(actual->>conflicting_object,'absent')),
        hint='No existing objects were replaced or repaired. Review the conflicting definition, ownership, grants and RLS; retain records and keep both gates OFF.';
  end if;
  if (select count(*)<>1 or coalesce(bool_or(enabled),true) from public.nonplay_test_config)
    or not exists(select 1 from public.nonplay_test_config where environment='production-isolated-razorpay-test-v1' and not enabled) then
    raise exception 'Isolated non-Play migration requires the existing configuration row to be present and OFF'
      using errcode='55000',hint='Review unexpected configuration state; this migration never resets an existing enable gate.';
  end if;
end $migration$;
commit;
