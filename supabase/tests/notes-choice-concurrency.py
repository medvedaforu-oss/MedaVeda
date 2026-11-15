"""Two real local PostgreSQL sessions racing the same Google choice."""
import os, subprocess, json
assert os.environ.get('PGHOST') in ('/tmp','127.0.0.1','localhost') or os.environ.get('PGHOST','').startswith('/tmp/')
db=os.environ.get('TEMPLATE_DB','ap_ci_notes_choice')
assert db.startswith('ap_ci_'), 'Disposable local scratch database required'
def sql(q):
 return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',q],text=True).strip()
uid='d9400000-0000-4000-8000-000000000001';choice='d9400000-0000-4000-8000-000000000010'
sql(f"""
insert into auth.users(id,email) values('{uid}','choice-race@example.invalid');
update public.profiles set course_id='bams' where id='{uid}';
insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type) values('choice_race_notes','Race Notes','chapter',49,'seed_c','bams',true,'notes');
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,provider,play_sku,status,expires_at,external_transaction_token)
values('{choice}','{uid}','choice_race_notes','chapter','seed_c','bams',49,49,'play','fixture_sku','created',now()+interval '30 minutes','fixture_race_choice_token');
""")
call=f"select public.prepare_notes_choice_checkout('{uid}','{choice}','choice_race_notes',false,'KERALA');"
processes=[subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',"begin;set local statement_timeout='10s';"+call+"select pg_sleep(0.2);commit;"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True) for _ in range(2)]
results=[]
for process in processes:
 out,err=process.communicate(timeout=15)
 assert process.returncode==0,(out,err)
 results.append(json.loads(out.splitlines()[0]))
assert all(r['ok'] for r in results),results
assert sum(r['claimed'] for r in results)==1,results
assert results[0]['order_id']==results[1]['order_id'],results
oid=results[0]['order_id']
assert sql(f"select count(*) from public.notes_choice_checkouts where choice_id='{choice}'")=='1'
sql(f"update public.orders set razorpay_order_id='order_choice_race' where id='{oid}'")
processes=[subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-c',f"select public.settle_razorpay_payment('evt_choice_race_{n}','order_choice_race','pay_choice_race',4900,now());"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True) for n in range(2)]
for process in processes:
 out,err=process.communicate(timeout=15)
 assert process.returncode==0,(out,err)
assert sql(f"select count(*) from public.purchases where order_id='{oid}' and status='success'")=='1'
assert sql(f"select count(*) from public.payments where order_id='{oid}'")=='1'
print('PASS concurrent real PostgreSQL sessions: one provider-creation claim/order; concurrent capture callbacks grant once')
