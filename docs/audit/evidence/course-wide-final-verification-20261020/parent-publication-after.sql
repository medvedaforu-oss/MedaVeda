begin;
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
