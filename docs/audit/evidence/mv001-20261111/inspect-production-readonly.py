"""Read only the named production project's metadata; never call a function route.

Token is read privately from the existing CLI token file, never printed/saved.
Source bundles remain in memory; evidence contains hashes and feature booleans.
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT = "xbvenkfmesugrbjuufyw"
BASE = f"https://api.supabase.com/v1/projects/{PROJECT}"
token = (Path.home() / ".supabase/access-token").read_text().strip()


def request(path, payload=None):
    assert path in ("", "/functions", "/database/query") or (
        path.startswith("/functions/") and path.endswith("/body"))
    req = Request(BASE + path,
                  data=json.dumps(payload).encode() if payload else None,
                  headers={"Authorization": "Bearer " + token,
                           "Content-Type": "application/json"})
    with urlopen(req, timeout=30) as response:
        body = response.read()
    return body if path.endswith("/body") else json.loads(body)


identity = request("")
assert identity["id"] == PROJECT and identity["name"] == "MedVeda"
functions = request("/functions")
sql = """BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout='15s';
SELECT jsonb_build_object(
 'migrations', (SELECT jsonb_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations),
 'rpcs', (SELECT jsonb_agg(jsonb_build_object('name',p.proname,
 'args',pg_get_function_identity_arguments(p.oid),'result',pg_get_function_result(p.oid),
 'definition',pg_get_functiondef(p.oid),'acl',p.proacl::text) ORDER BY p.proname)
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
 AND (p.proname IN ('settle_razorpay_payment','razorpay_entitlement_committed',
 'create_priced_order','quote_my_order','user_can_access_note','user_can_access_note_with_aal',
 'prepare_notes_choice_checkout','record_notes_choice_authorization','get_my_play_fulfillment',
 'bind_ucb_razorpay_order','settle_play_payment') OR p.proname ILIKE '%payment_job%')),
 'tables',(SELECT jsonb_agg(table_name ORDER BY table_name) FROM information_schema.tables
 WHERE table_schema='public' AND table_name IN ('notes_choice_checkouts','payment_jobs',
 'payment_captures','payment_compensations','ucb_external_refunds','provider_events')),
 'order_triggers',(SELECT jsonb_agg(pg_get_triggerdef(oid)) FROM pg_trigger
 WHERE tgrelid='public.orders'::regclass AND NOT tgisinternal),
 'history',jsonb_build_object(
 'success_on_nonpaid',(SELECT count(*) FROM public.purchases p JOIN public.orders o ON o.id=p.order_id WHERE p.status='success' AND o.status<>'paid'),
 'duplicate_success_groups',(SELECT count(*) FROM (SELECT user_id,product_id FROM public.purchases WHERE status='success' GROUP BY user_id,product_id HAVING count(*)>1) d)),
 'prices',(SELECT jsonb_agg(x) FROM (SELECT price,count(*) FROM public.products WHERE active GROUP BY price ORDER BY price) x),
 'cron',(SELECT jsonb_agg(jsonb_build_object('name',jobname,'active',active)) FROM cron.job)
) AS evidence; ROLLBACK;"""
rows = request("/database/query", {"query": sql, "read_only": True})
# Definitions are inspected locally and reduced to hashes/structural evidence.
data = rows[0]["evidence"]
for rpc in data.get("rpcs") or []:
    definition = rpc.pop("definition")
    rpc["definition_sha256"] = hashlib.sha256(definition.strip().encode()).hexdigest()
    rpc["checks_success_purchase"] = "purchases" in definition and "success" in definition
    rpc["service_definer"] = "SECURITY DEFINER" in definition
out = {"observed_at": datetime.now(timezone.utc).isoformat(), "project": PROJECT,
       "identity": {k: identity[k] for k in ("id", "name", "status", "region")},
       "database": data, "functions": [], "bundles": []}
for f in functions:
    out["functions"].append({k: f.get(k) for k in ("slug", "version", "status", "verify_jwt", "updated_at")})
    if f["slug"] not in ("create-order", "verify-payment", "razorpay-webhook", "get-note-url",
                         "attach-external-token", "report-external-transaction", "play-payment-worker",
                         "verify-play-purchase", "create-play-order", "create-order-play-choice"):
        continue
    bundle = request(f'/functions/{f["slug"]}/body')
    source = bundle.decode("utf8", "replace")
    out["bundles"].append({"slug": f["slug"], "sha256": hashlib.sha256(bundle).hexdigest(),
        **{key: key in source for key in ("razorpay_entitlement_committed", "recoveryUser",
        "getUserFromAuthHeader", "prepare_notes_choice_checkout", "record_notes_choice_authorization",
        "HMAC", "reportExternalOrder", "settleCapturedPayment")}})
Path(__file__).with_name("production-readonly.json").write_text(json.dumps(out, indent=2) + "\n")
print("PASS production read-only metadata/schema/bundle inspection; no execution endpoints invoked")
