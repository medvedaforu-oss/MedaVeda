-- F03: classify an already-recorded duplicate without granting or consuming it.
-- Local preparation only. No historical orders, entitlements, gates or cron DML.
begin;
create or replace function public.play_duplicate_recorded(p_order_id text,p_token text)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.purchase_token=p_token
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and p_token is not null and p_token<>''
     and o.provider='play' and o.status='paid' and o.purchase_token=p_token
     and o.user_id is not null and o.product_id is not null and o.amount>0
     and o.play_sku is not null and o.course_id is not null
     and o.scope in ('chapter','subject','year','bundle')
     and case o.scope when 'chapter' then o.chapter_id is not null
       when 'subject' then o.subject_id is not null when 'year' then o.year_id is not null
       when 'bundle' then coalesce(cardinality(o.year_ids),0)>0 and array_position(o.year_ids,null) is null else false end
     and m.provider='play' and m.play_sku=o.play_sku and m.status='success'
     and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
     and p.status='duplicate' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.play_duplicate_recorded(text,text) from public,anon,authenticated;
grant execute on function public.play_duplicate_recorded(text,text) to service_role;

create or replace function public.get_my_play_fulfillment(p_order_id text)
returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_order_id and user_id=auth.uid() and provider='play';
  if not found then return jsonb_build_object('success',false,'pending',true); end if;
  if o.status='refunded' then
    return jsonb_build_object('success',false,'pending',false,'terminal',true,'outcome','refunded',
      'internalOrderId',o.id,'message','This payment was refunded.');
  end if;
  if public.play_duplicate_recorded(o.id,o.purchase_token) then
    return jsonb_build_object('success',false,'pending',false,'terminal',true,'outcome','duplicate',
      'internalOrderId',o.id,'message','This product was already owned. No additional access was granted; contact MedVeda support for a refund.');
  end if;
  if public.play_entitlement_committed(o.id,o.purchase_token) then
    return jsonb_build_object('success',true,'internalOrderId',o.id,'amount',o.amount);
  end if;
  return jsonb_build_object('success',false,'pending',true);
end $$;
revoke all on function public.get_my_play_fulfillment(text) from public,anon;
grant execute on function public.get_my_play_fulfillment(text) to authenticated,service_role;
commit;
