\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('a11d0000-0000-0000-0000-000000000001','review-buyer@example.invalid'),
 ('a11d0000-0000-0000-0000-000000000002','review-other@example.invalid');
insert into public.years(id,title,course_id) values ('audit_y','Audit year','bams');
insert into public.subjects(id,title,year_id) values ('audit_s','Audit subject','audit_y');
insert into public.quiz_tests(id,title,subject_id,year_id,questions)
values ('audit_quiz','Synthetic paid quiz','audit_s','audit_y',
  '[{"question":"Synthetic question","options":["A","B"],"answer":"A"}]');
update public.profiles set course_id='bams',year_id='audit_y'
where id in ('a11d0000-0000-0000-0000-000000000001','a11d0000-0000-0000-0000-000000000002');
insert into public.products(id,title,scope,price,subject_id,course_id)
values ('audit_product','Quiz product','subject',49,'audit_s','bams');
insert into public.quiz_product_entitlements values ('audit_quiz','audit_product');
insert into public.notifications(id,title,body,type,recipient_ids)
values ('audit_targeted','Synthetic message','Synthetic body','payment_success',
  array['a11d0000-0000-0000-0000-000000000001'::uuid]);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a11d0000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 if exists(select 1 from public.quiz_tests where id='audit_quiz') then raise exception 'unpaid quiz exposed'; end if;
 begin
  perform public.submit_quiz_attempt('audit_attempt_001','audit_quiz',1,'[0]');
  raise exception 'unpaid submission accepted';
 exception when insufficient_privilege then null; end;
 if not exists(select 1 from public.notifications where id='audit_targeted') then raise exception 'target cannot read message'; end if;
end $$;
reset role;
insert into public.purchases(id,user_id,product_id,scope,status,subject_id,course_id)
values ('audit_purchase','a11d0000-0000-0000-0000-000000000001','audit_product','subject','success','audit_s','bams');
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.quiz_tests where id='audit_quiz') then raise exception 'buyer cannot read quiz'; end if;
 if (public.submit_quiz_attempt('audit_attempt_002','audit_quiz',1,'[0]')->>'score')::int<>1 then raise exception 'buyer submission failed'; end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"a11d0000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 if exists(select 1 from public.quiz_tests where id='audit_quiz') then raise exception 'other user sees quiz'; end if;
 if exists(select 1 from public.notifications where id='audit_targeted') then raise exception 'other user sees message'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 if exists(select 1 from public.notifications where id='audit_targeted') then raise exception 'anonymous sees message'; end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.security_change_audit where table_name='products' and row_id='audit_product')
 then raise exception 'audit entry missing'; end if;
end $$;
set local role supabase_auth_admin;
do $$ declare result jsonb; begin
 for i in 1..5 loop
  result := public.enforce_password_lockout('{"user_id":"a11d0000-0000-0000-0000-000000000001","valid":false}');
 end loop;
 result := public.enforce_password_lockout('{"user_id":"a11d0000-0000-0000-0000-000000000001","valid":true}');
 if result->>'decision'<>'reject' then raise exception 'lockout bypassed'; end if;
end $$;
reset role;
select 'PASS: proposed quiz access, submission, notification audience, audit and password lockout SQL' as result;
rollback;
