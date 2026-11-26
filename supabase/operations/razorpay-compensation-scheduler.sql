-- OWNER/OPERATOR POST-RECOVERY ACTIVATION ONLY. Never part of migration replay.
-- Prerequisites: verified backup + isolated restore, owner-applied fence migration,
-- verified deployed worker, matching Vault/Edge worker secrets, and hosted auth checks.
-- Set RAZORPAY_COMPENSATION_AFTER to the activation instant (UTC ISO milliseconds),
-- then RAZORPAY_COMPENSATION_ENABLED=true. Earlier captures/queue rows stay excluded.
-- Recheck eligibility/reconciliation separately before any historical recovery.
-- Scheduler success means dispatch accepted, not a completed refund: inspect HTTP
-- status AND payment_compensations, including parked rows, after the first run.
begin;
do $$ begin
  if to_regprocedure('public.prepare_razorpay_compensation(text,uuid,boolean)') is null then
    raise exception 'Owner-applied compensation fence migration required';
  end if;
  if (select count(*) from vault.decrypted_secrets where name='razorpay_compensation_worker_secret'
      and length(decrypted_secret)>=64)<>1 then
    raise exception 'Unique worker secret must be provisioned securely';
  end if;
end $$;
select cron.schedule('razorpay-compensation','* * * * *',$job$
  select net.http_post(
    url:='https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/razorpay-compensation-worker',
    headers:=jsonb_build_object('Content-Type','application/json','x-razorpay-compensation-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='razorpay_compensation_worker_secret')),
    body:='{}'::jsonb,timeout_milliseconds:=120000);
$job$);
commit;
-- Rollback/stop dispatch first (preserve queue, leases and all refund fence facts):
-- update cron.job set active=false where jobname='razorpay-compensation';
-- Also set RAZORPAY_COMPENSATION_ENABLED=false. Do not remove the additive schema,
-- clear refund_dispatched_at, requeue parked attempts, or restore stale financial data.
-- Keep prior deployed payment bundles and reconcile any in-flight attempt read-only.
