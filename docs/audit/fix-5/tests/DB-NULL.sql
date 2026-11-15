\set ON_ERROR_STOP on
begin;
update public.referral_settings set credit_expiry_days=null where id=true;
do $$ begin
 assert (select credit_expiry_days is null from public.referral_settings where id=true),'canonical no-expiry NULL rejected';
 begin update public.referral_settings set credit_expiry_days=0 where id=true; raise exception 'K4 raw zero unexpectedly accepted';exception when check_violation then null;end;
end $$;
\echo PASS DB canonical NULL no-expiry; raw zero rejected per unchanged K4
rollback;
