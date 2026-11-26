-- Read-only evidence only. Does not requeue, claim, invoke, finish or change cron.
BEGIN TRANSACTION READ ONLY;
SELECT jsonb_build_object(
  'captured_at', now(),
  'catalog', (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.price_inr)
    FROM public.play_price_sync s),
  'target_tiers', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    FROM public.play_price_tiers t WHERE t.price_inr IN (1,2)
      OR t.play_sku IN ('notes_1_00_v_066f5677fba745d696d1504b7600f8f7',
                       'notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3')),
  'eligible_one_rupee_products', (SELECT count(*) FROM public.products p
    WHERE p.price=1 AND public.play_notes_product_eligible(p)),
  'play_cron', (SELECT jsonb_agg(jsonb_build_object(
    'jobid',jobid,'jobname',jobname,'active',active,'schedule',schedule))
    FROM cron.job WHERE jobname IN ('play-catalog-sync','play-consume',
                                    'play-reconcile','play-voids')),
  'queued_catalog_http', (SELECT count(*) FROM net.http_request_queue
    WHERE url='https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/sync-play-catalog'),
  'running_catalog_cron_sql', (SELECT count(*) FROM cron.job_run_details d
    JOIN cron.job j ON j.jobid=d.jobid
    WHERE j.jobname='play-catalog-sync' AND d.status='running')
) AS catalog_preflight;
ROLLBACK;
