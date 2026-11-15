"""Synthetic additive-index rollback/lock test, task-only PostgreSQL socket."""
from pathlib import Path
import os,subprocess,uuid,json
R=Path('/home/ganeshp8545/AyurPulse');O=Path(__file__).resolve().parent
assert os.environ.get('PGHOST')=='/tmp/medveda-remaining-pg/socket'
E={k:os.environ[k] for k in ['PATH','PGHOST','PGPORT','PGUSER']};db='ap_ci_index_'+uuid.uuid4().hex[:8];E.update(PGDATABASE=db,PGOPTIONS='-c search_path=public,extensions')
def sql(q,check=True,database=db):
 return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',database],input=q,text=True,capture_output=True,env=E,check=check)
def apply(p):
 return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-f',str(p)],text=True,capture_output=True,env=E,check=True)
def state():
 return sql("select jsonb_build_object('indexes',(select jsonb_agg(indexdef order by indexname) from pg_indexes where schemaname='public'),'security',(select jsonb_agg(jsonb_build_array(oid,relacl,relrowsecurity,relforcerowsecurity) order by oid) from pg_class where relnamespace='public'::regnamespace and relkind='r'),'functions',(select jsonb_agg(jsonb_build_array(oid,prosrc,proacl,proconfig) order by oid) from pg_proc where pronamespace='public'::regnamespace))").stdout
results=[]
sql('create database '+db,database='postgres')
try:
 apply(R/'supabase/tests/support/supabase_stub.sql')
 for m in sorted((R/'supabase/migrations').glob('*.sql')):
  if not m.name.endswith('_all_row_foreign_key_indexes.sql'):apply(m)
 apply(R/'supabase/tests/support/seed.sql');before=state()
 migration=next((R/'supabase/migrations').glob('*_all_row_foreign_key_indexes.sql')).read_text()
 injected=migration.replace('COMMIT;',"DO $$ BEGIN RAISE EXCEPTION 'synthetic precommit abort'; END $$;\nCOMMIT;")
 result=sql(injected,False);assert result.returncode and 'synthetic precommit abort' in result.stderr
 assert state()==before
 results.append('PASS injected precommit failure rolls back all seven indexes and leaves security/function state unchanged')
 lock=subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=E)
 try:
  lock.stdin.write('BEGIN; LOCK TABLE public.notes IN ACCESS EXCLUSIVE MODE;\n\\echo READY\n');lock.stdin.flush()
  assert lock.stdout.readline().strip()=='READY'
  result=sql(migration,False);assert result.returncode and 'lock timeout' in result.stderr
 finally:
  lock.stdin.write('ROLLBACK;\n');lock.stdin.close();lock.wait(timeout=10)
 assert state()==before
 results.append('PASS competing writer/DDL lock aborts within 2-second lock timeout; no partial indexes or security changes')
 sql(migration);after=state();sql((R/'supabase/tests/fk-index-coverage.sql').read_text())
 results.append('PASS clean retry after verified abort creates all seven usable index paths')
 result=sql(migration,False);assert result.returncode and 'already exists' in result.stderr
 assert state()==after
 results.append('PASS unexpected existing index/refused post-success repeat leaves complete state unchanged')
 for item in results:print(item,flush=True)
 (O/'index-rollback-results.json').write_text(json.dumps(results,indent=2)+'\n')
finally:sql('drop database '+db,database='postgres')
