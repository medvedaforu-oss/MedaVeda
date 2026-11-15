\set ON_ERROR_STOP on
begin;
insert into public.admins(id,email) values('5eed0000-0000-0000-0000-00000000000b','fix3-admin@example.invalid');
select set_config('request.jwt.claim.sub','5eed0000-0000-0000-0000-00000000000b',true);
insert into public.order_review_flags(id,reason) values('f3000000-0000-4000-8000-000000000012','stale_order_paid');
set local role authenticated;
select public.admin_resolve_order_flag('f3000000-0000-4000-8000-000000000012','fixed');
do $$ begin
 assert exists(select 1 from public.order_review_flags where id='f3000000-0000-4000-8000-000000000012' and resolved_at is not null),'positive resolution failed';
 begin
  perform public.admin_resolve_order_flag('f3000000-0000-4000-8000-000000000099','absent');raise exception 'missing flag falsely succeeded';
 exception when others then assert sqlerrm='Flag not found or already resolved',sqlerrm; end;
 begin
  perform public.admin_resolve_order_flag('f3000000-0000-4000-8000-000000000012','again');raise exception 'resolved flag falsely succeeded';
 exception when others then assert sqlerrm='Flag not found or already resolved',sqlerrm; end;
end $$;
rollback;
\echo PASS BACK-12 exactly one flag resolved, repeats/missing fail
