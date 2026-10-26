"""Read-only billing snapshot. Uses the existing authorized Supabase credential.
Never invokes an Edge Function, returns secrets, or modifies hosted state.
"""
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('control', HERE.parent / 'play-403-single-job-20261019/control.py')
control = importlib.util.module_from_spec(spec)
spec.loader.exec_module(control)

def capture(name, action):
    try:
        result = action()
    except Exception as error:
        result = {'error_class': type(error).__name__, 'http_status': getattr(error, 'code', None)}
    (HERE / (name + '.json')).write_text(json.dumps(result, indent=2) + '\n')
    print(name + ': saved', flush=True)

capture('hosted-functions', lambda: [{k: row.get(k) for k in ('slug', 'version', 'status', 'verify_jwt', 'updated_at')}
    for row in control.management('/functions')])
capture('hosted-state', lambda: control.database("""
select json_build_object(
 'captured_at',now(),
 'migrations',(select json_agg(version order by version) from supabase_migrations.schema_migrations),
 'cron',(select json_agg(j) from (select jobid,jobname,active,schedule from cron.job order by jobid) j),
 'verified_tiers',(select count(*) from public.play_price_tiers where active and verified_at is not null),
 'catalog',(select json_agg(j) from (select price_inr,candidate_sku,status,attempts,last_synced_at,
   case when last_error ~ '^Google (API operation=|Play API [0-9]{3}$)' then last_error else 'other/redacted' end as error
   from public.play_price_sync) j),
 'orders',(select json_agg(o) from (select provider,status,count(*) as count from public.orders group by provider,status) o),
 'routing_config',(select json_agg(a) from (select key,value from public.app_config
   where key in ('require_ucb_for_razorpay','min_app_version')) a),
 'recent_razorpay',(select json_agg(p) from (select p.order_id,p.amount,p.verified_at,o.status as order_status,o.scope,
   o.external_transaction_token is not null as external_choice_used,
   (select count(*) from public.purchases x where x.order_id=p.order_id and x.status='success') as successful_entitlements
   from public.payments p left join public.orders o on o.id=p.order_id
   where p.provider='razorpay' and p.verified_at>='2026-10-18' order by p.verified_at desc) p),
 'razorpay_totals',(select json_build_object('successful_payments',count(*),
   'with_successful_entitlement',count(*) filter(where exists(select 1 from public.purchases x where x.order_id=p.order_id and x.status='success')),
   'with_failed_order',count(*) filter(where exists(select 1 from public.orders o where o.id=p.order_id and o.status='failed')))
   from public.payments p where p.provider='razorpay' and p.status='success'),
 'provenance_columns',(select json_agg(column_name) from information_schema.columns
   where table_schema='public' and table_name='orders' and
   (column_name like '%version%' or column_name like '%platform%' or column_name like '%channel%' or column_name like '%installer%')),
 'note_bucket_private',(select not public from storage.buckets where id='notes')
) as state;
"""))
