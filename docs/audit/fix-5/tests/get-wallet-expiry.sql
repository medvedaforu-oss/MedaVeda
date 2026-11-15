\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5-expiry-api@example.invalid');
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,created_at,expires_at)
values('f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment',now()-interval '40 days',now()-interval '10 days');
select set_config('request.jwt.claims','{"sub":"f5000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$ declare r jsonb; begin
 select to_jsonb(w) into r from public.get_my_wallet() w;
 assert (r->>'available')::numeric=0,'expired money still spendable';
 assert (r->>'expired')::numeric=100,'wallet API must disclose expired money';
end $$;
\echo PASS owner wallet API discloses expiry total
rollback;
