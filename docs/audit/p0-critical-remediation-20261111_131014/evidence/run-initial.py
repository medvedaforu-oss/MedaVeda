import os,subprocess,json,time
from pathlib import Path
root=Path('/home/ganeshp8545/AyurPulse');out=Path(__file__).resolve().parent
env={k:os.environ[k] for k in ['PATH','HOME']};env.update(PGHOST='/tmp/medveda-p0-pg/socket',PGPORT='55491',PGUSER='postgres',PGOPTIONS='-c search_path=public,extensions',TZ='UTC',EXPO_NO_DOTENV='1')
cmd=['bash','supabase/tests/run-all.sh']
t=time.monotonic()
with (out/'database-initial.log').open('w') as f:r=subprocess.run(cmd,cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=900)
(out/'database-initial.json').write_text(json.dumps({'command':cmd,'exit_code':r.returncode,'seconds':time.monotonic()-t},indent=2));print('Full initial database suite:',r.returncode)
