select json_build_object(
  'captured_at', now(),
  'jobs', (select json_agg(j) from (
    select price_inr, candidate_sku, purchase_option_id, status, attempts,
      lease_id, lease_until, next_attempt_at, last_synced_at, updated_at,
      case when last_error ~ '^Google API operation=[a-z.-]+ status=[0-9]+ reason=[A-Za-z_]+ request=[a-f0-9-]+$'
        then last_error else substring(last_error from 'Google Play API(?: returned)? [0-9]{3}') end as safe_error
    from public.play_price_sync where price_inr in (1.00,2.00) order by price_inr
  ) j),
  'events', (select json_agg(e) from (
    select price_inr, event, created_at,
      case when detail ~ '^Google API operation=[a-z.-]+ status=[0-9]+ reason=[A-Za-z_]+ request=[a-f0-9-]+$'
        then detail else substring(detail from 'Google Play API(?: returned)? [0-9]{3}') end as safe_error
    from public.play_price_sync_logs where price_inr in (1.00,2.00) order by id desc limit 15
  ) e),
  'tiers', (select json_agg(t) from (
    select price_inr, play_sku, purchase_option_id, active, verified_at
    from public.play_price_tiers where price_inr in (1.00,2.00)
  ) t),
  'http', (select json_agg(h) from (
    select id, status_code, timed_out, created,
      substring(content from '"processed"\s*:\s*([0-9]+)') as processed,
      substring(content from '"status"\s*:\s*"(failed|retry|ready)"') as worker_status
    from net._http_response where id = __REQUEST_ID__
  ) h)
) as monitoring;
