#!/usr/bin/env python3
"""New disposable local PG17 cluster. Never uses an existing connection or env credentials."""
import os, pathlib, subprocess, tempfile, sys
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
root=pathlib.Path(__file__).resolve().parents[2]
bin=pathlib.Path('/usr/lib/postgresql/17/bin')
with tempfile.TemporaryDirectory(prefix='medveda-qp-') as directory:
 d=pathlib.Path(directory)
 env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
 env.update(PGHOST=str(d),PGPORT='55479',PGUSER='postgres',PGDATABASE='postgres')
 def run(args):
  p=subprocess.run([str(x) for x in args],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  if p.returncode:
   log=(d/'server.log').read_text() if (d/'server.log').exists() else ''
   raise RuntimeError(p.stdout[-8000:]+log[-4000:])
  return p.stdout
 def sql(path): return run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-f',path])
 run([bin/'initdb','-D',d/'data','--auth=trust','--no-locale','-U','postgres'])
 started=False
 try:
  run([bin/'pg_ctl','-D',d/'data','-l',d/'server.log','-o',f"-k {d} -p 55479 -h ''",'-w','start']); started=True
  sql(root/'supabase/tests/support/supabase_stub.sql')
  for path in sorted((root/'supabase/migrations').glob('*.sql')):
   if path.name[:8].isdigit():
    if path.name.endswith('_question_papers.sql'):
     protection_query="""select jsonb_build_object(
      'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where policyname not like 'question_papers_%'),
      'functions',(select jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,pg_get_functiondef(p.oid),p.proacl) order by p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname not like 'question_papers_%'),
      'buckets',(select jsonb_agg(to_jsonb(b) order by id) from storage.buckets b where id<>'question-papers'),
      'tables',(select jsonb_agg(jsonb_build_array(c.oid::regclass::text,c.relacl,c.relrowsecurity,(select jsonb_agg(to_jsonb(a) order by attnum) from pg_attribute a where a.attrelid=c.oid)) order by c.oid) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage') and c.relkind='r' and c.relname not in ('question_papers','question_paper_validated_objects'))
     )::text"""
     print(run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-v','qp_module=false','-f',root/'supabase/tests/question_papers_subject_delete_checks.sql']))
     before=run([bin/'psql','-X','-At','-c',protection_query])
    try: sql(path)
    except RuntimeError as e: raise RuntimeError(f'{path.name}: {e}')
    if path.name.endswith('_question_papers.sql'):
     assert before==run([bin/'psql','-X','-At','-c',protection_query]), 'Existing schema/security/bucket definition changed'
     print('PASS existing table definitions/grants, RLS policies, functions and buckets unchanged')
  print(run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-v','qp_module=true','-f',root/'supabase/tests/question_papers_subject_delete_checks.sql']))
  sql(root/'supabase/tests/support/seed.sql')
  print('PASS complete existing migration chain + additive migration')
  # Real overlapping transactions: the unique identity permits exactly one winner.
  fixture_path='99999999-9999-4999-8999-999999999999.pdf'
  other_path='99999999-9999-4999-8999-999999999998.pdf'
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',f"insert into storage.objects(bucket_id,name,metadata) values('question-papers','{fixture_path}','{{\"mimetype\":\"application/pdf\",\"size\":12}}')"])
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',f"insert into storage.objects(bucket_id,name,metadata) values('question-papers','{other_path}','{{\"mimetype\":\"application/pdf\",\"size\":12}}')"])
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',"insert into public.question_paper_validated_objects select name,12 from storage.objects where bucket_id='question-papers'"])
  barrier=Barrier(2)
  def contender(n):
   barrier.wait()
   object_path=fixture_path if n==1 else other_path
   paper_type=' Theory ' if n==1 else 'theory'
   statement=f"begin; insert into public.question_papers(subject_id,exam_year,exam_month,paper_type,paper_number,object_path) values('seed_s',1991,1,'{paper_type}','race','{object_path}'); select pg_sleep(0.5); commit;"
   return subprocess.run([str(bin/'psql'),'-X','-v','ON_ERROR_STOP=1','-c',statement],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  with ThreadPoolExecutor(max_workers=2) as pool: races=list(pool.map(contender,[1,2]))
  assert sum(r.returncode==0 for r in races)==1, 'Duplicate race did not have one winner'
  assert any('question_papers_identity' in r.stdout for r in races if r.returncode), 'Loser did not receive unique violation'
  assert run([bin/'psql','-X','-At','-c',"select count(*) from public.question_papers where subject_id='seed_s' and exam_year=1991"]).strip()=='1'
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',"delete from public.question_papers where subject_id='seed_s' and exam_year=1991"])
  # Two real Admin connections retain revision 1, then compete to mutate one row.
  admin_ids=['bbb00000-0000-4000-8000-000000000001','bbb00000-0000-4000-8000-000000000002']
  paper_id='99999999-0000-4000-8000-000000000001'
  for n,admin_id in enumerate(admin_ids):
   run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',f"insert into auth.users(id,email) values('{admin_id}','qp-race-{n}@example.test'); insert into public.admins(id,email) values('{admin_id}','qp-race-{n}@example.test');"])
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',f"insert into public.question_papers(id,subject_id,exam_year,exam_month,object_path,published) values('{paper_id}','seed_s',1992,1,'{fixture_path}',true)"])
  def admin_statement(n,statement):
   claims='{"sub":"'+admin_ids[n]+'","role":"authenticated","aal":"aal2"}'
   return f"begin; set local role authenticated; select set_config('request.jwt.claims','{claims}',true); {statement}; commit;"
  barrier=Barrier(2)
  def edit_contender(n):
   barrier.wait()
   statement=admin_statement(n,f"select * from public.question_papers_update('{paper_id}',1,'{{\"published\":false}}'); select pg_sleep(0.5)")
   return subprocess.run([str(bin/'psql'),'-X','-v','ON_ERROR_STOP=1','-c',statement],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  with ThreadPoolExecutor(max_workers=2) as pool: edits=list(pool.map(edit_contender,[0,1]))
  assert sum(r.returncode==0 for r in edits)==1, 'Admin edit race did not have exactly one winner'
  assert any('Conflict:' in r.stdout for r in edits if r.returncode), 'Stale Admin did not receive explicit conflict'
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',admin_statement(0,f"select * from public.question_papers_update('{paper_id}',2,'{{\"object_path\":\"{other_path}\"}}')")])
  for statement in [f"select * from public.question_papers_update('{paper_id}',1,'{{\"published\":true,\"object_path\":\"{fixture_path}\"}}')",f"select * from public.question_papers_delete('{paper_id}',1)"]:
   result=subprocess.run([str(bin/'psql'),'-X','-v','ON_ERROR_STOP=1','-c',admin_statement(1,statement)],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
   assert result.returncode and 'Conflict:' in result.stdout, result.stdout
  assert run([bin/'psql','-X','-At','-c',f"select revision=3 and not published and object_path='{other_path}' from public.question_papers where id='{paper_id}'"]).strip()=='t'
  for verb in [f"update public.question_papers set published=true where id='{paper_id}'",f"delete from public.question_papers where id='{paper_id}'"]:
   result=subprocess.run([str(bin/'psql'),'-X','-v','ON_ERROR_STOP=1','-c',admin_statement(1,verb)],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
   assert result.returncode and 'permission denied' in result.stdout, 'Direct mutation bypassed revision requirement'
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',admin_statement(0,f"select * from public.question_papers_delete('{paper_id}',3)")])
  for admin_id in admin_ids:
   run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',f"delete from public.admins where id='{admin_id}'; delete from auth.users where id='{admin_id}';"])
  print('PASS two Admin sessions: overlapping edits, stale republish/PDF restore/delete rejected; direct mutation denied')
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',f"delete from public.question_papers where subject_id='seed_s' and exam_year=1991; delete from storage.objects where bucket_id='question-papers' and name in ('{fixture_path}','{other_path}');"])
  print('PASS concurrent duplicate saves: exactly one winner')
  print(sql(root/'supabase/tests/question_papers_checks.sql'))
  if '--regression' in sys.argv:
   for suite in ['content_publication_checks','course_wide_browsing_checks','quiz_answer_and_admin_mfa_checks','admin_mfa_checks','high_phone_and_notes_checks']:
    out=sql(root/f'supabase/tests/{suite}.sql')
    if 'FAIL' in out and '0 FAIL' not in out: raise RuntimeError(out[-4000:])
    print('PASS existing '+suite)
 finally:
  if started: run([bin/'pg_ctl','-D',d/'data','-m','immediate','-w','stop'])
