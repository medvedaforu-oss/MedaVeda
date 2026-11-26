-- Public discovery is explicitly approved for published papers with active,
-- consistent course/year/subject ancestry. Publishing in the existing Admin
-- panel is the single opt-in; no PDF access or new client table grants follow.
begin;

create function public.question_paper_public_catalog()
returns jsonb
language sql stable security definer
set search_path = ''
set statement_timeout = '5s'
as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id', p.id, 'title', p.title,
   'course_id', c.id, 'course_name', c.name, 'course_order', c.display_order,
   'year_id', y.id, 'year_title', y.title, 'year_order', y."order",
   'subject_id', s.id, 'subject_title', s.title, 'subject_order', s."order",
   'exam_year', p.exam_year, 'exam_session', p.exam_session,
   'exam_month', p.exam_month, 'paper_number', p.paper_number,
   'updated_at', p.updated_at
 ) order by p.id), '[]'::jsonb)
 from public.question_papers p
 join public.subjects s on s.id = p.subject_id
 join public.years y on y.id = s.year_id
 join public.courses c on c.id = y.course_id
 where p.published is true and s.active is true
   and y.active is true and c.active is true
   and s.course_id = c.id;
$$;

-- No arguments, dynamic SQL, table return type, or private columns. The owner
-- can read through RLS only within this fixed projection and publication gate.
revoke all on function public.question_paper_public_catalog() from public, anon, authenticated;
grant execute on function public.question_paper_public_catalog() to anon, authenticated;
comment on function public.question_paper_public_catalog() is
 'Read-only public discovery metadata for published Question Papers. Does not authorize PDF access.';

commit;
