do $$
begin
  if (select count(*) from cron.job where jobid=8 and jobname='play-catalog-sync'
      and not active) <> 1 then raise exception 'Catalog cron is not paused'; end if;
  if (select count(*) from public.play_price_sync) <> 2
     or not exists(select 1 from public.play_price_sync where price_inr=1.00
       and candidate_sku='notes_1_00_v_066f5677fba745d696d1504b7600f8f7'
       and purchase_option_id='buy' and status='pending' and attempts=1
       and lease_id is null and lease_until is null)
     or not exists(select 1 from public.play_price_sync where price_inr=2.00
       and candidate_sku='notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3'
       and status='failed' and attempts=1 and lease_id is null and lease_until is null)
     or exists(select 1 from public.play_price_sync where price_inr<>1.00
       and status in ('pending','running','ready')) then
    raise exception 'The approved one-rupee job is not the sole runnable job';
  end if;
  if exists(select 1 from net.http_request_queue
      where url='https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/sync-play-catalog')
     or exists(select 1 from cron.job_run_details where jobid=8 and status='running') then
    raise exception 'A catalog invocation remains queued/running';
  end if;
  if (select count(*) from vault.decrypted_secrets where name='PLAY_CATALOG_CRON_SECRET'
      and length(decrypted_secret)>=32) <> 1 then
    raise exception 'Expected one valid existing catalog cron secret';
  end if;
end;
$$;
select net.http_post(
  url := 'https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/sync-play-catalog',
  body := '{}'::jsonb,
  headers := jsonb_build_object('Content-Type','application/json',
    'x-play-catalog-cron-secret', (select decrypted_secret from vault.decrypted_secrets
      where name='PLAY_CATALOG_CRON_SECRET')),
  timeout_milliseconds := 120000
) as request_id;
