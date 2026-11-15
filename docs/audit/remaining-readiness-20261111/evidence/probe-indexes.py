"""Credential-free local planner regression and row/security preservation."""
from pathlib import Path
import os,subprocess,json,uuid,sys
R=Path('/home/ganeshp8545/AyurPulse');O=Path(__file__).resolve().parent
assert os.environ.get('PGHOST')=='/tmp/medveda-remaining-pg/socket'
E={k:os.environ[k] for k in ['PATH','PGHOST','PGPORT','PGUSER']};E['PGOPTIONS']='-c search_path=public,extensions'
def sql(q,db,check=True):
 return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db],input=q,text=True,capture_output=True,env=E,check=check)
def apply(p,db,check=True):
 return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-f',str(p)],text=True,capture_output=True,env=E,check=check)
def rows(db):
 ts=json.loads(sql("select json_agg(tablename order by tablename) from pg_tables where schemaname='public'",db).stdout)
 return {t:sql('select md5(coalesce(string_agg(to_jsonb(r)::text,\'\' order by to_jsonb(r)::text),\'\')) from public."'+t+'" r',db).stdout for t in ts}
def security(db):
 return sql("select jsonb_build_object('policies',(select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p),'functions',(select jsonb_agg(jsonb_build_array(oid,prosrc,proacl,proconfig,proowner) order by oid) from pg_proc where pronamespace='public'::regnamespace),'relations',(select jsonb_agg(jsonb_build_array(oid,relacl,relrowsecurity,relforcerowsecurity) order by oid) from pg_class where relnamespace='public'::regnamespace and relkind in ('r','v','m')))",db).stdout
if sys.argv[1]=='red':
 db='ap_ci_index_'+uuid.uuid4().hex[:8];sql('create database '+db,'postgres');(O/'index-probe-db.json').write_text(json.dumps({'database':db}))
 apply(R/'supabase/tests/support/supabase_stub.sql',db)
 for m in sorted((R/'supabase/migrations').glob('*.sql')):
  if not m.name.endswith('_all_row_foreign_key_indexes.sql'):apply(m,db)
 apply(R/'supabase/tests/support/seed.sql',db)
 result=apply(R/'supabase/tests/fk-index-coverage.sql',db,False)
 (O/'fk-index-red.log').write_text(result.stdout+result.stderr)
 if not (result.returncode and result.stderr.count('Missing all-row index access:')==7):
  sql('drop database '+db,'postgres')
  raise AssertionError(result.stderr)
 print('PASS RED: seven missing all-row lookup index paths reproduced')
else:
 db=json.loads((O/'index-probe-db.json').read_text())['database'];assert db.startswith('ap_ci_index_')
 try:
  before=rows(db);acl=security(db)
  paths=list((R/'supabase/migrations').glob('*_all_row_foreign_key_indexes.sql'));assert len(paths)==1
  apply(paths[0],db)
  assert before==rows(db),'historical rows changed';assert acl==security(db),'security state changed'
  result=apply(R/'supabase/tests/fk-index-coverage.sql',db)
  (O/'fk-index-green.log').write_text(result.stdout+result.stderr)
  assert result.stderr.count('PASS indexed all-row lookup')==7
  print('PASS GREEN: seven indexed paths; every public row and security contract unchanged')
 finally:sql('drop database '+db,'postgres')
