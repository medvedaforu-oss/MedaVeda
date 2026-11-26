-- Additive Question Paper resources only. No existing policies/functions are replaced.
-- Server-only validation receipts. No client write/read grant or RLS policy.
create table public.question_paper_validated_objects (
 object_path text primary key,
 byte_size bigint not null check(byte_size between 5 and 52428800)
);
alter table public.question_paper_validated_objects enable row level security;
revoke all on public.question_paper_validated_objects from public,anon,authenticated;
grant select,insert on public.question_paper_validated_objects to service_role;
create function public.question_papers_valid_object(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.question_paper_validated_objects v join storage.objects o
 on o.bucket_id='question-papers' and o.name=v.object_path
 where v.object_path=path and o.metadata->>'mimetype'='application/pdf'
 and (o.metadata->>'size')::bigint=v.byte_size)
$$;
revoke all on function public.question_papers_valid_object(text) from public,anon,authenticated;
grant execute on function public.question_papers_valid_object(text) to authenticated;
create table public.question_papers (
 id uuid primary key default gen_random_uuid(),
 revision integer not null default 1 check(revision>0),
 -- Preserve existing subject deletion: remove only its paper metadata.
 -- Private PDF objects and validation receipts remain for reviewed orphan cleanup.
 subject_id text not null references public.subjects(id) on delete cascade,
 exam_year integer not null check (exam_year between 1900 and 9999),
 exam_month integer not null check (exam_month between 1 and 12),
 paper_type text not null default '' check (length(paper_type)<=80),
 paper_number text not null default '' check (length(paper_number)<=40),
 object_path text not null unique check (object_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint question_papers_identity unique(subject_id,exam_year,exam_month,paper_type,paper_number)
);
create index question_papers_sessions_idx on public.question_papers(subject_id,exam_year desc,exam_month desc,id) where published;
alter table public.question_papers enable row level security;
revoke all on public.question_papers from public,anon,authenticated;
grant select,insert on public.question_papers to authenticated;
grant all on public.question_papers to service_role;

create function public.question_papers_validate() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('anon','authenticated') and not public.am_i_admin() then
  raise exception 'Admin access required' using errcode='42501';
 end if;
 new.paper_type := lower(btrim(regexp_replace(new.paper_type,'\s+',' ','g')));
 new.paper_number := lower(btrim(regexp_replace(new.paper_number,'\s+',' ','g')));
 new.updated_at := clock_timestamp();
 if tg_op='UPDATE' then
  new.revision := old.revision + 1;
  new.id := old.id;
  new.created_at := old.created_at;
 else
  new.revision := 1;
 end if;
 if not public.question_papers_valid_object(new.object_path) then
  raise exception 'Upload a valid Question Paper PDF before saving' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function public.question_papers_validate() from public,anon,authenticated;
create trigger question_papers_validate before insert or update on public.question_papers
 for each row execute function public.question_papers_validate();

-- Sole authenticated mutation entry points: atomic revision matching, unchanged Admin/MFA predicate.
create function public.question_papers_update(p_id uuid,p_revision integer,p_changes jsonb)
returns setof public.question_papers language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.am_i_admin() then
  raise exception 'Admin access required' using errcode='42501';
 end if;
 return query update public.question_papers p set
  subject_id=case when p_changes ? 'subject_id' then p_changes->>'subject_id' else p.subject_id end,
  exam_year=case when p_changes ? 'exam_year' then (p_changes->>'exam_year')::integer else p.exam_year end,
  exam_month=case when p_changes ? 'exam_month' then (p_changes->>'exam_month')::integer else p.exam_month end,
  paper_type=case when p_changes ? 'paper_type' then p_changes->>'paper_type' else p.paper_type end,
  paper_number=case when p_changes ? 'paper_number' then p_changes->>'paper_number' else p.paper_number end,
  object_path=case when p_changes ? 'object_path' then p_changes->>'object_path' else p.object_path end,
  published=case when p_changes ? 'published' then (p_changes->>'published')::boolean else p.published end
 where p.id=p_id and p.revision=p_revision returning p.*;
 if not found then raise exception 'Conflict: paper changed or deleted. Reload before retrying.' using errcode='40001'; end if;
end $$;
create function public.question_papers_delete(p_id uuid,p_revision integer)
returns setof public.question_papers language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.am_i_admin() then
  raise exception 'Admin access required' using errcode='42501';
 end if;
 return query delete from public.question_papers p where p.id=p_id and p.revision=p_revision returning p.*;
 if not found then raise exception 'Conflict: paper changed or deleted. Reload before retrying.' using errcode='40001'; end if;
end $$;
revoke all on function public.question_papers_update(uuid,integer,jsonb), public.question_papers_delete(uuid,integer) from public,anon,authenticated;
grant execute on function public.question_papers_update(uuid,integer,jsonb), public.question_papers_delete(uuid,integer) to authenticated;

create policy question_papers_admin on public.question_papers for all to authenticated
 using ((select public.am_i_admin())) with check ((select public.am_i_admin()));
-- Existing subject/year/course RLS remains authoritative, including blocked-account checks.
-- No purchase, entitlement, payment, or subscription is consulted.
create policy question_papers_published on public.question_papers for select to authenticated
 using (published and (select auth.uid()) is not null
  and not coalesce((select auth.jwt())->>'is_anonymous','false')::boolean
  and exists(select 1 from public.subjects s join public.years y on y.id=s.year_id
    join public.courses c on c.id=y.course_id
    where s.id=subject_id and s.active and y.active and c.active));

-- A name collision fails the transaction; existing resources are never overwritten.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('question-papers','question-papers',false,52428800,array['application/pdf']);

create policy question_papers_storage_insert on storage.objects for insert to authenticated
 with check(bucket_id='question-papers' and (select public.am_i_admin())
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$');
-- Resource-scoped restrictive guards protect against unrelated permissive policies.
-- All guards evaluate true outside this new bucket, preserving existing access.
-- Deny direct authenticated download/sign/list, including permissive policies elsewhere.
-- Only the dedicated server (service role) signs, with a constant 120-second expiry.
create policy question_papers_storage_read_guard on storage.objects as restrictive for select to public
 using(bucket_id<>'question-papers');
create policy question_papers_storage_insert_guard on storage.objects as restrictive for insert to public
 with check(bucket_id<>'question-papers' or ((select auth.uid()) is not null and (select public.am_i_admin())
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'));
create policy question_papers_storage_update_guard on storage.objects as restrictive for update to public
 using(bucket_id<>'question-papers') with check(bucket_id<>'question-papers');
-- Retain validated paths permanently: deleting and reusing a path would invalidate its receipt.
create policy question_papers_storage_delete_guard on storage.objects as restrictive for delete to public
 using(bucket_id<>'question-papers');
