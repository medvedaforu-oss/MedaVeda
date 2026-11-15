-- SOURCE ONLY: owner applies after staging and explicit retention approval.
begin;
create or replace function public.purge_expired_first_purchase_identities()
returns bigint language plpgsql security definer set search_path=public as $$
declare removed bigint;
begin
 delete from public.first_purchase_identities where first_purchase_at <= now()-interval '180 days';
 get diagnostics removed=row_count;
 return removed;
end $$;
revoke all on function public.purge_expired_first_purchase_identities() from public,anon,authenticated;
grant execute on function public.purge_expired_first_purchase_identities() to service_role;
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  if not exists(select 1 from cron.job where jobname='first-purchase-identity-retention') then
   perform cron.schedule('first-purchase-identity-retention','0 * * * *','select public.purge_expired_first_purchase_identities();');
  end if;
 else
  raise notice 'pg_cron absent: owner must install/approve scheduler separately; retention job not scheduled';
 end if;
end $$;
commit;
