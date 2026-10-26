-- Run ONLY against a disposable database built from the current migrations.
-- Uses synthetic records and rolls back all changes.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email)
values ('a11d0000-0000-0000-0000-000000000001','security-review@example.invalid');
insert into public.years(id,title,course_id) values ('audit_y','Audit year','bams');
insert into public.subjects(id,title,year_id) values ('audit_s','Audit subject','audit_y');
insert into public.quiz_tests(id,title,subject_id,year_id,questions)
values ('audit_quiz','Synthetic paid quiz','audit_s','audit_y',
  '[{"question":"Synthetic question","options":["A","B"],"answer":"A"}]');
update public.profiles set course_id='bams',year_id='audit_y'
where id='a11d0000-0000-0000-0000-000000000001';
insert into public.notifications(id,title,body,type,active)
values ('audit_targeted','Synthetic targeted message','For one recipient only','payment_success',true);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a11d0000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select 'F01 buyer purchases' as test,count(*) as observed
from public.purchases where user_id=auth.uid();
select 'F01 unpaid quiz question rows' as test,count(*) as observed
from public.quiz_tests where id='audit_quiz' and questions->0->>'answer'='A';
select 'F01 unpaid verified submission' as test,
public.submit_quiz_attempt('audit_attempt_001','audit_quiz',1,'[0]') as observed;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select 'F02 anonymous targeted message rows' as test,count(*) as observed
from public.notifications where id='audit_targeted';
reset role;
insert into public.first_purchase_identities(identity_hash,kind,account_id,first_purchase_at)
values (repeat('a',64),'email','a11d0000-0000-0000-0000-000000000001',now()-interval '181 days');
select public.erase_user_data('a11d0000-0000-0000-0000-000000000001');
delete from auth.users where id='a11d0000-0000-0000-0000-000000000001';
select 'F09 retained identity after deletion' as test,count(*) as observed
from public.first_purchase_identities where account_id='a11d0000-0000-0000-0000-000000000001';
rollback;
