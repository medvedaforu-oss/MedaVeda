-- PREPARED ONLY. Separate owner approval required before any production execution.
-- Restore former fulfillment response contract from captured live pg_get_functiondef.
-- Revert the three verifier/worker code bundles first if reverting them at all.
-- Keep service-only play_duplicate_recorded and product revision enforcement.
-- No order/payment/purchase/ledger/entitlement data changes; no migration-history edits.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
CREATE OR REPLACE FUNCTION public.get_my_play_fulfillment(p_order_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_order_id and user_id=auth.uid() and provider='play';
  if not found then return jsonb_build_object('success',false,'pending',true); end if;
  if o.status='refunded' then
    return jsonb_build_object('success',false,'pending',false,'message','This payment was refunded.'); end if;
  if exists(select 1 from public.purchases where order_id=o.id and status='duplicate') then
    return jsonb_build_object('success',false,'pending',false,'message','This product was already owned; contact support for a refund.'); end if;
  if public.play_entitlement_committed(o.id,o.purchase_token) then
    return jsonb_build_object('success',true,'internalOrderId',o.id,'amount',o.amount); end if;
  return jsonb_build_object('success',false,'pending',true);
end $function$
;
revoke all on function public.get_my_play_fulfillment(text) from public,anon,authenticated,service_role;
grant execute on function public.get_my_play_fulfillment(text) to postgres,authenticated,service_role;
commit;
