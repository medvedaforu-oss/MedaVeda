"""GET only: configured backup inventory; no backup creation/download/restore."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from datetime import datetime, timezone
import json
PROJECT='xbvenkfmesugrbjuufyw'
token=(Path.home()/'.supabase/access-token').read_text().strip()
req=Request('https://api.supabase.com/v1/projects/'+PROJECT+'/database/backups',method='GET',headers={'Authorization':'Bearer '+token})
def safe(value):
    if isinstance(value,list): return [safe(x) for x in value]
    if isinstance(value,dict): return {k:safe(v) for k,v in value.items() if not any(x in k.lower() for x in ('url','token','password','path','file','key','bucket'))}
    return value
out={'observed_at':datetime.now(timezone.utc).isoformat(),'project':PROJECT,'method':'GET','action':'inventory only'}
try:
    with urlopen(req,timeout=25) as response: raw=json.loads(response.read())
    out['backup_metadata']=safe({k:raw.get(k) for k in ('region','pitr_enabled','physical_backup_data','backups')})
except HTTPError as error: out.update(http_status=error.code,verified=False)
Path(__file__).with_name('backup-metadata.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out))
