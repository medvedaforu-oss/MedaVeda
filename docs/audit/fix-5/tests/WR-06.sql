\set ON_ERROR_STOP on
begin;
-- Reproduce the exact hold+expiry arithmetic used by both earning paths.
do $$ begin
 begin
  update public.referral_settings set credit_expiry_days=2147483647 where id=true;
  perform now()+make_interval(days=>credit_hold_days+credit_expiry_days) from public.referral_settings where id=true;
  raise exception 'unsafe expiry policy accepted';
 exception when check_violation then null;
 end;
end $$;
\echo PASS unsafe expiry duration rejected before earning
rollback;
