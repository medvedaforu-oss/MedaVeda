-- Disposable local fixture only; never run against production.
insert into storage.objects(bucket_id,name,metadata) values
 ('question-papers','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf','{"mimetype":"application/pdf","size":12}'),
 ('question-papers','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.pdf','{"mimetype":"application/pdf","size":12}'),
 ('question-papers','cccccccc-cccc-cccc-cccc-cccccccccccc.pdf','{"mimetype":"application/pdf","size":12}');
insert into public.question_paper_validated_objects select name,12 from storage.objects where bucket_id='question-papers' on conflict do nothing;
insert into public.question_papers(subject_id,exam_year,exam_month,object_path) values('s',2023,6,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf');
insert into public.question_papers(subject_id,exam_year,exam_session,title,paper_number,object_path)
 values('s',2023,' summer ','Kriya Sharir - I','I','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.pdf');
insert into public.question_papers(subject_id,exam_year,exam_session,title,paper_number,object_path)
 values('s',2023,'Winter','Kriya Sharir - I','I','cccccccc-cccc-cccc-cccc-cccccccccccc.pdf');
do $$ begin
 if (select count(*) from public.question_papers)<>3 then raise exception 'Session/legacy rows missing'; end if;
 if not exists(select 1 from public.question_papers where exam_session='Summer' and exam_month is null and title='Kriya Sharir - I') then raise exception 'Session normalization or title failed';end if;
 begin
  update public.question_papers set exam_session='Summer' where exam_month=6;
  raise exception 'Ambiguous month/session accepted';
 exception when check_violation then null; end;
 begin
  update public.question_papers set exam_session=null where exam_session='Winter';
  raise exception 'Missing month/session accepted';
 exception when check_violation then null; end;
 begin
  update public.question_papers set title='' where exam_session='Summer';
  raise exception 'Untitled session accepted';
 exception when check_violation then null; end;
 begin
  update public.question_papers set exam_session='SUMMER' where exam_session='Winter';
  raise exception 'Duplicate session identity accepted';
 exception when unique_violation then null; end;
 if not exists(select 1 from public.question_papers where exam_month=6 and exam_session is null and title='') then raise exception 'Legacy record altered';end if;
end $$;
-- Existing Admin/MFA, revision and validation boundaries still govern new metadata.
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',false);
set role authenticated;
do $$ declare p public.question_papers; begin
 select * into p from public.question_papers where exam_session='Summer';
 perform public.question_papers_update(p.id,p.revision,'{"title":"Kriya Sharir - I","published":true}');
 begin
  perform public.question_papers_update(p.id,p.revision,'{"published":false}');
  raise exception 'Stale revision accepted';
 exception when serialization_failure then null; end;
 if not exists(select 1 from public.question_papers where id=p.id and exam_session='Summer' and exam_month is null and title='Kriya Sharir - I' and published and revision=2) then raise exception 'Session RPC update failed';end if;
 begin
  update public.question_papers set published=false where id=p.id;
  raise exception 'Direct update bypassed revision RPC';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.question_papers(subject_id,exam_year,exam_session,title,object_path) values('s',2027,'Supplementary','Verified title','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.pdf');
  raise exception 'Missing validation receipt accepted';
 exception when check_violation then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',false);
set role authenticated;
do $$ begin
 if (select count(*) from public.question_papers)<>1 then raise exception 'Eligible free student access failed';end if;
 if exists(select 1 from storage.objects where bucket_id='question-papers') then raise exception 'Private storage read exposed';end if;
 begin
  perform public.question_papers_update((select id from public.question_papers limit 1),2,'{"published":false}');
  raise exception 'Student mutation accepted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}',false);
set role authenticated;
do $$ begin
 if exists(select 1 from public.question_papers) then raise exception 'Course restriction bypassed';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',false);
set role authenticated;
do $$ begin
 begin
  perform public.question_papers_update('00000000-0000-0000-0000-000000000000',1,'{"published":true}');
  raise exception 'MFA requirement bypassed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
