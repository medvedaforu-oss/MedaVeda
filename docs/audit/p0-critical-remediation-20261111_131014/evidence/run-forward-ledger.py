import os,subprocess,uuid,json,hashlib
from pathlib import Path
root=Path('/home/ganeshp8545/AyurPulse');out=Path(__file__).resolve().parent;package=Path(Path('/tmp/medveda-p0-release').read_text())
assert os.environ['PGHOST']=='/tmp/medveda-p0-pg/socket'
env={k:os.environ[k] for k in ['PATH','PGHOST','PGPORT','PGUSER']};db='mv003_'+uuid.uuid4().hex[:12];env.update(PGDATABASE=db,PGOPTIONS='-c search_path=public,extensions')
def sql(q,check=True):
 r=subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1'],cwd=root,env=env,input=q,text=True,capture_output=True)
 if check and r.returncode:raise RuntimeError(r.stdout+r.stderr)
 return r
lit=lambda s:"'"+s.replace("'","''")+"'"
subprocess.run(['createdb',db],env=env,check=True)
try:
 sql((root/'supabase/tests/support/supabase_stub.sql').read_text());sql('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text)')
 manifest=json.loads((root/'docs/audit/production-execution-20261111/manifest.json').read_text())
 migrations=[p for p in sorted((root/'supabase/migrations').glob('*.sql')) if p.name.split('_')[0] in manifest['baseline_versions']]
 migrations += [package/'sql/sources'/Path(x['copy']).name for x in manifest['migrations']]
 for m in migrations:
  s=m.read_text();sql(s);v,name=m.stem.split('_',1);sql('insert into supabase_migrations.schema_migrations values('+lit(v)+',ARRAY['+lit(s)+'],'+lit(name)+')')
 sql((root/'supabase/tests/support/seed.sql').read_text())
 assert sql('select count(*) from supabase_migrations.schema_migrations').stdout.strip()=='73'
 def state():return sql("select jsonb_build_object('proof',(select pg_get_functiondef('public.razorpay_entitlement_committed(text,text)'::regprocedure)),'security',(select jsonb_build_array(proowner,proacl,proconfig,prosecdef,provolatile) from pg_proc where oid='public.razorpay_entitlement_committed(text,text)'::regprocedure),'ledger',(select jsonb_agg(to_jsonb(t) order by version) from supabase_migrations.schema_migrations t))").stdout
 def fingerprints():return sql("select jsonb_agg(jsonb_build_array(t,(xpath('/row/h/text()',query_to_xml(format('select md5(coalesce(string_agg(to_jsonb(r)::text, %L order by to_jsonb(r)::text),%L)) h from public.%I r','','',t),false,true,'')))[1]::text) order by t) from (select tablename t from pg_tables where schemaname='public') s").stdout
 before=state();rows=fingerprints();text=(package/'sql/05-p0-forward-proof.sql').read_text();settings=''.join('set medveda.'+k+"='SYNTHETIC_LOCAL_ONLY';\n" for k in ['p0_review_approval','recovery_evidence','quiescence_evidence','window_approval','drift_approval'])
 r=sql(text,False);assert r.returncode and 'missing P0 approval' in r.stderr;assert state()==before
 print('PASS D missing gates refuses atomically',flush=True)
 sql("alter function public.razorpay_entitlement_committed(text,text) owner to service_role")
 r=sql(settings+text,False);assert r.returncode and 'security preimage drift' in r.stderr
 sql("alter function public.razorpay_entitlement_committed(text,text) owner to postgres")
 # Ownership transfer changes grants; reconstruct the exact original service-only ACL.
 sql("revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;grant execute on function public.razorpay_entitlement_committed(text,text) to service_role")
 sql("update supabase_migrations.schema_migrations set statements=ARRAY['LOCAL_D_DRIFT'] where version='20261111100000'")
 r=sql(settings+text,False);assert r.returncode and 'exact predecessor ledger source drift' in r.stderr
 predecessor=(package/'sql/sources/20261111100000_phase_c_final_mv003_commitment.sql').read_text()
 sql("update supabase_migrations.schema_migrations set statements=ARRAY["+lit(predecessor)+"] where version='20261111100000'")
 # Rebaseline security identity after explicit synthetic owner round trip only.
 assert fingerprints()==rows
 before=state()
 print('PASS D owner/security and exact predecessor source drift refuse atomically',flush=True)

 for marker in ['INSERT INTO supabase_migrations','DO $post$']:
  r=sql(settings+text.replace(marker,'select 1/0;\n'+marker,1),False);assert r.returncode and 'division by zero' in r.stderr;assert state()==before and fingerprints()==rows
 print('PASS forced failure after D function and ledger each rolls back proof, ACL, ledger and rows',flush=True)
 r=sql(settings+text);assert sql('select count(*) from supabase_migrations.schema_migrations').stdout.strip()=='74';assert fingerprints()==rows
 patch=(package/'sql/sources/20261111120000_p0_classified_reversal_commitment.sql').read_text()
 assert sql("select statements[1] from supabase_migrations.schema_migrations where version='20261111120000'").stdout.rstrip()==patch.rstrip()
 print('PASS exact D wrapper 73 -> 74; exact committed ledger source; all public row fingerprints preserved',flush=True)
 after=state();r=sql(settings+text,False);assert r.returncode and 'exact 73-version' in r.stderr;assert state()==after
 print('PASS D known-commit retry refused without writes',flush=True)
 for name in ['p0-reversal','p0-notification']:
  subprocess.run(['node','supabase/tests/'+name+'-selftest.cjs'],cwd=root,env=dict(env,P0_RELEASE_ROOT=str(package.relative_to(root))),check=True)
 for name in ['p0-classified-reversal','phase-c-contracts','phase-c-play-duplicates']:
  sql((root/'supabase/tests'/(name+'.sql')).read_text())
 env['BC_RELEASE_ROOT']=str(package.relative_to(root));env['BC_CHOICE_TEST']='1'
 subprocess.run(['node','supabase/tests/b-to-c-handlers-selftest.cjs'],cwd=root,env=env,check=True)
 print('PASS pinned release helper/webhook/worker/notification and real-SQL choice handlers on D-final schema',flush=True)
finally:subprocess.run(['dropdb',db],env=env,check=True)
