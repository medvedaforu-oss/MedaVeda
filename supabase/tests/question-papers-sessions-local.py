import os,subprocess,tempfile,pathlib
root=pathlib.Path(__file__).resolve().parents[2];bin=pathlib.Path('/usr/lib/postgresql/17/bin')
with tempfile.TemporaryDirectory(prefix='medveda-qp-sessions-') as temp:
 d=pathlib.Path(temp);env={k:v for k,v in os.environ.items() if not k.startswith('PG')};env.update(PGHOST=str(d),PGPORT='55488',PGUSER='postgres',PGDATABASE='postgres')
 def run(args):
  r=subprocess.run([str(x) for x in args],env=env,text=True,capture_output=True)
  if r.returncode:raise RuntimeError(r.stdout+r.stderr+((d/'log').read_text() if (d/'log').exists() else ''))
  return r.stdout
 def sql(s):return run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-c',s])
 run([bin/'initdb','-D',d/'data','--auth=trust','--no-locale','-U','postgres'])
 run([bin/'pg_ctl','-D',d/'data','-l',d/'log','-o',f"-k {d} -p 55488 -h ''",'-w','start'])
 try:
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-f',root/'supabase/tests/support/supabase_stub.sql'])
  sql("""
   create table public.courses(id text primary key, active boolean);
   create table public.years(id text primary key,course_id text references public.courses,active boolean);
   create table public.subjects(id text primary key,year_id text references public.years,active boolean);
   create table public.admins(id uuid primary key);
   create table public.profiles(id uuid primary key,course_id text,blocked boolean default false);
   insert into public.admins values('aaaaaaaa-0000-0000-0000-000000000001');
   insert into public.profiles values('aaaaaaaa-0000-0000-0000-000000000002','bams',false),('aaaaaaaa-0000-0000-0000-000000000003','other',false);
   create function public.am_i_admin() returns boolean language sql security definer set search_path='' as $$
    select exists(select 1 from public.admins where id=auth.uid()) and coalesce(auth.jwt()->>'aal','')='aal2'
   $$;
   insert into public.courses values('bams',true);
   insert into public.years values('y','bams',true);
   insert into public.subjects values('s','y',true);
   alter table public.subjects enable row level security;
   create policy fixture_subject_access on public.subjects for select to authenticated using (
    public.am_i_admin() or (active and exists(select 1 from public.profiles where id=auth.uid() and course_id='bams' and not blocked))
   );
  """)
  protected_query="""select jsonb_build_object(
    'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p),
    'validator',(select pg_get_functiondef(oid) from pg_proc where pronamespace='public'::regnamespace and proname='question_papers_validate'),
    'admin',(select pg_get_functiondef(oid) from pg_proc where pronamespace='public'::regnamespace and proname='am_i_admin'),
    'rpc_grants',(select proacl::text from pg_proc where pronamespace='public'::regnamespace and proname='question_papers_update'),
    'buckets',(select jsonb_agg(to_jsonb(b) order by id) from storage.buckets b),
    'legacy',(select jsonb_agg(to_jsonb(p)) from public.question_papers p where exam_year=1999)
   )::text"""
  for p in sorted((root/'supabase/migrations').glob('*question_papers*.sql')):
   is_session=p.name.endswith('_question_papers_exam_sessions.sql')
   if is_session:
    sql("""insert into storage.objects(bucket_id,name,metadata) values('question-papers','dddddddd-dddd-dddd-dddd-dddddddddddd.pdf','{"mimetype":"application/pdf","size":12}');
     insert into public.question_paper_validated_objects values('dddddddd-dddd-dddd-dddd-dddddddddddd.pdf',12);
     insert into public.question_papers(subject_id,exam_year,exam_month,object_path) values('s',1999,5,'dddddddd-dddd-dddd-dddd-dddddddddddd.pdf');""")
    before=sql(protected_query)
   run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-f',p]);print('Applied locally:',p.name,flush=True)
   if is_session:
    # New default fields are the only difference in an already-existing row.
    import json
    def result(text):return json.loads(next(line.strip() for line in text.splitlines() if line.strip().startswith('{')))
    prior=result(before);after=result(sql(protected_query))
    for row in after['legacy']:
     assert row.pop('title')=='' and row.pop('exam_session') is None
    assert prior==after,'Existing RLS, validator, Admin/MFA, grants, buckets or month row changed'
    sql('delete from public.question_papers where exam_year=1999')
    print('PASS existing month row/revision/timestamps, RLS policies, Admin/MFA, validation and grants preserved')
  run([bin/'psql','-X','-v','ON_ERROR_STOP=1','-f',root/'supabase/tests/question_papers_sessions_checks.sql'])
  print('PASS additive sessions: distinct Summer/Winter, separate year, legacy month retained, valid title, no duplicate identity')
 finally:run([bin/'pg_ctl','-D',d/'data','-m','immediate','-w','stop'])
