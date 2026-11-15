"""Local-only exact-wrapper rehearsal. No environment credentials forwarded."""
from pathlib import Path
import os, subprocess, json, uuid, hashlib, time
R=Path(__file__).resolve().parents[4]; O=Path(__file__).resolve().parent; P=R/'docs/audit/production-execution-20261111'
assert os.environ.get('PGHOST')=='/tmp/medveda-bc-atomic/socket'
assert os.environ.get('PGPORT')=='55479'
E={k:os.environ[k] for k in ['PATH','PGHOST','PGPORT']}; E.update(PGUSER='postgres',PGOPTIONS='-c search_path=public,extensions')
M=json.loads((P/'manifest.json').read_text()); results=[]; dbs=[]
def run(args,db,check=True,**kw):
 p=subprocess.run(args,cwd=R,env=dict(E,PGDATABASE=db),text=True,capture_output=True,**kw)
 if check and p.returncode: raise RuntimeError(p.stdout+'\n'+p.stderr)
 return p
def sql(q,db,check=True):return run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',q],db,check)
def apply(path,db):return run(['psql','-Xq','-v','ON_ERROR_STOP=1','-f',str(path)],db)
def lit(s):return "'"+s.replace("'","''")+"'"
def ok(label,detail=None):
 results.append({'test':label,'result':'PASS','detail':detail}); print('PASS '+label,flush=True)
def clone(template):
 d='mv003_'+uuid.uuid4().hex[:12];sql(f'create database {d} template {template}','postgres');dbs.append(d);return d
def settings(stage='c'):
 keys=['phase_a_owner_approval'] if stage=='a' else ['c_owner_approval','recovery_evidence','window_approval','phase_b_verified','quiescence_evidence','drift_approval']
 return ''.join(f"set medveda.{k}='SYNTHETIC_LOCAL_REHEARSAL_ONLY';\n" for k in keys)
def wrapper(db,text=None,stage='c',gates=True):
 s=(P/('01-phase-a.sql' if stage=='a' else '03-phase-c-atomic.sql')).read_text() if text is None else text
 return run(['psql','-Xq','-v','ON_ERROR_STOP=1'],db,False,input=(settings(stage) if gates else '')+s)
def state(db):
 # Canonical schema, ledger, all application rows. Excludes only C's new nullable columns.
 return sql("select jsonb_build_object('functions',(select jsonb_agg(jsonb_build_array(pg_get_functiondef(oid),proacl,proowner,proconfig) order by oid) from pg_proc where pronamespace='public'::regnamespace),'triggers',(select jsonb_agg(pg_get_triggerdef(oid) order by oid) from pg_trigger where not tgisinternal),'ledger',(select jsonb_agg(to_jsonb(t) order by version) from supabase_migrations.schema_migrations t),'columns',(select jsonb_agg(to_jsonb(c) order by table_name,ordinal_position) from information_schema.columns c where table_schema='public'),'indexes',(select jsonb_agg(to_jsonb(i) order by indexname) from pg_indexes i where schemaname='public'))",db).stdout.strip()
def fingerprint(db):
 tables=json.loads(sql("select json_agg(tablename order by tablename) from pg_tables where schemaname='public'",db).stdout)
 return {t:sql("select md5(coalesce(string_agg((to_jsonb(t)-ARRAY['ucb_transaction_time','external_report_test_purchase','blocks_entitlement'])::text,'' order by (to_jsonb(t)-ARRAY['ucb_transaction_time','external_report_test_purchase','blocks_entitlement'])::text),'')) from public.\""+t+'\" t',db).stdout.strip() for t in tables}
def failcase(base,label,s,needle,gates=True):
 d=clone(base);before=state(d);f=fingerprint(d);p=wrapper(d,s,gates=gates);assert p.returncode and needle in p.stderr,p.stderr
 assert state(d)==before and fingerprint(d)==f,label+' rollback mismatch';ok(label,p.stderr.strip())
def suite(db,name):
 p=run(['node','supabase/tests/'+name+'-selftest.cjs'],db,False);(O/(db+'-'+name+'.log')).write_text(p.stdout+p.stderr)
 assert not p.returncode,p.stdout+p.stderr
 ok('actual '+name+' on '+db)
