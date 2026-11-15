"""List secret NAMES only; discard returned values/hashes. No test alert or secret update."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from datetime import datetime,timezone
import json
project='xbvenkfmesugrbjuufyw'
token=(Path.home()/'.supabase/access-token').read_text().strip()
request=Request('https://api.supabase.com/v1/projects/'+project+'/secrets',method='GET',headers={'Authorization':'Bearer '+token})
out={'observed_at':datetime.now(timezone.utc).isoformat(),'project':project,'scope':'names only; no value persisted; no delivery test'}
try:
 with urlopen(request,timeout=25) as response: records=json.loads(response.read())
 names={r['name'] for r in records}
 out['configured_name_present']={k:k in names for k in ['UCB_SENTRY_DSN','UCB_REPORT_CRON_SECRET','PLAY_PAYMENT_CRON_SECRET','PLAY_CATALOG_CRON_SECRET']}
except HTTPError as error:out.update(http_status=error.code,verified=False)
Path(__file__).with_name('alert-config-metadata.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out))
