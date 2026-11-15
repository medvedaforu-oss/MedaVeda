\set ON_ERROR_STOP on
begin;
update public.referral_settings set credit_expiry_days=0 where id=true;
do $$ begin assert (select credit_expiry_days is null from public.referral_settings where id=true),'zero must normalize to no expiry'; end $$;
update public.referral_settings set credit_expiry_days=null where id=true;
do $$ begin
 begin update public.referral_settings set credit_expiry_days=-1 where id=true; raise exception 'negative accepted'; exception when check_violation then null; end;
end $$;
\echo PASS WR-03 DB null and zero no-expiry
rollback;
