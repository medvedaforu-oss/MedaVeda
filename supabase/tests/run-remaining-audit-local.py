"""Disposable PostgreSQL migration replay/ACL/ancestry tests; synthetic data only."""
import os,pathlib,subprocess,uuid,json
root=pathlib.Path(__file__).resolve().parents[2]
assert os.environ.get('PGHOST','').startswith('/tmp/'), 'explicit disposable /tmp socket required'
env={k:os.environ[k] for k in ('PATH','HOME','PGHOST','PGPORT','PGUSER')};env['PGOPTIONS']='-c search_path=public,extensions'
db='audit_remaining_'+uuid.uuid4().hex[:12]
def run(*args,database=db):
 return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',database,*args],cwd=root,env=env,text=True,stderr=subprocess.PIPE)
try:
 run('-c','create database '+db,database='postgres')
 run('-f','supabase/tests/support/supabase_stub.sql')
 migrations=sorted((root/'supabase/migrations').glob('*.sql'))
 for migration in migrations:run('-f',str(migration))
 run('-f','supabase/tests/support/seed.sql')
 print(f'PASS all {len(migrations)} migrations applied in fresh disposable PostgreSQL',flush=True)
 tables=['orders','payments','purchases','products','wallet_ledger','referrals','courses','years','subjects','chapters','notes']
 fingerprint="select jsonb_build_array("+','.join("(select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public."+t+" t)" for t in tables)+")"
 before=run('-c',fingerprint)
 migration=next((root/'supabase/migrations').glob('*_audit_checkout_publication_guard.sql'))
 for _ in range(2):run('-f',str(migration));assert run('-c',fingerprint)==before,'replay changed existing rows'
 print('PASS publication migration repeatability: unchanged financial/catalog/content rows',flush=True)
 for function in ['lock_checkout_publication(text)','create_priced_order(uuid,text,boolean)','create_play_order(uuid,text)']:
  acl=json.loads(run('-c',"select jsonb_build_array("+','.join("has_function_privilege('"+role+"','public."+function+"','execute')" for role in ['anon','authenticated','service_role'])+")"))
  assert acl==[False,False,True],(function,acl)
 print('PASS publication/pricing/Play RPC client denial and service-only ACL',flush=True)
 print(run('-f','supabase/tests/audit-checkout-publication.sql'),flush=True)
finally:
 run('-c','drop database if exists '+db,database='postgres')
