import os,subprocess,uuid,json
from pathlib import Path
root=Path('/home/ganeshp8545/AyurPulse');out=Path(__file__).resolve().parent
assert os.environ.get('PGHOST')=='/tmp/medveda-closure-pg/socket'
env={k:os.environ[k] for k in ['PATH','HOME','PGHOST','PGPORT','PGUSER']};env['PGOPTIONS']='-c search_path=public,extensions'
results=[];dbs=[]
def query(q,db='postgres'):
 return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',q],env=env,text=True,capture_output=True,check=True)
def apply(p,db):
 r=subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-f',str(p)],cwd=root,env=env,text=True,capture_output=True)
 if r.returncode:raise RuntimeError(str(p)+'\n'+r.stdout+r.stderr)
 return r
try:
 db='ap_ci_'+uuid.uuid4().hex[:10];pre='ap_ci_'+uuid.uuid4().hex[:10]
 query('create database '+db);dbs.append(db);apply(root/'supabase/tests/support/supabase_stub.sql',db)
 for m in sorted((root/'supabase/migrations').glob('*.sql')):
  if m.name.startswith('20260927130000'):
   query('create database '+pre+' template '+db);dbs.append(pre)
  apply(m,db)
 apply(root/'supabase/tests/support/seed.sql',db)
 for name in ['batch3b_backfill.sh','batch3_race.sh']:
  s=(root/'supabase/tests'/name).read_text().replace('P="psql -h 127.0.0.1 -p 54329 -U postgres -w -At"','P="psql -h /tmp/medveda-closure-pg/socket -p 55492 -U postgres -w -At"')
  s=s.replace('root=$(cd "$(dirname "$0")/../.." && pwd)', 'root=/home/ganeshp8545/AyurPulse')
  with (out/(name+'.log')).open('w') as log:r=subprocess.run(['bash','-c',s],cwd=root,env=dict(env,PRE_DB=pre,TEMPLATE_DB=db),stdout=log,stderr=subprocess.STDOUT,timeout=90)
  results.append({'command':['bash','supabase/tests/'+name],'adaptation':'only local socket and repository root; original assertions retained','exit_code':r.returncode});print(name,r.returncode,flush=True)
 dbs += ['ap_bf','ap_race']
 legacy='ap_ci_'+uuid.uuid4().hex[:10];query('create database '+legacy);dbs.append(legacy);apply(root/'supabase/tests/support/supabase_stub.sql',legacy)
 for m in sorted((root/'supabase/migrations').glob('*.sql')):
  if m.name.startswith('20260919120000'):apply(root/'supabase/tests/legacy_backfill_seed.sql',legacy)
  if m.name.split('_')[0]>'20260920120000':break
  apply(m,legacy)
 r=apply(root/'supabase/tests/legacy_backfill_verify.sql',legacy);(out/'legacy-backfill.log').write_text(r.stdout+r.stderr);results.append({'command':'stub + pre-multi-course migrations + legacy_backfill_seed.sql + migrations through 20260920120000 + legacy_backfill_verify.sql','exit_code':r.returncode});print('legacy historical-scope backfill',r.returncode,flush=True)
 with (out/'play-legacy-migration.log').open('w') as log:r=subprocess.run(['bash','supabase/tests/play_catalog_migration_legacy_selftest.sh'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=90)
 results.append({'command':['bash','supabase/tests/play_catalog_migration_legacy_selftest.sh'],'exit_code':r.returncode});print('Play curated historical migration',r.returncode,flush=True)
finally:
 (out/'additional-sql-results.json').write_text(json.dumps(results,indent=2))
 for db in reversed(dbs):query('drop database if exists '+db+' with (force)')
