do $$
begin
  if (select count(*) from cron.job where jobid=8 and jobname='play-catalog-sync'
      and schedule='* * * * *' and active) <> 1 then
    raise exception 'Catalog cron baseline changed';
  end if;
  if (select count(*) from public.play_price_sync) <> 2
     or not exists(select 1 from public.play_price_sync where price_inr=1.00
       and candidate_sku='notes_1_00_v_066f5677fba745d696d1504b7600f8f7'
       and purchase_option_id='buy' and status='failed' and attempts=1
       and lease_id is null and lease_until is null)
     or not exists(select 1 from public.play_price_sync where price_inr=2.00
       and candidate_sku='notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3'
       and status='failed' and attempts=1 and lease_id is null and lease_until is null) then
    raise exception 'Catalog baseline changed; refresh the plan';
  end if;
  perform cron.alter_job(8, active := false);
end;
$$;
select now() as paused_at, active from cron.job where jobid=8;
