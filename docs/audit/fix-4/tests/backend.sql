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
-- Wallet replay: earlier credit partially spent, expired, unrelated new credit,
-- referenced reversal, refund restoration and delayed hold availability.
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,available_at,expires_at)
values('f4100000-0000-0000-0000-000000000001','f4000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment',now()-interval '40 days',now()-interval '40 days',now()-interval '10 days');
-- Append a historical debit via a transaction-local clock fixture: validate allocation
-- using its historical created_at; current guard correctly denies expired spending.
alter table public.wallet_ledger disable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at)
values('f4100000-0000-0000-0000-000000000002','f4000000-0000-0000-0000-000000000001','debit','available',40,'order_payment',now()-interval '35 days');
alter table public.wallet_ledger enable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source)
values('f4100000-0000-0000-0000-000000000003','f4000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment');
do $$ begin assert (select available=100 from public.wallet_balance_of('f4000000-0000-0000-0000-000000000001')),'expired spend consumed future credit';end $$;
do $$ begin
 begin insert into public.wallet_ledger(user_id,entry_type,status,amount,source,reverses_id)
values('f4000000-0000-0000-0000-000000000001','reversal','available',100,'admin_adjustment','f4100000-0000-0000-0000-000000000001'); raise exception 'expired reversal admitted'; exception when check_violation then null;end;
end $$;
do $$ begin assert (select available=100 from public.wallet_balance_of('f4000000-0000-0000-0000-000000000001')),'expired reversal consumed unrelated credit';end $$;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('f4000000-0000-0000-0000-000000000001','credit','available',40,'order_refund');
do $$ begin assert (select available=140 from public.wallet_balance_of('f4000000-0000-0000-0000-000000000001')),'refund restoration failed';end $$;
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,available_at,expires_at)
values('f4100000-0000-0000-0000-000000000004','f4000000-0000-0000-0000-000000000001','credit','pending',20,'admin_adjustment',now()-interval '50 days',now()-interval '40 days',now()-interval '10 days');
update public.wallet_ledger set status='available' where id='f4100000-0000-0000-0000-000000000004';
do $$ begin
 assert (select available=160 from public.wallet_balance_of('f4000000-0000-0000-0000-000000000001')),'held credit expired before first availability';
 assert (select duration=interval '30 days' and first_available_at=now() from public.wallet_credit_terms where credit_id='f4100000-0000-0000-0000-000000000004'),'hold duration not captured';
end $$;
\echo PASS BACK-11/13 partial spend, expire, new credit, reversal, refund restoration, delayed hold
-- Service-only settings and notification reservation ACL.
do $$ begin
 assert not has_table_privilege('authenticated','public.purchase_settings','UPDATE'),'sales switch exposed';
 assert not has_table_privilege('authenticated','public.notification_requests','SELECT'),'request records exposed';
 assert not has_function_privilege('authenticated','public.reserve_notification_request(uuid,uuid,jsonb)','EXECUTE'),'reservation exposed';
end $$;
-- Existing admin fixtures are not assumed.
insert into public.admins(id,email) values('f4000000-0000-0000-0000-000000000002','fix4b@example.invalid');
do $$ declare r jsonb; n bigint;begin
 select count(*) into n from public.notifications;
 r:=public.reserve_notification_request('f4000000-0000-0000-0000-000000000002','f4200000-0000-0000-0000-000000000001','{"title":"Fix4","body":"Synthetic","type":"announcement"}');
 assert (r->>'reserved')::boolean,'first reservation rejected';
 r:=public.reserve_notification_request('f4000000-0000-0000-0000-000000000002','f4200000-0000-0000-0000-000000000001','{"title":"Fix4","body":"Synthetic","type":"announcement"}');
 assert not (r->>'reserved')::boolean,'duplicate reserved';
 assert r->'result'->'body'->>'code'='unknown_outcome','pending duplicate not unknown';
 assert (select count(*)=n+1 from public.notifications),'duplicate feed persisted';
 update public.notification_requests set status='enumeration_failed',result='{"httpStatus":200,"body":{"code":"enumeration_failed"}}';
 r:=public.reserve_notification_request('f4000000-0000-0000-0000-000000000002','f4200000-0000-0000-0000-000000000001','{"title":"Fix4","body":"Synthetic","type":"announcement"}');
 assert r->'result'->'body'->>'code'='enumeration_failed','failure result not replayed';
 assert (select count(*)=n+1 from public.notifications),'enumeration retry duplicated feed';
end $$;
select set_config('request.jwt.claim.sub','f4000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select public.get_admin_analytics('bams');
reset role;
\echo PASS ADM-03 reservation/replay/enumeration retry and ADM-08 admin snapshot
rollback;
