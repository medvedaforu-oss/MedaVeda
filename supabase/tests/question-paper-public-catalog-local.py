#!/usr/bin/env python3
"""Disposable local PG17 only. No hosted connections or production credentials."""
import json
import os
import pathlib
import subprocess
import tempfile

root = pathlib.Path(__file__).resolve().parents[2]
bin_dir = pathlib.Path('/usr/lib/postgresql/17/bin')
with tempfile.TemporaryDirectory(prefix='medveda-public-qp-') as directory:
    tmp = pathlib.Path(directory)
    env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
    env.update(PGHOST=str(tmp), PGPORT='55492', PGUSER='postgres', PGDATABASE='postgres', TEMPLATE_DB='postgres')

    def run(args):
        result = subprocess.run([str(a) for a in args], env=env, text=True, capture_output=True)
        if result.returncode:
            raise RuntimeError(result.stdout[-6000:] + result.stderr[-6000:] + ((tmp/'log').read_text()[-4000:] if (tmp/'log').exists() else ''))
        return result.stdout

    def sql(statement):
        return run([bin_dir/'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement])

    def file(path):
        return run([bin_dir/'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-f', path])

    def check(statement, label):
        assert sql(statement).strip() == 't', label
        print('PASS', label, flush=True)

    protection = """select jsonb_build_object(
      'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p),
      'functions',(select jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,pg_get_functiondef(p.oid),p.proacl) order by p.oid)
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname<>'question_paper_public_catalog'),
      'tables',(select jsonb_agg(jsonb_build_array(c.oid::regclass::text,c.relacl,c.relrowsecurity) order by c.oid)
        from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage') and c.relkind='r'),
      'buckets',(select jsonb_agg(to_jsonb(b) order by id) from storage.buckets b)
    )::text"""
    run([bin_dir/'initdb', '-D', tmp/'data', '--auth=trust', '--no-locale', '--encoding=UTF8', '-U', 'postgres'])
    started = False
    try:
        run([bin_dir/'pg_ctl', '-D', tmp/'data', '-l', tmp/'log', '-o', f"-k {tmp} -p 55492 -h ''", '-w', 'start'])
        started = True
        file(root/'supabase/tests/support/supabase_stub.sql')
        for migration in sorted((root/'supabase/migrations').glob('*.sql')):
            is_public = migration.name == '20261126160000_question_paper_public_catalog.sql'
            if is_public:
                before = sql(protection)
            file(migration)
            if is_public:
                assert before == sql(protection), 'Existing grants, policies, functions or buckets changed'
        print('PASS full migration chain and unchanged existing grants, RLS, functions and buckets', flush=True)
        check("select prosecdef and proconfig @> array['search_path=\"\"','statement_timeout=5s'] from pg_proc where oid='public.question_paper_public_catalog()'::regprocedure", 'fixed empty search_path and security definer configuration')
        check("""select has_function_privilege('anon','public.question_paper_public_catalog()','EXECUTE')
          and has_function_privilege('authenticated','public.question_paper_public_catalog()','EXECUTE')
          and not exists(select 1 from pg_proc p,lateral aclexplode(p.proacl) a where p.oid='public.question_paper_public_catalog()'::regprocedure and a.grantee=0)
          and not has_table_privilege('anon','public.question_papers','SELECT')
          and not has_table_privilege('anon','public.question_paper_validated_objects','SELECT')""", 'narrow RPC grants; anonymous private-table and receipt reads denied')
        sql("""
          insert into public.courses(id,name,code) values('public-fixture-course','Fixture course','PUBLIC_FIXTURE');
          insert into public.years(id,title,course_id) values('public-fixture-year','Fixture academic year','public-fixture-course');
          insert into public.subjects(id,title,year_id) values('public-fixture-subject','Fixture subject','public-fixture-year');
          insert into auth.users(id,email) values('cc000000-0000-4000-8000-000000000001','public-fixture-admin@example.test');
          insert into public.admins(id,email) values('cc000000-0000-4000-8000-000000000001','public-fixture-admin@example.test');
          insert into storage.objects(bucket_id,name,metadata) values('question-papers','cc000000-0000-4000-8000-000000000002.pdf','{"mimetype":"application/pdf","size":12}');
          insert into public.question_paper_validated_objects values('cc000000-0000-4000-8000-000000000002.pdf',12);
        """)
        paper = 'cc000000-0000-4000-8000-000000000003'

        def admin(statement):
            claims = '{"sub":"cc000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}'
            return sql(f"begin; set local role authenticated; select set_config('request.jwt.claims','{claims}',true); {statement}; commit;")

        def public():
            result = sql("begin; set local role anon; select public.question_paper_public_catalog(); commit;")
            return json.loads(next(line for line in result.splitlines() if line.startswith('[')))

        admin(f"insert into public.question_papers(id,subject_id,exam_year,exam_session,title,paper_number,object_path) values('{paper}','public-fixture-subject',2023,'Summer','Fixture public title','1','cc000000-0000-4000-8000-000000000002.pdf')")
        snapshots = {'draft': public()}
        assert snapshots['draft'] == []
        admin(f"select id from public.question_papers_update('{paper}',1,'{{\"published\":true}}')")
        snapshots['published'] = public()
        assert len(snapshots['published']) == 1
        row = snapshots['published'][0]
        assert row['course_id'] == 'public-fixture-course' and row['year_id'] == 'public-fixture-year'
        assert row['subject_id'] == 'public-fixture-subject' and row['exam_session'] == 'Summer'
        expected = {'id','title','course_id','course_name','course_order','year_id','year_title','year_order','subject_id','subject_title','subject_order','exam_year','exam_session','exam_month','paper_number','updated_at'}
        assert set(row) == expected
        assert '.pdf' not in json.dumps(row) and 'object_path' not in row
        print('PASS actual anonymous RPC projection, published gate and correct academic ancestry', flush=True)
        admin(f"select id from public.question_papers_update('{paper}',2,'{{\"title\":\"Fixture edited title\",\"exam_year\":2025,\"exam_session\":\"Winter\"}}')")
        snapshots['edited'] = public()
        assert snapshots['edited'][0]['id'] == paper and snapshots['edited'][0]['title'] == 'Fixture edited title'
        assert snapshots['edited'][0]['updated_at'] > snapshots['published'][0]['updated_at']
        for table, key in [('subjects','public-fixture-subject'),('years','public-fixture-year'),('courses','public-fixture-course')]:
            sql(f"update public.{table} set active=false where id='{key}'")
            assert public() == [], f'Inactive {table} leaked'
            sql(f"update public.{table} set active=true where id='{key}'")
            assert len(public()) == 1
        # Check the denormalized course field cannot mix unrelated academic data.
        sql("alter table public.subjects disable trigger user; update public.subjects set course_id='bams' where id='public-fixture-subject'; alter table public.subjects enable trigger user;")
        assert public() == []
        sql("alter table public.subjects disable trigger user; update public.subjects set course_id='public-fixture-course' where id='public-fixture-subject'; alter table public.subjects enable trigger user;")
        admin(f"select id from public.question_papers_update('{paper}',3,'{{\"published\":false}}')")
        snapshots['unpublished'] = public()
        assert snapshots['unpublished'] == []
        admin(f"select id from public.question_papers_delete('{paper}',4)")
        snapshots['deleted'] = public()
        assert snapshots['deleted'] == []
        print('PASS real Admin add/publish/edit/unpublish/delete, active ancestors and course isolation', flush=True)
        check("select not public from storage.buckets where id='question-papers'", 'Question Paper bucket remains private')
        check("select count(*)=1 from public.question_paper_validated_objects where object_path='cc000000-0000-4000-8000-000000000002.pdf'", 'deletion preserves private immutable validation receipt')
        # Direct table access must still fail with the public API role.
        for table in ['question_papers','question_paper_validated_objects']:
            result = subprocess.run([str(bin_dir/'psql'),'-X','-v','ON_ERROR_STOP=1','-c',f'set role anon; select * from public.{table}'], env=env, text=True, capture_output=True)
            assert result.returncode and 'permission denied' in result.stderr
        assert sql("begin;set local role anon;select count(*) from storage.objects where bucket_id='question-papers';commit;").splitlines()[2] == '0'
        print('PASS anonymous direct table access denied and private Storage rows invisible', flush=True)
        (tmp/'snapshots.json').write_text(json.dumps(snapshots))
        print(run(['node',root/'website/scripts/question-paper-catalog-selftest.mjs','--snapshots',tmp/'snapshots.json','--http']), flush=True)
        print(run(['node',root/'supabase/tests/content-url-publication-selftest.cjs']), flush=True)
    finally:
        if started:
            run([bin_dir/'pg_ctl', '-D', tmp/'data', '-m', 'immediate', '-w', 'stop'])
