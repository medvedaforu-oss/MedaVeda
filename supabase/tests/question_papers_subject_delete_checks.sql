\set ON_ERROR_STOP on
-- Run against the historical schema, then against the new module schema.
-- All fixtures and grant emulation are rolled back in a disposable database.
begin;
create function pg_temp.qp_delete_assert(ok boolean,label text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'FAIL %',label; end if; raise notice 'PASS %',label; end $$;
insert into auth.users(id,email) values
 ('ccc00000-0000-4000-8000-000000000001','qp-delete-admin@example.test'),
 ('ccc00000-0000-4000-8000-000000000002','qp-delete-student@example.test');
insert into public.admins(id,email) values('ccc00000-0000-4000-8000-000000000001','qp-delete-admin@example.test');
insert into public.courses(id,name,code) values('qp_delete_course','Delete test','QP_DELETE');
insert into public.years(id,title,course_id) values('qp_delete_year','Delete test','qp_delete_course');
insert into public.subjects(id,title,year_id) values
 ('qp_delete_empty','Empty','qp_delete_year'),
 ('qp_delete_published','Published','qp_delete_year'),
 ('qp_delete_draft','Draft','qp_delete_year'),
 ('qp_delete_control','Unrelated','qp_delete_year');
update public.admin_settings set require_mfa=true;
\if :qp_module
insert into storage.objects(bucket_id,name,metadata) values
 ('question-papers','cccccccc-0000-4000-8000-000000000001.pdf','{"mimetype":"application/pdf","size":12}'),
 ('question-papers','cccccccc-0000-4000-8000-000000000002.pdf','{"mimetype":"application/pdf","size":12}'),
 ('question-papers','cccccccc-0000-4000-8000-000000000003.pdf','{"mimetype":"application/pdf","size":12}');
insert into public.question_paper_validated_objects select name,12 from storage.objects
 where bucket_id='question-papers' and name like 'cccccccc-%';
insert into public.question_papers(id,subject_id,exam_year,exam_month,object_path,published) values
 ('cccccccc-1111-4000-8000-000000000001','qp_delete_published',2025,1,'cccccccc-0000-4000-8000-000000000001.pdf',true),
 ('cccccccc-1111-4000-8000-000000000002','qp_delete_draft',2025,1,'cccccccc-0000-4000-8000-000000000002.pdf',false),
 ('cccccccc-1111-4000-8000-000000000003','qp_delete_control',2025,1,'cccccccc-0000-4000-8000-000000000003.pdf',true);
\endif
-- Compare every row of every other existing table, including private Storage and
-- receipts. This catches unintended deletes/updates anywhere in the local schema.
create function pg_temp.qp_other_rows() returns jsonb language plpgsql as $$
declare t record; rows jsonb; result jsonb := '{}'::jsonb;
begin
 for t in select schemaname,tablename from pg_tables where schemaname in ('public','storage')
  and tablename not in ('subjects','question_papers') order by schemaname,tablename loop
  execute format('select coalesce(jsonb_agg(v order by v::text),%L::jsonb) from (select to_jsonb(r) v from %I.%I r) q','[]',t.schemaname,t.tablename) into rows;
  result := result || jsonb_build_object(t.schemaname||'.'||t.tablename,rows);
 end loop;
 return result;
end $$;
create temp table qp_delete_snapshot as select pg_temp.qp_other_rows() others,
 (select jsonb_agg(to_jsonb(s) order by id) from public.subjects s where id not in ('qp_delete_empty','qp_delete_published','qp_delete_draft')) subjects;
select set_config('request.jwt.claims','{"sub":"ccc00000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
with removed as (delete from public.subjects where id='qp_delete_empty' returning id)
 select pg_temp.qp_delete_assert((select count(*)=0 from removed),'student cannot delete subjects');
reset role;
select set_config('request.jwt.claims','{"sub":"ccc00000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
with removed as (delete from public.subjects where id='qp_delete_empty' returning id)
 select pg_temp.qp_delete_assert((select count(*)=0 from removed),'MFA deficient Admin cannot delete subjects');
reset role;
select set_config('request.jwt.claims','{"sub":"ccc00000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
-- Same DELETE ... RETURNING used by the unchanged Admin service.
with removed as (delete from public.subjects where id='qp_delete_empty' returning id)
 select pg_temp.qp_delete_assert((select count(*)=1 from removed),'Admin deletes empty subject');
with removed as (delete from public.subjects where id='qp_delete_published' returning id)
 select pg_temp.qp_delete_assert((select count(*)=1 from removed),'Admin deletes subject with published paper');
with removed as (delete from public.subjects where id='qp_delete_draft' returning id)
 select pg_temp.qp_delete_assert((select count(*)=1 from removed),'Admin deletes subject with draft paper');
reset role;
select pg_temp.qp_delete_assert(pg_temp.qp_other_rows()=(select others from qp_delete_snapshot),'all unrelated records, PDF objects and receipts unchanged');
select pg_temp.qp_delete_assert((select jsonb_agg(to_jsonb(s) order by id) from public.subjects s)=(select subjects from qp_delete_snapshot),'only targeted subjects removed');
\if :qp_module
select pg_temp.qp_delete_assert((select count(*)=1 from public.question_papers where subject_id like 'qp_delete_%'),'only targeted paper metadata removed');
select pg_temp.qp_delete_assert((select published and revision=1 and object_path='cccccccc-0000-4000-8000-000000000003.pdf' from public.question_papers where subject_id='qp_delete_control'),'unrelated paper unchanged');
-- A stale Admin cannot restore a removed paper through the mutation RPC.
set local role authenticated;
do $$ begin
 begin perform public.question_papers_update('cccccccc-1111-4000-8000-000000000001',1,'{"published":true}');
 raise exception 'FAIL stale metadata restored'; exception when serialization_failure then null; end;
end $$;
select pg_temp.qp_delete_assert((select count(*)=0 from public.question_papers where id in ('cccccccc-1111-4000-8000-000000000001','cccccccc-1111-4000-8000-000000000002')),'Admin signing lookup cannot resolve deleted metadata');
select pg_temp.qp_delete_assert((select count(*)=0 from storage.objects where bucket_id='question-papers'),'Admin cannot read retained PDFs directly');
reset role;
select set_config('request.jwt.claims','{"sub":"ccc00000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.qp_delete_assert((select count(*)=0 from public.question_papers where subject_id in ('qp_delete_published','qp_delete_draft')),'student signing lookup cannot resolve deleted metadata');
select pg_temp.qp_delete_assert((select count(*)=0 from storage.objects where bucket_id='question-papers'),'student cannot read retained PDFs directly');
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.qp_delete_assert(not has_table_privilege('anon','public.question_papers','SELECT'),'anonymous metadata SELECT privilege still denied');
do $$ begin
 begin perform 1 from public.question_papers;
 raise exception 'FAIL anonymous metadata SELECT accepted after subject deletion'; exception when insufficient_privilege then null; end;
end $$;
select pg_temp.qp_delete_assert((select count(*)=0 from storage.objects where bucket_id='question-papers'),'anonymous cannot read retained PDFs');
reset role;
select pg_temp.qp_delete_assert((select not public from storage.buckets where id='question-papers'),'retained objects remain in private bucket');
\endif
rollback;
\echo PASS subject deletion compatibility
