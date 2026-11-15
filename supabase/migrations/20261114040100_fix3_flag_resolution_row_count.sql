-- BACK-12: FOUND is overwritten by set_config; inspect the UPDATE directly.
begin;
create or replace function public.admin_resolve_order_flag(p_flag_id uuid,p_note text default null)
returns void language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare v_rows integer;
begin
 if not public.am_i_admin() then raise exception 'admin only' using errcode='42501'; end if;
 perform set_config('app.trusted_order_write','true',true);
 update public.order_review_flags
 set resolved_at=now(),resolved_by=auth.uid(),resolution_note=left(coalesce(p_note,''),500)
 where id=p_flag_id and resolved_at is null;
 get diagnostics v_rows=row_count;
 perform set_config('app.trusted_order_write','false',true);
 if v_rows=0 then raise exception 'Flag not found or already resolved'; end if;
end $$;
revoke all on function public.admin_resolve_order_flag(uuid,text) from public,anon;
grant execute on function public.admin_resolve_order_flag(uuid,text) to authenticated;
commit;
