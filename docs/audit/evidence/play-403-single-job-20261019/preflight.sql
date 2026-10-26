select json_build_object(
  'captured_at', now(),
  'catalog', (select json_agg(json_build_object(
    'price_inr', price_inr, 'candidate_sku', candidate_sku,
    'purchase_option_id', purchase_option_id, 'status', status,
    'attempts', attempts, 'lease_id', lease_id, 'lease_until', lease_until,
    'updated_at', updated_at)) from public.play_price_sync),
  'cron', (select json_agg(json_build_object(
    'jobid', jobid, 'jobname', jobname, 'active', active, 'schedule', schedule))
    from cron.job where jobname = 'play-catalog-sync'),
  'queued_catalog_http', (select count(*) from net.http_request_queue
    where url = 'https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/sync-play-catalog'),
  'running_catalog_cron_sql', (select count(*) from cron.job_run_details
    where jobid = 8 and status = 'running')
) as preflight;
