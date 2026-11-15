import os, subprocess, pathlib, uuid
root=pathlib.Path('/home/ganeshp8545/AyurPulse')
env={k:os.environ[k] for k in ('PATH','PGHOST','PGPORT','PGUSER')}
assert env['PGHOST']=='/tmp/medveda-live-payment-pg'
db='website_review_'+uuid.uuid4().hex[:10]
def run(args,**kw): return subprocess.run(args,cwd=root,env=env,check=True,**kw)
def sql(*args,database=db,**kw): return run(['psql','-Xq','-v','ON_ERROR_STOP=1','-d',database,*args],**kw)
try:
 sql('-c','create database '+db,database='postgres')
 sql('-f','supabase/tests/support/supabase_stub.sql',stdout=subprocess.DEVNULL)
 for m in sorted((root/'supabase/migrations').glob('*.sql')):
  sql('-f',str(m),stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 sql('-f','supabase/tests/support/seed.sql',stdout=subprocess.DEVNULL)
 print('PASS disposable current-schema payment template',flush=True)
 env['TEMPLATE_DB']=db
 run(['bash','supabase/tests/webhook-harness/run.sh'])
 for name in ['razorpay_snapshot_retry_checks','referral_off_wallet_checks','referral_switch_off_paths']:
  child=db+'_case'
  sql('-c',f'create database {child} template {db}',database='postgres')
  try: sql('-f','supabase/tests/'+name+'.sql',database=child)
  finally: sql('-c','drop database '+child,database='postgres')
  print('PASS existing SQL suite '+name,flush=True)
 # Keep the isolated template only while this turn performs candidate SQL checks.
 pathlib.Path('/tmp/medveda-website-template-name').write_text(db)
 print('TEMPLATE '+db,flush=True)
except BaseException:
 sql('-c','drop database if exists '+db,database='postgres')
 raise
