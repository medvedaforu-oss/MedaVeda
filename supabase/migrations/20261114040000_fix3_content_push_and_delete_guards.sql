-- Fix 3 BACK-10/15/17. Forward-only; no hosted execution, no billing/MFA flag changes.
begin;
create or replace function public.has_content_access(p_course_id text,p_year_id text)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select public.am_i_admin() or (
  exists(select 1 from public.profiles pr where pr.id=auth.uid() and not coalesce(pr.blocked,false))
  and public.content_is_published(p_course_id,p_year_id)
  and (exists(select 1 from public.profiles pr where pr.id=auth.uid() and pr.course_id=p_course_id)
   or exists(select 1 from public.purchases pu
    left join public.chapters ch on pu.scope='chapter' and ch.id=pu.chapter_id
    left join public.subjects sb on pu.scope='subject' and sb.id=pu.subject_id
    where pu.user_id=auth.uid() and pu.status='success' and pu.course_id=p_course_id
    and (p_year_id is null or (pu.scope='year' and pu.year_id=p_year_id)
     or (pu.scope='bundle' and p_year_id=any(pu.year_ids))
     or (pu.scope='chapter' and ch.year_id=p_year_id)
     or (pu.scope='subject' and sb.year_id=p_year_id)))));
$$;
revoke all on function public.has_content_access(text,text) from public,anon;
grant execute on function public.has_content_access(text,text) to authenticated,service_role;

-- Both RPC and direct INSERT share the target-user lock. Ownership-changing
-- client updates are already prohibited by RLS WITH CHECK; keep the cap there too.
create or replace function public.push_tokens_cap()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
begin
 if coalesce(current_setting('role',true),'none') in ('anon','authenticated') then
  if tg_op='UPDATE' and new.user_id is not distinct from old.user_id then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('push-token-user:'||new.user_id::text,0));
  if not exists(select 1 from public.push_tokens where expo_push_token=new.expo_push_token and user_id=new.user_id)
    and (select count(*) from public.push_tokens where user_id=new.user_id)>=10 then
   raise exception 'Too many registered devices.' using errcode='54000';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists push_tokens_cap on public.push_tokens;
create trigger push_tokens_cap before insert or update of user_id on public.push_tokens
for each row execute function public.push_tokens_cap();
revoke all on function public.push_tokens_cap() from public,anon,authenticated;

create or replace function public.register_push_token(p_token text,p_platform text)
returns void language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Not authenticated' using errcode='28000'; end if;
 if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$' then
  raise exception 'Invalid push token' using errcode='22023'; end if;
 if p_platform is null or p_platform not in ('ios','android','web') then
  raise exception 'Invalid platform' using errcode='22023'; end if;
 if not public.rate_limit_hit('push-register:'||v_uid::text,30,3600) then
  raise exception 'Too many requests' using errcode='54000'; end if;
 perform pg_advisory_xact_lock(hashtextextended('push-token-user:'||v_uid::text,0));
 if not exists(select 1 from public.push_tokens where expo_push_token=p_token and user_id=v_uid) then
  delete from public.push_tokens where user_id=v_uid and id in (
   select id from public.push_tokens where user_id=v_uid
   order by updated_at desc,id desc offset 9);
 end if;
 insert into public.push_tokens(user_id,expo_push_token,platform,updated_at)
 values(v_uid,p_token,p_platform,clock_timestamp())
 on conflict(expo_push_token) do update
 set user_id=excluded.user_id,platform=excluded.platform,updated_at=excluded.updated_at;
end $$;
revoke all on function public.register_push_token(text,text) from public,anon;
grant execute on function public.register_push_token(text,text) to authenticated;

-- Repository mobile clients invoke delete-account; never delete here. Retire
-- the alternate unlimited RPC. Existing internal function definition retained.
revoke all on function public.delete_my_account() from public,anon,authenticated;
commit;
