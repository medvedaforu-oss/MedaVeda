begin;
create or replace function public.has_content_access(p_course_id text, p_year_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.am_i_admin()
    or exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and pr.course_id = p_course_id
        and (
          p_year_id is null
          or pr.year_id = p_year_id
          or pr.year_id is null   -- TEMPORARY – remove after min app version X
        )
    )
    or exists (
      select 1
      from public.purchases pu
      left join public.chapters ch on pu.scope = 'chapter' and ch.id = pu.chapter_id
      left join public.subjects sb on pu.scope = 'subject' and sb.id = pu.subject_id
      where pu.user_id = auth.uid()
        and pu.status = 'success'
        and pu.course_id = p_course_id
        and (
          p_year_id is null
          or (pu.scope = 'year' and pu.year_id = p_year_id)
          or (pu.scope = 'bundle' and p_year_id = any(pu.year_ids))
          or (pu.scope = 'chapter' and ch.year_id = p_year_id)
          or (pu.scope = 'subject' and sb.year_id = p_year_id)
        )
    );
$$;
insert into auth.users(id,email) values ('c0ffee00-0000-0000-0000-000000000001','parent-verification@example.test');
insert into public.years(id,title,course_id) values ('verification_registration','Registered year','bams');
select set_config('app.allow_profile_admin_fields','true',true);
update public.profiles set course_id='bams',year_id='verification_registration' where id='c0ffee00-0000-0000-0000-000000000001';
select set_config('app.allow_profile_admin_fields','false',true);
update public.years set active=false where id='seed_y';
select set_config('request.jwt.claims','{"sub":"c0ffee00-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select jsonb_build_object('inactive_year_visible',(select count(*) from public.years where id='seed_y'),
'active_subject_under_inactive_year_visible',(select count(*) from public.subjects where id='seed_s'),
'active_chapter_under_inactive_year_visible',(select count(*) from public.chapters where id='seed_c'),
'active_note_under_inactive_year_visible',(select count(*) from public.notes where id='seed_note')) as parent_visibility;
reset role;
rollback;
