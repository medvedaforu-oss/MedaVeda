"""Synthetic notification reservation concurrency; explicit disposable local DB only."""
import os,subprocess,json,uuid,concurrent.futures
assert os.environ.get('PGHOST','').startswith('/tmp/medveda-remediation-')
assert os.environ.get('PGDATABASE','').startswith('ap_ci_')
admin=str(uuid.uuid4());request=str(uuid.uuid4());title='remediation-'+str(uuid.uuid4());payload=json.dumps(dict(title=title,body='Synthetic broadcast',type='announcement',data={}))
def sql(q):return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',q],text=True).strip()
try:
 sql(f"insert into auth.users(id,email) values('{admin}','{admin}@example.test');insert into public.admins(id,email) values('{admin}','{admin}@example.test')")
 statement=f"begin;select public.reserve_notification_request('{admin}','{request}','{payload}'::jsonb);select pg_sleep(0.2);commit"
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:outputs=list(pool.map(sql,[statement,statement]))
 values=[json.loads(next(line for line in output.splitlines() if line.startswith('{')))for output in outputs]
 assert sum(v['reserved'] for v in values)==1,values
 losing=next(v for v in values if not v['reserved']);assert losing['result']['body']['success'] is False
 assert sql(f"select count(*) from public.notifications where title='{title}'")=='1'
 conflict=json.loads(sql(f"select public.reserve_notification_request('{admin}','{request}','{{\"title\":\"different\"}}'::jsonb)"));assert conflict['result']['httpStatus']==409
 print('PASS real PostgreSQL concurrent request reservation publishes one feed row, retains unknown outcome and refuses payload reuse')
finally:
 sql(f"delete from public.notification_requests where admin_id='{admin}';delete from public.notifications where title='{title}';delete from public.admins where id='{admin}';delete from auth.users where id='{admin}'")
