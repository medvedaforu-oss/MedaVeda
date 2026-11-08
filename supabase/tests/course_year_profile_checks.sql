-- Run against a disposable database with the repository migrations applied.
-- Exercises actual signup/profile triggers, authenticated RPC and unchanged RLS.
begin;
create function pg_temp.check(n text, ok boolean) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAIL: %', n; end if;
  raise notice 'PASS: %', n;
end $$;
create function pg_temp.as_user(p_uid uuid, p_sql text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql;
  reset role;
  return null;
exception when others then
  reset role;
  return sqlstate || ':' || sqlerrm;
end $$;

insert into public.courses(id,name,code,active) values ('_cyc_other','Other Course','_CYC',true);
insert into public.years(id,title,course_id,active) values
 ('_cyc_y1','First Year','bams',true), ('_cyc_other_y1','Other First Year','_cyc_other',true);
insert into auth.users(id,email,raw_user_meta_data) values
 ('ce000000-0000-0000-0000-000000000001','cyc1@example.invalid',
  '{"full_name":"Signup Name","mobile_number":"+919000000091","role":"admin","blocked":true,"mobile_verified":true}'),
 ('ce000000-0000-0000-0000-000000000002','cyc2@example.invalid','{"name":"Other Student"}'),
 ('ce000000-0000-0000-0000-000000000003','cyc3@example.invalid','{}');

select pg_temp.check('signup still creates identity fields through the auth trigger',
  exists(select 1 from public.profiles where id='ce000000-0000-0000-0000-000000000001'
    and name='Signup Name' and email='cyc1@example.invalid' and phone_normalized='+919000000091'
    and not blocked and not mobile_verified and referral_code is not null));
select pg_temp.check('existing profile save succeeds', pg_temp.as_user(
  'ce000000-0000-0000-0000-000000000001', $$select public.set_my_course_year('bams','_cyc_y1')$$) is null);
select pg_temp.check('both selected IDs persist', exists(select 1 from public.profiles
  where id='ce000000-0000-0000-0000-000000000001' and course_id='bams' and year_id='_cyc_y1'));

-- Reproduce the legacy account shape: auth.users exists, profiles does not.
delete from public.profiles where id='ce000000-0000-0000-0000-000000000001';
select pg_temp.check('missing-profile save repairs only the caller through the server signup mapping', pg_temp.as_user(
  'ce000000-0000-0000-0000-000000000001', $$select public.set_my_course_year('bams','_cyc_y1')$$) is null);
select pg_temp.check('repair creates one profile with exact pair and auth-owned identity',
  (select count(*)=1 from public.profiles where id='ce000000-0000-0000-0000-000000000001'
    and course_id='bams' and year_id='_cyc_y1' and name='Signup Name'
    and email='cyc1@example.invalid' and not blocked and not mobile_verified));
select pg_temp.check('another account is unchanged', exists(select 1 from public.profiles
  where id='ce000000-0000-0000-0000-000000000002' and name='Other Student' and year_id is null));

update public.profiles set name='Edited Name' where id='ce000000-0000-0000-0000-000000000001';
select pg_temp.check('retry is idempotent', pg_temp.as_user(
  'ce000000-0000-0000-0000-000000000001', $$select public.set_my_course_year('bams','_cyc_y1')$$) is null);
select pg_temp.check('retry preserves existing profile customizations', exists(select 1 from public.profiles
  where id='ce000000-0000-0000-0000-000000000001' and name='Edited Name' and year_id='_cyc_y1'));

delete from public.profiles where id='ce000000-0000-0000-0000-000000000003';
select pg_temp.check('a mismatched year is rejected before any backfill', pg_temp.as_user(
  'ce000000-0000-0000-0000-000000000003', $$select public.set_my_course_year('bams','_cyc_other_y1')$$) is not null
  and not exists(select 1 from public.profiles where id='ce000000-0000-0000-0000-000000000003'));
select pg_temp.check('direct client profile INSERT remains denied by RLS', pg_temp.as_user(
  'ce000000-0000-0000-0000-000000000003',
  $$insert into public.profiles(id,name,email) values ('ce000000-0000-0000-0000-000000000003','Unsafe','unsafe@example.invalid')$$) like '42501:%');
select pg_temp.check('private backfill helper is inaccessible to clients',
  not has_function_privilege('authenticated','public.backfill_auth_user_profile(uuid)','execute')
  and not has_function_privilege('anon','public.backfill_auth_user_profile(uuid)','execute'));
select pg_temp.check('RPC stays authenticated-only',
  not has_function_privilege('anon','public.set_my_course_year(text,text)','execute')
  and has_function_privilege('authenticated','public.set_my_course_year(text,text)','execute'));
select pg_temp.check('caller cannot backfill another account via the helper', pg_temp.as_user(
  'ce000000-0000-0000-0000-000000000001',
  $$select public.backfill_auth_user_profile('ce000000-0000-0000-0000-000000000003')$$) like '42501:%');
select pg_temp.check('zero-row update is an error if the authenticated account no longer exists', pg_temp.as_user(
  'ce000000-0000-0000-0000-000000000004', $$select public.set_my_course_year('bams','_cyc_y1')$$)
  like '%Could not save your course and year%');
select pg_temp.check('valid retry after rejected pair repairs and saves', pg_temp.as_user(
  'ce000000-0000-0000-0000-000000000003', $$select public.set_my_course_year('bams','_cyc_y1')$$) is null);
select pg_temp.check('valid retry persisted exact pair', exists(select 1 from public.profiles
  where id='ce000000-0000-0000-0000-000000000003' and course_id='bams' and year_id='_cyc_y1'));
rollback;
