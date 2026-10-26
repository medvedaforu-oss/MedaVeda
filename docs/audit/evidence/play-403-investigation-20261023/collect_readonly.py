"""Read-only production evidence; never invoke workers or retrieve secret values."""
import hashlib
import json
import re
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'docs/audit/evidence/play-403-investigation-20261023'
OUT.mkdir(parents=True, exist_ok=True)
TOKEN = (Path.home() / '.supabase/access-token').read_text().strip()
BASE = 'https://api.supabase.com/v1/projects/xbvenkfmesugrbjuufyw'

def call(path, data=None, binary=False):
    req = urllib.request.Request(BASE + path, headers={
        'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'},
        data=None if data is None else json.dumps(data).encode())
    with urllib.request.urlopen(req, timeout=45) as res:
        body = res.read()
        return body if binary else json.loads(body)

def save(name, value):
    (OUT / (name + '.json')).write_text(json.dumps(value, indent=2) + '\n')
    print(name + ': saved', flush=True)

def db(sql):
    return call('/database/query', {'query': 'BEGIN TRANSACTION READ ONLY;\n' + sql + '\nROLLBACK;', 'read_only': True})

save('capture', {'captured_at_utc': datetime.now(timezone.utc).isoformat(),
    'project_ref': 'xbvenkfmesugrbjuufyw',
    'scope': 'Management GETs, SELECT-only query inside READ ONLY transaction with ROLLBACK; no Edge Function invocation'})
functions = call('/functions')
save('functions', [{k: f.get(k) for k in ['id','slug','version','status','updated_at','verify_jwt']}
    for f in functions if 'play' in f.get('slug','')])

checks = []
for slug in ['sync-play-catalog','diagnose-play-matrix','diagnose-play-pricing']:
    body = call('/functions/' + slug + '/body', binary=True)
    text = body.decode('utf-8', errors='replace')
    # ESZIP files contain bundled dependency sources. Booleans below are only
    # source-presence evidence, not proof a branch executed.
    checks.append({'slug':slug, 'sha256':hashlib.sha256(body).hexdigest(), 'bytes':len(body),
        'contains_convert_region_prices': 'pricing:convertRegionPrices' in text,
        'contains_catalog_price_conversion_operation': 'catalog.price-conversion' in text,
        'contains_configured_regions_version': 'PLAY_CATALOG_REGIONS_VERSION' in text,
        'contains_tokeninfo': 'https://oauth2.googleapis.com/tokeninfo' in text,
        'contains_one_time_products_operation': 'one_time_products' in text,
        'contains_subscriptions_list': '/subscriptions?' in text,
        'contains_INR_49_request_literal': bool(re.search(r'units:\s*[\"\']49[\"\']',text))})
    # Keep downloaded source bundles outside report tree, private to this user.
    path = Path('/tmp') / ('medveda-20261023-' + slug + '.eszip')
    path.write_bytes(body)
    path.chmod(0o600)
save('deployed-source-checks',checks)

save('catalog-state',db("""
select json_build_object(
 'captured_at',now(),
 'cron',(select json_agg(j) from (select jobid,jobname,active,schedule from cron.job where jobname ilike '%play%' order by jobid) j),
 'verified_active_tiers',(select count(*) from public.play_price_tiers where active and verified_at is not null),
 'catalog',(select json_agg(j) from (select price_inr,candidate_sku,status,attempts,last_synced_at,
   case when last_error ~ '^Google (API operation=|Play API [0-9]{3}$)' then last_error else 'other/redacted' end as error
   from public.play_price_sync order by price_inr) j),
 'play_order_status_counts',(select json_agg(o) from (select status,count(*) as count from public.orders where provider='play' group by status) o),
 'play_payment_provider_counts',(select json_agg(p) from (select provider,status,count(*) as count from public.payments where provider ilike '%play%' group by provider,status) p)
) as state;
"""))

sql = "select timestamp,event_message from logs where source='function_logs' and event_message like '%play_catalog_failure%' order by timestamp desc limit 30"
logs = call('/analytics/endpoints/logs?' + urllib.parse.urlencode({'sql':sql,'iso_timestamp_start':'2026-10-19T00:00:00Z'}))
events=[]
for row in logs.get('result',[]):
    message=row.get('event_message','')
    try:
        p=json.loads(message.split('play_catalog_failure',1)[1].strip())
        correlation=p.get('requestId','')
        events.append({'timestamp':row.get('timestamp'),'operation':p.get('operation') if p.get('operation') in ['catalog.price-conversion','catalog.patch','catalog.activate','catalog.get'] else 'other',
            'status':p.get('status') if isinstance(p.get('status'),int) else None,
            'reason':p.get('reason') if p.get('reason') in ['PERMISSION_DENIED','unclassified','permissionDenied','forbidden'] else 'other',
            'application_correlation_id':correlation if re.fullmatch(r'[a-f0-9-]{36}',correlation) else None,
            'sanitized_details_count':len(p.get('details',[])),
            'full_google_response_available':False})
    except (ValueError,IndexError,TypeError):
        events.append({'timestamp':row.get('timestamp'),'structured_event_unavailable':True})
save('catalog-log-events', {'query_start_utc':'2026-10-19T00:00:00Z','query_had_error':bool(logs.get('error')),'events':events})
