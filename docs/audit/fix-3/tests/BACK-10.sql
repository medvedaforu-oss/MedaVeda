\set ON_ERROR_STOP on
begin;
select set_config('app.allow_profile_admin_fields','true',true);
update public.profiles set course_id='bams',blocked=false where id='5eed0000-0000-0000-0000-00000000000b';
select set_config('request.jwt.claim.sub','5eed0000-0000-0000-0000-00000000000b',true);
set local role authenticated;
do $$ begin assert public.has_content_access('bams','seed_y'),'normal own course denied'; end $$;
reset role;
update public.profiles set blocked=true where id='5eed0000-0000-0000-0000-00000000000b';
set local role authenticated;
do $$ begin assert not public.has_content_access('bams','seed_y'),'blocked own-course access remains'; end $$;
reset role;
update public.profiles set course_id='bhms',blocked=false where id='5eed0000-0000-0000-0000-00000000000b';
set local role authenticated;
do $$ begin assert public.has_content_access('bams','seed_y'),'normal purchase branch denied'; end $$;
reset role;
update public.profiles set blocked=true where id='5eed0000-0000-0000-0000-00000000000b';
set local role authenticated;
do $$ begin assert not public.has_content_access('bams','seed_y'),'blocked purchase branch remains'; end $$;
reset role;
insert into public.admins(id,email) values('5eed0000-0000-0000-0000-00000000000b','fix3-admin@example.invalid');
set local role authenticated;
do $$ begin assert public.has_content_access('bams','seed_y'),'admin branch changed'; end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
do $$ begin assert not public.has_content_access('bams','seed_y'),'missing JWT allowed'; end $$;
rollback;
\echo PASS BACK-10 blocked own-course/purchased denied, normal/admin unchanged
