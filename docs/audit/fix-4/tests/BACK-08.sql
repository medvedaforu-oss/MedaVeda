\set ON_ERROR_STOP on
begin;
insert into public.first_purchase_identities(identity_hash,kind,account_id,first_purchase_at)
values('fix4_179','email','f4000000-0000-0000-0000-000000000001',now()-interval '179 days'),
('fix4_180','email','f4000000-0000-0000-0000-000000000001',now()-interval '180 days'),
('fix4_181','email','f4000000-0000-0000-0000-000000000001',now()-interval '181 days');
select public.purge_expired_first_purchase_identities();
do $$ begin
 assert exists(select 1 from public.first_purchase_identities where identity_hash='fix4_179'),'179-day identity purged';
 assert not exists(select 1 from public.first_purchase_identities where identity_hash in('fix4_180','fix4_181')),'180/181-day identity retained';
 assert not has_function_privilege('authenticated','public.purge_expired_first_purchase_identities()','EXECUTE'),'purge exposed to student';
end $$;
rollback;
\echo PASS BACK-08 exact 179/180/181-day boundary and purge ACL
