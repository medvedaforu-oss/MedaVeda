-- A void set_my_course_year could succeed after updating zero rows when an
-- Auth account had no profile. Reuse the server-owned signup mapping for a
-- lazy backfill, then require the validated update to affect exactly one row.
-- No client INSERT/UPSERT grants or RLS policies are changed.
begin;

create or replace function public.backfill_auth_user_profile(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profiles (id, name, email, phone)
  select u.id,
         coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data ->> 'name'), ''), ''),
         u.email,
         public.normalize_phone(coalesce(
           nullif(btrim(u.raw_user_meta_data ->> 'mobile_number'), ''),
           nullif(btrim(u.raw_user_meta_data ->> 'phone'), '')))
  from auth.users u
  where u.id = p_user_id
    and not exists (select 1 from public.profiles p where p.id = u.id)
  on conflict (id) do nothing;
$$;

-- Only the existing SECURITY DEFINER signup trigger and validated RPC call
-- this helper. Clients cannot choose an account ID or profile fields.
revoke all on function public.backfill_auth_user_profile(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.backfill_auth_user_profile(new.id);
  return new;
end;
$$;

create or replace function public.set_my_course_year(p_course_id text, p_year_id text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_course_active boolean;
  v_year_course_id text;
  v_updated bigint;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select active into v_course_active from public.courses where id = p_course_id;
  if v_course_active is null then
    raise exception 'Unknown course: %', p_course_id;
  end if;
  if not v_course_active then
    raise exception 'Course % is not active', p_course_id;
  end if;

  if p_year_id is not null then
    select course_id into v_year_course_id from public.years where id = p_year_id and active = true;
    if v_year_course_id is null then
      raise exception 'Unknown or inactive year: %', p_year_id;
    end if;
    if v_year_course_id is distinct from p_course_id then
      raise exception 'Year % does not belong to course %', p_year_id, p_course_id;
    end if;
  end if;

  -- Only auth.uid() is eligible for repair; names/email/phone come from the
  -- same auth.users source as signup. Existing profile values are preserved.
  perform public.backfill_auth_user_profile(v_uid);
  perform set_config('app.allow_profile_admin_fields', 'true', true);
  update public.profiles
     set course_id = p_course_id, year_id = p_year_id, updated_at = now()
   where id = v_uid;
  get diagnostics v_updated = row_count;
  perform set_config('app.allow_profile_admin_fields', 'false', true);

  if v_updated <> 1 then
    raise exception 'Could not save your course and year. Please try again.';
  end if;
end;
$$;

revoke all on function public.set_my_course_year(text, text) from public, anon;
grant execute on function public.set_my_course_year(text, text) to authenticated;
commit;
