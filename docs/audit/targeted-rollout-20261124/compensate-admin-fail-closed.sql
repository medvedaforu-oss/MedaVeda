-- PREPARED ONLY. Separate owner approval required before production execution.
-- Safe compensation: withhold Ready while preserving revisions, RPC, trigger,
-- authorization/MFA and exact predeployment view grants (see predeployment.json).
-- Retain the sanitized revised column contract; do not restore raw Google errors.
-- Do not drop revision, restore direct UPDATE or roll back orders/entitlements.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create or replace view public.admin_play_billing_status with (security_invoker=true) as
select p.id as product_id,p.title,p.price,p.active as catalog_active,
  case when not p.active then 'catalog_inactive'
       when p.price=0 then 'free'
       when not public.play_notes_product_eligible(p) then 'not_billable_notes'
       when s.status='ready' and t.active and t.verified_at>now()-interval '24 hours'
         and t.price_inr=p.price and t.currency_code='INR' and t.region_code='IN'
         and t.purchase_option_id=s.purchase_option_id then 'stale'
       when s.status='ready' and not t.active then 'tier_inactive'
       when s.status='ready' then 'stale'
       else coalesce(s.status,'pending') end as billing_status,
  t.play_sku,t.purchase_option_id,t.price_inr as synced_price,t.currency_code,
  s.last_synced_at,
  case when s.last_error is null then null
       when s.last_error ~* '403|permission|access denied' then
         'Google Play catalog access denied. Review package and service account permissions.'
       when s.last_error ~* '401|unauthenticated|credential|configuration' then
         'Google Play catalog authentication needs administrator review.'
       when s.last_error ~* '429|quota|rate limit' then
         'Google Play catalog request limit reached. A later recheck is required.'
       else 'Catalog verification failed. Review the server diagnostics before retrying.' end as last_error,
  s.attempts,p.revision as product_revision
from public.products p
left join public.play_price_sync s on s.price_inr=p.price
left join public.play_price_tiers t on t.play_sku=s.candidate_sku
where public.am_i_admin();
revoke all on public.admin_play_billing_status from public,anon,authenticated;
grant all on public.admin_play_billing_status to postgres,service_role;
grant select on public.admin_play_billing_status to authenticated;
commit;
