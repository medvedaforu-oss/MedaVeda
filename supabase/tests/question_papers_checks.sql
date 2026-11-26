\set ON_ERROR_STOP on
-- Mirror hosted Storage API role privileges; test-only and rolled back.
begin;
grant insert,update,delete on storage.objects to authenticated;
create function pg_temp.qp_assert(ok boolean, label text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'FAIL %',label; end if; raise notice 'PASS %',label; end $$;
select pg_temp.qp_assert(to_regclass('public.question_papers') is not null,'question papers table exists');
-- Fixture writes roll back. No production data or existing policy is changed by the migration.
insert into auth.users(id,email) values
 ('aaa00000-0000-0000-0000-000000000001','qp-admin@example.test'),
 ('aaa00000-0000-0000-0000-000000000002','qp-student@example.test');
insert into public.admins(id,email) values ('aaa00000-0000-0000-0000-000000000001','qp-admin@example.test');
insert into public.courses(id,name,code) values ('qp_course','QP course','QP_TEST');
insert into public.years(id,title,course_id) values ('qp_year','QP year','qp_course');
insert into public.subjects(id,title,year_id) values ('qp_subject','QP subject','qp_year');
select set_config('app.allow_profile_admin_fields','true',true);
update public.profiles set course_id='qp_course',year_id='qp_year' where id='aaa00000-0000-0000-0000-000000000002';
select set_config('app.allow_profile_admin_fields','false',true);
insert into storage.objects(bucket_id,name,metadata) values
 ('question-papers','11111111-1111-4111-8111-111111111111.pdf','{"mimetype":"application/pdf","size":12}'),
 ('question-papers','22222222-2222-4222-8222-222222222222.pdf','{"mimetype":"application/pdf","size":12}'),
 ('question-papers','44444444-4444-4444-8444-444444444444.pdf','{"mimetype":"application/pdf","size":12}'),
 ('thumbnails','qp-control.png','{}');
insert into public.question_paper_validated_objects(object_path,byte_size) select name,12 from storage.objects where bucket_id='question-papers' and name<>'44444444-4444-4444-8444-444444444444.pdf';
select set_config('request.jwt.claims','{"sub":"aaa00000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
insert into storage.objects(bucket_id,name,metadata) values('question-papers','33333333-3333-4333-8333-333333333333.pdf','{"mimetype":"application/pdf","size":12}');
reset role;
insert into public.question_paper_validated_objects values('33333333-3333-4333-8333-333333333333.pdf',12);
set local role authenticated;
insert into public.question_papers(id,subject_id,exam_year,exam_month,paper_type,paper_number,object_path,published) values
 ('11111111-0000-4000-8000-000000000001','qp_subject',2025,6,E' \tTheory\n ',E' \tI\n ','11111111-1111-4111-8111-111111111111.pdf',true),
 ('11111111-0000-4000-8000-000000000002','qp_subject',2025,12,'','II','22222222-2222-4222-8222-222222222222.pdf',false);
do $$ begin
 begin insert into public.question_paper_validated_objects values('55555555-5555-4555-8555-555555555555.pdf',12);
 raise exception 'FAIL client forged validation receipt'; exception when insufficient_privilege then null; end;
 begin update public.question_papers set published=true;
 raise exception 'FAIL direct Admin update bypassed revision'; exception when insufficient_privilege then null; end;
end $$;
select pg_temp.qp_assert((select paper_type='theory' and paper_number='i' from public.question_papers where exam_month=6),'normalized identity');
do $$ begin
 begin insert into public.question_papers(subject_id,exam_year,exam_month,paper_type,paper_number,object_path)
 values('qp_subject',2025,6,'THEORY','I','22222222-2222-4222-8222-222222222222.pdf');
 raise exception 'FAIL duplicate accepted'; exception when unique_violation then null; end;
 begin update storage.objects set name='changed.pdf' where bucket_id='question-papers';
 exception when insufficient_privilege then null; end;
end $$;
select pg_temp.qp_assert((select count(*)=0 from storage.objects where bucket_id='question-papers'),'Admin cannot directly read or sign objects');
do $$ begin
 begin insert into public.question_papers(subject_id,exam_year,exam_month,object_path) values('qp_subject',2026,13,'33333333-3333-4333-8333-333333333333.pdf');
 raise exception 'FAIL invalid month accepted'; exception when check_violation then null; end;
 begin insert into public.question_papers(subject_id,exam_year,exam_month,object_path) values('missing_subject',2026,1,'33333333-3333-4333-8333-333333333333.pdf');
 raise exception 'FAIL invalid subject accepted'; exception when foreign_key_violation then null; end;
 begin insert into public.question_papers(subject_id,exam_year,exam_month,object_path) values('qp_subject',2026,1,'44444444-4444-4444-8444-444444444444.pdf');
 raise exception 'FAIL unvalidated PDF accepted'; exception when check_violation then null; end;
 delete from storage.objects where bucket_id='question-papers' and name='11111111-1111-4111-8111-111111111111.pdf';
 if found then raise exception 'FAIL referenced PDF deleted'; end if;
 perform public.question_papers_update('11111111-0000-4000-8000-000000000002',1,'{"object_path":"33333333-3333-4333-8333-333333333333.pdf"}');
 perform public.question_papers_delete('11111111-0000-4000-8000-000000000002',2);
 if not found then raise exception 'FAIL admin delete unavailable'; end if;
end $$;
select pg_temp.qp_assert(public.question_papers_valid_object('22222222-2222-4222-8222-222222222222.pdf'),'replacement/delete retain existing PDFs');
insert into public.question_papers(subject_id,exam_year,exam_month,object_path) values('qp_subject',2025,12,'33333333-3333-4333-8333-333333333333.pdf');
reset role;
select set_config('request.jwt.claims','{"sub":"aaa00000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select pg_temp.qp_assert((select count(*)=1 from public.question_papers),'student sees published only with no purchase');
select pg_temp.qp_assert((select count(*)=0 from storage.objects where bucket_id='question-papers'),'student cannot directly read or sign published PDF');
select pg_temp.qp_assert((select count(*)=1 from storage.objects where name='qp-control.png'),'unrelated thumbnails still visible');
do $$ begin
 begin insert into storage.objects(bucket_id,name,metadata) values('question-papers','44444444-4444-4444-8444-444444444444.pdf','{}');
 raise exception 'FAIL student upload accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.question_papers(subject_id,exam_year,exam_month,object_path)
 values('qp_subject',2026,1,'22222222-2222-4222-8222-222222222222.pdf');
 raise exception 'FAIL student insert accepted'; exception when insufficient_privilege then null; end;
 begin perform public.question_papers_update('11111111-0000-4000-8000-000000000001',1,'{"published":false}'); raise exception 'FAIL student update accepted'; exception when insufficient_privilege then null; end;
 begin perform public.question_papers_delete('11111111-0000-4000-8000-000000000001',1); raise exception 'FAIL student delete accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.question_papers set published=false where exam_month=6;
set local role authenticated;
select pg_temp.qp_assert((select count(*)=0 from public.question_papers),'unpublish withdraws metadata');
select pg_temp.qp_assert((select count(*)=0 from storage.objects where bucket_id='question-papers'),'unpublish withdraws signing access');
reset role;
update public.question_papers set published=true where exam_month=6;
update public.subjects set active=false where id='qp_subject';
set local role authenticated;
select pg_temp.qp_assert((select count(*)=0 from public.question_papers),'inactive subject hides paper');
reset role;
update public.subjects set active=true where id='qp_subject';
select set_config('request.jwt.claims','{"sub":"aaa00000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
update public.admin_settings set require_mfa=true;
set local role authenticated;
select pg_temp.qp_assert(not public.am_i_admin(),'existing MFA predicate enforced');
select pg_temp.qp_assert((select count(*)=0 from public.question_papers where not published),'MFA deficient admin cannot see drafts');
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.qp_assert(not has_table_privilege('anon','public.question_papers','SELECT'),'anonymous metadata SELECT privilege denied');
do $$ begin
 begin perform 1 from public.question_papers;
 raise exception 'FAIL anonymous metadata SELECT accepted'; exception when insufficient_privilege then null; end;
end $$;
select pg_temp.qp_assert((select count(*)=1 from storage.objects where name='qp-control.png'),'anonymous unrelated thumbnails unchanged');
select pg_temp.qp_assert((select count(*)=0 from storage.objects where bucket_id='question-papers'),'anonymous PDF read denied');
reset role;
select pg_temp.qp_assert((select not public from storage.buckets where id='question-papers'),'bucket private');
rollback;
\echo PASS question paper authorization and lifecycle checks
