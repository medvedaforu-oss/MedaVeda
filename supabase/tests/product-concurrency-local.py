"""F01/F10 real concurrent sessions; requires a disposable local fixture database."""
import os, subprocess, json
from pathlib import Path
host=os.environ.get('PGHOST','')
assert host.startswith('/tmp/') or host in ('127.0.0.1','localhost'), 'local PostgreSQL required'
template=os.environ.get('TEMPLATE_DB','')
assert template and (template == 'postgres' or template.startswith('ap_ci_')), 'disposable template required'
db='ap_ci_product_race_'+str(os.getpid())
uid='a9100000-0000-4000-8000-000000000001'
def sql(query,database=db):
 return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',database,'-c',query],text=True).strip()
def launch(query):
 return subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',query],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
 sql('create database '+db+' template '+template,'postgres')
 sql("insert into auth.users(id,email) values('"+uid+"','product-race@example.invalid');insert into public.admins(id,email) values('"+uid+"','product-race@example.invalid');")
 initial=json.loads(sql("select json_build_object('revision',revision,'price',price,'scope',scope) from public.products where id='seed_product'"))
 revision=initial['revision']
 claims=json.dumps({'sub':uid,'role':'authenticated','aal':'aal2'})
 prefix="begin;set local statement_timeout='8s';set local role authenticated;select set_config('request.jwt.claims','"+claims+"',true);"
 one=launch(prefix+"select id from public.products_update('seed_product',"+str(revision)+",'{\"active\":false}');select pg_sleep(0.2);commit;")
 two=launch(prefix+"select id from public.products_update('seed_product',"+str(revision)+",'{\"title\":\"Other admin\",\"active\":true}');select pg_sleep(0.2);commit;")
 results=[p.communicate(timeout=12)+(p.returncode,) for p in (one,two)]
 assert sum(r[2]==0 for r in results)==1,results
 assert any('Conflict: product changed or deleted' in r[1] for r in results if r[2]),results
 saved=json.loads(sql("select json_build_object('revision',revision,'price',price,'scope',scope) from public.products where id='seed_product'"))
 assert saved['revision']==revision+1 and saved['price']==initial['price'] and saved['scope']==initial['scope'],saved
 print('PASS F10 real concurrent Admin sessions: one edit commits, one stale revision conflicts; price/scope preserved')
 # Two published Notes products share one exact-price catalog job/SKU reservation.
 inserts=[]
 for n in (1,2):
  inserts.append(launch("begin;set local statement_timeout='8s';insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type) values('catalog_race_"+str(n)+"','Concurrent Notes','chapter',991.23,'seed_c','bams',true,'notes');select pg_sleep(0.2);commit;"))
 for p in inserts:
  out,err=p.communicate(timeout=12);assert p.returncode==0,(out,err)
 assert sql('select count(*) from public.play_price_sync where price_inr=991.23')=='1'
 assert sql("select count(*) from public.play_price_sync_logs where price_inr=991.23 and event='queued'")=='1'
 assert sql('select count(*) from public.play_price_tiers where price_inr=991.23')=='0'
 print('PASS F01 real concurrent product inserts reserve one price job/SKU without creating or forging a verified Google tier')
finally:
 sql('drop database if exists '+db+' with (force)','postgres')
