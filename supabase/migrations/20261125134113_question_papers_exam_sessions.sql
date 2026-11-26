-- Question Papers only: additive metadata; no legacy month conversion or policy changes.
-- Installed clients may keep reading/inserting legacy month rows. Updated clients are
-- required to render named sessions and titles; no calendar month is fabricated.
alter table public.question_papers
 add column title text not null default '' check(length(title)<=200),
 add column exam_session text check(length(exam_session) between 1 and 60),
 alter column exam_month drop not null;
alter table public.question_papers add constraint question_papers_exam_period check (
 (exam_session is null and exam_month is not null)
 or (exam_session is not null and exam_month is null and length(btrim(title))>0)
);
create unique index question_papers_session_identity on public.question_papers
 (subject_id,exam_year,lower(exam_session),paper_type,paper_number) where exam_session is not null;
create index question_papers_named_sessions_idx on public.question_papers(subject_id,exam_year desc,exam_session,id)
 where published and exam_session is not null;

create function public.question_papers_normalize_session() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 new.title := btrim(regexp_replace(new.title,'\s+',' ','g'));
 if new.exam_session is not null then
  new.exam_session := btrim(regexp_replace(new.exam_session,'\s+',' ','g'));
  if lower(new.exam_session) in ('summer','winter') then
   new.exam_session := initcap(lower(new.exam_session));
  end if;
  if new.exam_session !~ '^[[:alnum:]][[:alnum:] ()/–—-]*$' then
   raise exception 'Enter a valid examination session' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.question_papers_normalize_session() from public,anon,authenticated;
create trigger question_papers_normalize_session before insert or update on public.question_papers
 for each row execute function public.question_papers_normalize_session();

-- Preserve the existing Admin/MFA predicate, atomic revision check and validation trigger.
create or replace function public.question_papers_update(p_id uuid,p_revision integer,p_changes jsonb)
returns setof public.question_papers language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.am_i_admin() then
  raise exception 'Admin access required' using errcode='42501';
 end if;
 return query update public.question_papers p set
  subject_id=case when p_changes ? 'subject_id' then p_changes->>'subject_id' else p.subject_id end,
  exam_year=case when p_changes ? 'exam_year' then (p_changes->>'exam_year')::integer else p.exam_year end,
  title=case when p_changes ? 'title' then p_changes->>'title' else p.title end,
  exam_session=case when p_changes ? 'exam_session' then p_changes->>'exam_session' else p.exam_session end,
  exam_month=case when p_changes ? 'exam_month' then (p_changes->>'exam_month')::integer else p.exam_month end,
  paper_type=case when p_changes ? 'paper_type' then p_changes->>'paper_type' else p.paper_type end,
  paper_number=case when p_changes ? 'paper_number' then p_changes->>'paper_number' else p.paper_number end,
  object_path=case when p_changes ? 'object_path' then p_changes->>'object_path' else p.object_path end,
  published=case when p_changes ? 'published' then (p_changes->>'published')::boolean else p.published end
 where p.id=p_id and p.revision=p_revision returning p.*;
 if not found then raise exception 'Conflict: paper changed or deleted. Reload before retrying.' using errcode='40001'; end if;
end $$;