try:
 base='mv003_'+uuid.uuid4().hex[:12];sql(f'create database {base}','postgres');dbs.append(base)
 apply(R/'supabase/tests/support/supabase_stub.sql',base)
 sql('create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text)',base)
 for m in sorted((R/'supabase/migrations').glob('*.sql')):
  v=m.name.split('_')[0]
  if v in M['baseline_versions']:
   apply(m,base);sql('insert into supabase_migrations.schema_migrations values('+lit(v)+',ARRAY['+lit(m.read_text())+'],'+lit(m.stem.split('_',1)[1])+')',base)
 apply(R/'supabase/tests/support/phase_b_production_normalize_phone.sql',base)
 apply(O/'production-sync-phone-fixture.sql',base)
 apply(R/'supabase/tests/support/seed.sql',base)
 assert sql('select count(*) from supabase_migrations.schema_migrations',base).stdout.strip()=='66'
 apply(P/'sources/20261110100000_mv003_razorpay_entitlement_commitment.sql',base)
 for name in ['mv005-transitions','mv006-ownership']:
  p=run(['python3','supabase/tests/'+name+'-local.py','baseline'],base);(O/(name+'-baseline.log')).write_text(p.stdout+p.stderr)
 sql('drop function public.razorpay_entitlement_committed(text,text)',base)
 before=fingerprint(base);p=wrapper(base,stage='a');assert not p.returncode,p.stderr
 assert before==fingerprint(base);ok('exact A wrapper; 66 -> 69; all baseline public rows preserved')
 # Compare every pinned definition and ACL without relaxing the wrapper.
 pre=json.loads((P/'baseline-function-preimages.json').read_text())
 for f in pre:
  q="select encode(sha256(convert_to(btrim(pg_get_functiondef(oid), E' \t\n\r'),'UTF8')),'hex') from pg_proc where pronamespace='public'::regnamespace and proname="+lit(f['name'])+" and pg_get_function_identity_arguments(oid)="+lit(f['args'])
  assert sql(q,base).stdout.strip()==f['definition_sha256'],f['name']
 ok('all 126 pinned production function preimages reproduced')
 # Baseline+A handler fixtures run on a clone so migration preservation remains independent.
 b=clone(base)
 for name in ['phase-b-handlers','phase-b-recovery','phase-b-history']:suite(b,name)
 original=(P/'03-phase-c-atomic.sql').read_text()
 failcase(base,'reviewed C wrapper rejects matching baseline due to newline hash defect',original,'pinned function drift: accounts_share_network')
 failcase(base,'hash-only correction exposes invalid FOREACH syntax',original.replace("convert_to(pg_get_functiondef(p.oid),'UTF8')","convert_to(btrim(pg_get_functiondef(p.oid), E' \\t\\n\\r'),'UTF8')"),'syntax error')
 ctext=(O/'03-phase-c-atomic-compatible.sql').read_text()
 failcase(base,'missing evidence gate fails closed',ctext,'missing independently signed',False)
 for n in range(1,5):
  marker=('-- C'+str(n+1)+' SOURCE SHA256') if n<4 else 'DO $final_contracts$'
  failcase(base,'forced failure after C'+str(n)+' rolls back schema ledger and rows',ctext.replace(marker,"select 1/0;\n"+marker,1),'division by zero')
 # Exact original wrapper success.
 final=clone(base);f=fingerprint(final);p=wrapper(final,ctext);(O/'exact-c-success.log').write_text(p.stdout+p.stderr);assert not p.returncode,p.stderr
 after=fingerprint(final);assert all(after[t]==h for t,h in f.items());ok('exact C wrapper success; all pre-existing public-table rows and prices preserved')
 ledger=json.loads(sql('select json_agg(row_to_json(t) order by version) from supabase_migrations.schema_migrations t',final).stdout)
 assert [x['version'] for x in ledger]==M['phase_c_versions']
 for m in M['migrations']:
  x=next(x for x in ledger if x['version']==m['version']);assert x['statements']==[(P/m['copy']).read_text()]
 (O/'ledger-validation.json').write_text(json.dumps({'versions':[x['version'] for x in ledger],'exact_source_records':7,'baseline_records':66},indent=2)+'\n');ok('73 exact versions; seven exact source statements; no duplicate A1 or excluded installer')
 expected=json.loads((P/'expected-final-functions.json').read_text())
 for name,f in expected.items():
  assert sql("select md5(prosrc) from pg_proc where oid="+lit('public.'+f['signature'])+'::regprocedure',final).stdout.strip()==f['prosrc_md5'],name
 ok('all final function bodies match expected MD5 including strong MV003')
 (O/'final-triggers.json').write_text(sql("select json_agg(json_build_object('table',tgrelid::regclass::text,'name',tgname,'enabled',tgenabled,'definition',pg_get_triggerdef(oid)) order by tgrelid,tgname) from pg_trigger where not tgisinternal",final).stdout)
 (O/'final-acls.json').write_text(sql("select json_agg(json_build_object('name',proname,'args',pg_get_function_identity_arguments(oid),'acl',proacl,'owner',pg_get_userbyid(proowner),'config',proconfig) order by proname) from pg_proc where pronamespace='public'::regnamespace",final).stdout)
 before=state(final);p=wrapper(final,ctext);assert p.returncode and 'ledger version-set mismatch' in p.stderr;assert state(final)==before;ok('retry after successful commit fails closed without changes')
 for name in ['phase-b-handlers','phase-b-recovery','phase-b-history']:
  d=clone(final);suite(d,name)
 d=clone(final)
 E['BC_CHOICE_TEST']='1'
 E['BC_CHOICE_ONLY']='1'
 E['BC_RELEASE_ROOT']='supabase/releases/phase-b-20261111'
 suite(d,'b-to-c-handlers')
 d=clone(final)
 del E['BC_CHOICE_ONLY']
 E['BC_RELEASE_ROOT']='supabase/releases/b-to-c-compatible-20261111'
 suite(d,'b-to-c-handlers')
 del E['BC_RELEASE_ROOT']
 del E['BC_CHOICE_TEST']
 # Drift and index-failure cases start from independent local clones.
 drift=clone(base);sql("update supabase_migrations.schema_migrations set statements=ARRAY['LOCAL_DRIFT'] where version='20261110100000'",drift)
 failcase(drift,'A source ledger drift rejects atomically',ctext,'Phase A exact ledger source mismatch')
 drift=clone(base);sql("alter function public.accounts_share_network(uuid,uuid) set search_path=pg_catalog",drift)
 failcase(drift,'function drift rejects atomically',ctext,'pinned function drift: accounts_share_network')
 drift=clone(base);sql("alter table orders add column external_report_test_purchase boolean",drift)
 failcase(drift,'partial C schema without ledger rejects atomically',ctext,'unexpected pre-existing C column')
 drift=clone(base);sql("drop index orders_external_token_unique; create index orders_external_token_unique on orders(external_transaction_token); begin;set local session_replication_role=replica;update orders set external_transaction_token='LOCAL_DUPLICATE_TOKEN' where id in (select id from orders limit 2);commit",drift)
 failcase(drift,'duplicate token index failure rolls back C1 and C2',ctext,'could not create unique index')
 # Pause the real C1+C2 prefix, inspect from another connection, then disconnect.
 d=clone(base);before=state(d);rows=fingerprint(d);prefix=ctext[:ctext.index('-- C3 SOURCE SHA256')]
 proc=subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1'],cwd=R,env=dict(E,PGDATABASE=d),text=True,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 try:
  proc.stdin.write(settings()+prefix+"\n\\echo LOCAL_C2_READY\n");proc.stdin.flush()
  while True:
   line=proc.stdout.readline()
   if 'LOCAL_C2_READY' in line:break
   assert line or proc.poll() is None,'prefix unexpectedly exited'
  # MVCC exposes the old strong proof and old ledger while C2 is uncommitted.
  assert sql("select md5(prosrc) from pg_proc where oid='razorpay_entitlement_committed(text,text)'::regprocedure",d).stdout.strip()=='49b01fbcc7a5e71bd527366fd342a6e9'
  assert sql('select count(*) from supabase_migrations.schema_migrations',d).stdout.strip()=='69'
  p=sql("set statement_timeout='250ms';select count(*) from orders",d,False);assert p.returncode and 'statement timeout' in p.stderr
  p=wrapper(d,ctext);assert p.returncode and 'lock timeout' in p.stderr
  ok('paused after C2: observer sees strong A proof and 69 ledger; table readers blocked; competing wrapper hits exact 2s lock timeout')
 finally:
  proc.kill();proc.communicate(timeout=5)
 for _ in range(100):
  if state(d)==before:break
  time.sleep(.02)
 assert state(d)==before and fingerprint(d)==rows
 ok('client interruption after C2 fully rolls back functions columns indexes triggers rows and ledger')
 p=wrapper(d,ctext);assert not p.returncode,p.stderr
 ok('retry after precommit interruption succeeds once with 73 ledger versions')
 # Final-schema SQL contracts and existing concurrency/regression suites, isolated per suite.
 for name in ['notes-choice-checkout','billing-settlement-recovery','razorpay_snapshot_retry_checks','phase-c-contracts','payment_queue_checks','play_payment_pg_checks','play_entitlement_snapshot_checks','phase-c-play-duplicates','play_catalog_queue_regression_checks','play_catalog_failure_access_checks']:
  d=clone(final);p=apply(R/('supabase/tests/'+name+'.sql'),d);(O/(name+'.log')).write_text(p.stdout+p.stderr);ok('final SQL '+name)
 for name in ['mv005-transitions','mv006-ownership']:
  d=clone(final);p=run(['python3','supabase/tests/'+name+'-local.py','fixed'],d);(O/(name+'-fixed.log')).write_text(p.stdout+p.stderr);ok('final concurrency '+name)
 d=clone(final);suite(d,'mv003-entitlement')

 d=clone(final)
 source=(R/'supabase/tests/notes-choice-concurrency.py').read_text().replace("assert os.environ.get('PGHOST') in ('/tmp','127.0.0.1','localhost')","assert os.environ.get('PGHOST','').startswith('/tmp/medveda-bc-atomic/')").replace("db.startswith('ap_ci_')","db.startswith('mv003_')")
 E['TEMPLATE_DB']=d
 p=run(['python3','-c',source],d);(O/'notes-choice-concurrency.log').write_text(p.stdout+p.stderr)
 del E['TEMPLATE_DB']
 ok('final Notes choice concurrency and token uniqueness')
 ok('complete rehearsal')
finally:
 (O/'rehearsal-results.json').write_text(json.dumps(results,indent=2)+'\n')
 for d in reversed(dbs):sql(f'drop database if exists {d}','postgres',False)
