\set ON_ERROR_STOP on
begin;
-- All rows below are disposable synthetic test fixtures, never hosted reads.
insert into auth.users(id,email) values('f4000000-0000-0000-0000-000000000001','fix4a@example.invalid'),('f4000000-0000-0000-0000-000000000002','fix4b@example.invalid');
select set_config('request.jwt.claim.sub','f4000000-0000-0000-0000-000000000001',true);
insert into public.verified_quiz_attempts(id,user_id,test_id,test_title,question_revision,answers,score,total,percentage)
select 'fix4_attempt_'||n,'f4000000-0000-0000-0000-000000000001','test','Test',1,'[]',n,10,n*10 from generate_series(1,6)n;
insert into public.verified_quiz_attempts(id,user_id,test_id,test_title,question_revision,answers,score,total,percentage)
values('fix4_other','f4000000-0000-0000-0000-000000000002','test','Other',1,'[]',10,10,100);
set local role authenticated;
do $$ declare stats jsonb;begin
 stats:=public.get_my_verified_quiz_stats();
 assert (stats->>'totalAttempts')::int=6,'foreign attempts visible';
 assert (stats->>'averagePercentage')::int=35,'average incorrect';
 assert (stats->>'bestScore')::int=60,'best incorrect';
 assert jsonb_array_length(stats->'recentQuiz')=5,'latest limit incorrect';
 begin perform public.get_admin_analytics(null);raise exception 'student admin access';exception when insufficient_privilege then null;end;
end $$;
reset role;
\echo PASS MOB-17 owner-only verified aggregate and admin denied

rollback;
