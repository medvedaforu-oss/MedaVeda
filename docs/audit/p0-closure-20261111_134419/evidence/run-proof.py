"""Isolated reproduction and idempotence of the P0 forward proof migration."""
import os,subprocess,uuid,json
from pathlib import Path
root=Path('/home/ganeshp8545/AyurPulse');out=Path(__file__).resolve().parent
assert os.environ.get('PGHOST')=='/tmp/medveda-closure-pg/socket'
env={k:os.environ[k] for k in ['PATH','PGHOST','PGPORT','PGUSER']};db='mv003_'+uuid.uuid4().hex[:12];env.update(PGDATABASE=db,PGOPTIONS='-c search_path=public,extensions')
def sql(q=None,path=None,check=True):
 cmd=['psql','-XqAt','-v','ON_ERROR_STOP=1']+(['-f',str(path)] if path else ['-c',q]);r=subprocess.run(cmd,cwd=root,env=env,text=True,capture_output=True)
 if check and r.returncode:raise RuntimeError(r.stdout+r.stderr)
 return r
subprocess.run(['createdb',db],env=env,check=True)
try:
 sql(path=root/'supabase/tests/support/supabase_stub.sql')
 for m in sorted((root/'supabase/migrations').glob('*.sql')):
  if m.name.startswith('20261111120000'):continue
  sql(path=m)
 sql(path=root/'supabase/tests/support/seed.sql')
 r=sql(path=root/'supabase/tests/p0-classified-reversal.sql',check=False)
 (out/'classified-before.log').write_text(r.stdout+r.stderr)
 assert r.returncode and 'Razorpay entitlement not committed' in r.stderr
 print('PASS independently reproduced C3 classified partial-refund settlement rollback',flush=True)
 tables=['orders','payments','purchases','products','wallet_ledger','referrals','payment_captures','payment_compensations','provider_events']
 def fingerprint():return {t:sql("select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public."+t+' t').stdout for t in tables}
 before=fingerprint()
 patch=root/'supabase/migrations/20261111120000_p0_classified_reversal_commitment.sql'
 sql(path=patch);sql(path=patch);assert fingerprint()==before
 print('PASS P0 forward proof migration applied twice; every tested historical/catalog fingerprint unchanged',flush=True)
 for name in ['p0-classified-reversal','phase-c-contracts','phase-c-play-duplicates']:
  r=sql(path=root/'supabase/tests'/(name+'.sql'));print(r.stdout+r.stderr);print('PASS final SQL '+name,flush=True)
 for name in ['mv003-entitlement']:
  subprocess.run(['node','supabase/tests/'+name+'-selftest.cjs'],cwd=root,env=env,check=True)
 inventory=sql("select json_agg(json_build_object('name',proname,'args',pg_get_function_identity_arguments(oid),'owner',pg_get_userbyid(proowner),'definer',prosecdef,'config',proconfig,'acl',proacl,'definition',pg_get_functiondef(oid))) from pg_proc where pronamespace='public'::regnamespace").stdout
 (out/'p0-final-functions.json').write_text(inventory)
 print('PASS final strong proof/security regressions',flush=True)
finally:subprocess.run(['dropdb',db],env=env,check=True)
