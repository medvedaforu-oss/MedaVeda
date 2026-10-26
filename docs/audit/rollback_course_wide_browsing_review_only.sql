-- REVIEW ONLY: not in the migration directory and never executed remotely.
-- Use as a NEW forward migration only after deployment and explicit release approval.
-- Restores the actual pre-deployment catalogue helper captured from the linked database.
-- Keeps the new note-preview/video/quiz course checks, all PDF guards, and all data.
begin;
CREATE OR REPLACE FUNCTION public.has_content_access(p_course_id text, p_year_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.am_i_admin()
    or exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and pr.course_id = p_course_id
        and (
          p_year_id is null
          or pr.year_id = p_year_id
          or pr.year_id is null   -- TEMPORARY – remove after min app version X
        )
    )
    or exists (
      select 1
      from public.purchases pu
      left join public.chapters ch on pu.scope = 'chapter' and ch.id = pu.chapter_id
      left join public.subjects sb on pu.scope = 'subject' and sb.id = pu.subject_id
      where pu.user_id = auth.uid()
        and pu.status = 'success'
        and pu.course_id = p_course_id
        and (
          p_year_id is null
          or (pu.scope = 'year' and pu.year_id = p_year_id)
          or (pu.scope = 'bundle' and p_year_id = any(pu.year_ids))
          or (pu.scope = 'chapter' and ch.year_id = p_year_id)
          or (pu.scope = 'subject' and sb.year_id = p_year_id)
        )
    );
$function$;
commit;
