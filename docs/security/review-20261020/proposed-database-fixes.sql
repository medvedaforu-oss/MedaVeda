-- REVIEW ARTIFACT ONLY. Not installed and not in supabase/migrations.
-- Apply to staging first. All existing migrations must be present.
-- F01 denies every student quiz until its authorized products are mapped.
begin;

-- F01: explicit product-to-quiz entitlements; catalogue visibility is not payment.
create table public.quiz_product_entitlements (
  quiz_id text not null references public.quiz_tests(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  primary key (quiz_id, product_id)
);
alter table public.quiz_product_entitlements enable row level security;
revoke all on public.quiz_product_entitlements from public, anon, authenticated;
grant select, insert, update, delete on public.quiz_product_entitlements to authenticated;
grant all on public.quiz_product_entitlements to service_role;
create policy quiz_product_entitlements_admin on public.quiz_product_entitlements
  to authenticated using (public.am_i_admin()) with check (public.am_i_admin());

create function public.can_access_quiz(p_quiz_id text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select public.am_i_admin() or exists (
    select 1 from public.quiz_tests q
    join public.profiles u on u.id = auth.uid() and not coalesce(u.blocked,false)
    join public.quiz_product_entitlements m on m.quiz_id = q.id
    join public.purchases p on p.product_id = m.product_id
      and p.user_id = u.id and p.status = 'success' and p.course_id = q.course_id
    where q.id = p_quiz_id and q.active
      and public.content_is_published(q.course_id,q.year_id,q.subject_id)
  );
$$;
revoke all on function public.can_access_quiz(text) from public, anon;
grant execute on function public.can_access_quiz(text) to authenticated, service_role;
create policy quiz_tests_paid_access on public.quiz_tests as restrictive
  for select to authenticated using (public.can_access_quiz(id));
-- Also apply proposed-quiz-submission.sql: SECURITY DEFINER bypasses this RLS.
-- Add reviewed mappings, e.g. INSERT ... VALUES (real quiz id, real product id).
-- No mapping is inferred from mutable product titles or client claims.

-- F02: targeted notifications must not become public announcements.
alter table public.notifications
  add column recipient_ids uuid[],
  add column created_by uuid references auth.users(id) on delete set null,
  add constraint notifications_recipient_count
    check (recipient_ids is null or cardinality(recipient_ids) between 1 and 1000);
create policy notifications_audience on public.notifications as restrictive
  for select to anon, authenticated using (
    public.am_i_admin() or
    (active and (recipient_ids is null or auth.uid() = any(recipient_ids)))
  );
-- Existing rows have no recoverable audience. Classify/deactivate any historic
-- targeted rows before release; do not assume they were all broadcasts.
-- Deploy with the Edge insert including recipient_ids and created_by.

-- F05: password lockout enforced inside Auth, including direct password API calls.
create table public.password_lockouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failures integer not null default 0 check (failures >= 0),
  stage integer not null default 0 check (stage in (0,1)),
  locked_until timestamptz
);
alter table public.password_lockouts enable row level security;
revoke all on public.password_lockouts from public, anon, authenticated, supabase_auth_admin;
grant all on public.password_lockouts to service_role;
create function public.enforce_password_lockout(event jsonb)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := (event->>'user_id')::uuid;
  v_valid boolean := (event->>'valid')::boolean;
  v_row public.password_lockouts%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null or v_valid is null then
    return jsonb_build_object('decision','reject','message','Sign-in unavailable',
      'should_logout_user',false);
  end if;
  insert into public.password_lockouts(user_id) values(v_uid) on conflict do nothing;
  select * into v_row from public.password_lockouts where user_id=v_uid for update;
  if v_row.locked_until > v_now then
    return jsonb_build_object('decision','reject','message','Try again later',
      'should_logout_user',false);
  end if;
  if v_valid then
    delete from public.password_lockouts where user_id=v_uid;
    return jsonb_build_object('decision','continue');
  end if;
  v_row.failures := v_row.failures + 1;
  if v_row.failures >= (case when v_row.stage=0 then 5 else 3 end) then
    update public.password_lockouts
      set failures=0,stage=1,
        locked_until=v_now + case when v_row.stage=0 then interval '5 minutes' else interval '15 minutes' end
      where user_id=v_uid;
  else
    update public.password_lockouts set failures=v_row.failures,locked_until=null where user_id=v_uid;
  end if;
  return jsonb_build_object('decision','continue');
end $$;
revoke all on function public.enforce_password_lockout(jsonb) from public,anon,authenticated,service_role;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.enforce_password_lockout(jsonb) to supabase_auth_admin;
-- Must additionally enable this Password Verification hook in Supabase Auth.
-- This protects password attempts, not OTP send/verification. Keep provider limits.

-- F07: audit administration and billing changes without copying tokens/contact data.
create table public.security_change_audit (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_kind text not null,
  table_name text not null,
  row_id text,
  operation text not null,
  changed_columns text[] not null,
  old_values jsonb not null,
  new_values jsonb not null
);
alter table public.security_change_audit enable row level security;
revoke all on public.security_change_audit from public,anon,authenticated,service_role;
grant select on public.security_change_audit to authenticated,service_role;
create policy security_change_audit_read on public.security_change_audit
  for select to authenticated using(public.am_i_admin());
create function public.audit_security_change()
returns trigger language plpgsql security definer
set search_path=public,pg_temp as $$
declare
  v_old jsonb := case when TG_OP='INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when TG_OP='DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_o jsonb;
  v_n jsonb;
  v_columns text[];
  v_actor uuid := auth.uid();
  v_allowed text[] := array['id','active','blocked','course_id','year_id','year_ids',
    'subject_id','chapter_id','product_id','scope','price','original_price','product_type',
    'status','amount','entry_type','source','reverses_id','resolved_at','resolved_by',
    'require_mfa','enabled','key','value','is_free_preview','question_revision'];
begin
  select coalesce(array_agg(k order by k),'{}'::text[]) into v_columns
  from (
    select key as k from jsonb_each(v_old)
    union select key as k from jsonb_each(v_new)
  ) keys where v_old->k is distinct from v_new->k;
  -- app_config values contain release flags, never user-entered credentials.
  -- For app_settings, record column names but not arbitrary values.
  if TG_TABLE_NAME='app_settings' then
    select coalesce(jsonb_object_agg(key,'"[changed]"'::jsonb),'{}'::jsonb) into v_o
      from jsonb_each(v_old) where value is distinct from v_new->key;
    select coalesce(jsonb_object_agg(key,'"[changed]"'::jsonb),'{}'::jsonb) into v_n
      from jsonb_each(v_new) where value is distinct from v_old->key;
  else
    select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into v_o
      from jsonb_each(v_old) where key=any(v_allowed) and value is distinct from v_new->key;
    select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into v_n
      from jsonb_each(v_new) where key=any(v_allowed) and value is distinct from v_old->key;
  end if;
  if TG_TABLE_NAME='notifications' then
    v_actor := coalesce(v_actor,(coalesce(v_new->>'created_by',v_old->>'created_by'))::uuid);
  end if;
  insert into public.security_change_audit(actor_id,actor_kind,table_name,row_id,operation,changed_columns,old_values,new_values)
    values(v_actor,case when v_actor is null then 'service/database' else 'user' end,
      TG_TABLE_NAME,coalesce(v_new->>'id',v_old->>'id',v_new->>'key',v_old->>'key'),
      TG_OP,v_columns,v_o,v_n);
  if TG_OP='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.audit_security_change() from public,anon,authenticated,service_role;
do $$
declare t text;
begin
  foreach t in array array['admins','admin_settings','profiles','products','courses','years',
    'subjects','chapters','notes','videos','quiz_tests','quiz_product_entitlements',
    'notifications','app_settings','app_config','orders','purchases','payments',
    'wallet_ledger','referrals','order_review_flags']
  loop
    execute format('create trigger security_change_audit after insert or update or delete on public.%I
      for each row execute function public.audit_security_change()',t);
  end loop;
end $$;
commit;
