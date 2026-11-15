\set ON_ERROR_STOP on
begin;
-- All rows below are disposable synthetic test fixtures, never hosted reads.
insert into auth.users(id,email) values('f4000000-0000-0000-0000-000000000001','fix4a@example.invalid'),('f4000000-0000-0000-0000-000000000002','fix4b@example.invalid');
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

delete from public.admins where id='f4000000-0000-0000-0000-000000000002';
do $$ begin assert not exists(select 1 from public.notification_requests where admin_id='f4000000-0000-0000-0000-000000000002'),'admin removal left request rows';end $$;
rollback;
