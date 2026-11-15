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


sql = """BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout='15s';
SELECT jsonb_build_object('role',current_user,'transaction_read_only',current_setting('transaction_read_only'),
 'payment_config',(SELECT jsonb_agg(jsonb_build_object('key',key,'value',value)) FROM public.app_config WHERE key IN ('require_ucb_for_razorpay','min_app_version')),
 'failed_order_success_purchase',(SELECT count(*) FROM public.purchases p JOIN public.orders o ON o.id=p.order_id WHERE p.status='success' AND o.status='failed'),
 'paid_without_success_purchase',(SELECT count(*) FROM public.orders o WHERE o.status='paid' AND NOT EXISTS (SELECT 1 FROM public.purchases p WHERE p.order_id=o.id AND p.status='success')),
 'success_owner_mismatch',(SELECT count(*) FROM public.purchases p JOIN public.orders o ON o.id=p.order_id WHERE p.status='success' AND p.user_id IS DISTINCT FROM o.user_id)
) AS evidence; ROLLBACK;"""
rows=request('/database/query',{'query':sql,'read_only':True})
Path(__file__).with_name('production-safety.json').write_text(json.dumps({'observed_at':datetime.now(timezone.utc).isoformat(),'project':PROJECT,'database':rows[0]['evidence']},indent=2)+'\n')
print('PASS production safety read-only aggregates/config; no customer identifiers')
