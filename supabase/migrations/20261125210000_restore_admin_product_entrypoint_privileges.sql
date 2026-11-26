-- MV-001: local forward correction; apply only after reviewing hosted ACL drift.
-- No row, price, function body, RLS policy or checkout behavior is changed.
begin;
do $$
begin
  if not (select relrowsecurity from pg_class where oid='public.products'::regclass)
     or not exists(select 1 from pg_policy where polrelid='public.products'::regclass
       and polname='products_admin_write' and polcmd='*' and polpermissive
       and pg_get_expr(polqual,polrelid)='am_i_admin()'
       and pg_get_expr(polwithcheck,polrelid)='am_i_admin()')
     or exists(select 1 from pg_policy where polrelid='public.products'::regclass
       and polpermissive and polcmd in ('*','a','w','d') and polname<>'products_admin_write') then
    raise exception 'Product Admin authorization policy differs; review before restoring privileges';
  end if;
  if not exists(select 1 from pg_proc where oid='public.products_update(text,integer,jsonb)'::regprocedure
    and prosecdef and proconfig @> array['search_path=""']) then
    raise exception 'Revision-aware product RPC security differs; review before restoring privileges';
  end if;
end $$;
-- RLS still restricts both direct entry points to am_i_admin(), including
-- the existing switchable MFA check. Updates use the revision-aware RPC only.
grant insert, delete on table public.products to authenticated;
grant execute on function public.products_update(text,integer,jsonb) to authenticated;
commit;
