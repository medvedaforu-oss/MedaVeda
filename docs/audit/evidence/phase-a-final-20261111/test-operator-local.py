"""Compiled operator transaction acceptance. Disposable local database only."""
import os,subprocess,uuid,json
from pathlib import Path
root=Path(__file__).resolve().parents[4]
out=Path(__file__).resolve().parent
assert os.environ['PGHOST']=='/tmp/medveda-phase-a-final/socket'
env={k:os.environ[k] for k in ('PATH','PGHOST','PGPORT','PGUSER')}
env.update(PGDATABASE='mv003_'+uuid.uuid4().hex[:12],PGOPTIONS='-c search_path=public,extensions')
def sql(*args,db=None,fail=False):
 r=subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db or env['PGDATABASE'],*args],cwd=root,env=env,capture_output=True,text=True)
 if not fail:assert r.returncode==0,r.stderr
 return r
def fingerprint():return sql('-c',"select jsonb_build_array("+','.join(f"(select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public.{t} t)" for t in ['orders','payments','purchases','products','wallet_ledger','referrals'])+")").stdout
try:
 sql('-c','create database '+env['PGDATABASE'],db='postgres')
 sql('-f','supabase/tests/support/supabase_stub.sql')
 for m in sorted((root/'supabase/migrations').glob('*.sql')):
  if m.name.split('_')[0]<='20261104110000':sql('-f',str(m))
 sql('-f','supabase/tests/support/seed.sql')
 manifest=json.loads((root/'docs/audit/evidence/production-preflight-20261111/deployment-manifest.json').read_text())
 sql('-c','create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);'+''.join("insert into supabase_migrations.schema_migrations(version) values ('"+v+"');" for v in manifest['baseline_versions']))
 f=str(out/'operator-phase-a-proposed.sql');before=fingerprint()
 r=sql('-f',f,fail=True);assert r.returncode and 'separate owner approval reference required' in r.stderr
 assert before==fingerprint()
 print('PASS proposed operator transaction refuses absent approval reference',flush=True)
 sql('-c',"set medveda.phase_a_owner_approval='LOCAL_SYNTHETIC_ONLY'",'-f',f)
 assert before==fingerprint()
 versions=sql('-c','select version from supabase_migrations.schema_migrations order by version').stdout.split()
 assert versions==sorted(manifest['baseline_versions']+[a['schema_version'] for a in manifest['phases']['A']['artifacts']])
 for a in manifest['phases']['A']['artifacts']:
  stored=sql('-c',"select to_json(statements[1]) from supabase_migrations.schema_migrations where version='"+a['schema_version']+"'").stdout
  assert json.loads(stored)==(root/a['source_path']).read_text()
 print('PASS compiled A1 -> A2 -> A3 applies atomically with exact three ledger rows and unchanged financial/catalog fingerprints',flush=True)
 metadata=sql('-c',"select jsonb_build_object('functions',(select jsonb_agg(jsonb_build_object('name',proname,'args',pg_get_function_identity_arguments(oid),'result',pg_get_function_result(oid),'definition_md5',md5(pg_get_functiondef(oid)),'acl',proacl::text,'config',proconfig,'volatility',provolatile,'security_definer',prosecdef,'owner',pg_get_userbyid(proowner))) from pg_proc where pronamespace='public'::regnamespace and proname in ('razorpay_entitlement_committed','guard_razorpay_order_transition','guard_purchase_success_ownership')),'triggers',(select jsonb_agg(pg_get_triggerdef(oid) order by tgname) from pg_trigger where tgname in ('orders_03_razorpay_transition','purchases_zz_success_ownership')))").stdout
 (out/'expected-phase-a-metadata.json').write_text(json.dumps(json.loads(metadata),indent=2)+'\n')
 r=sql('-c',"set medveda.phase_a_owner_approval='LOCAL_SYNTHETIC_ONLY'",'-f',f,fail=True)
 assert r.returncode and 'migration baseline drift' in r.stderr
 assert before==fingerprint()
 print('PASS second operator execution refuses changed ledger rather than silently skipping/reapplying',flush=True)
finally:
 sql('-c','drop database if exists '+env['PGDATABASE'],db='postgres')
