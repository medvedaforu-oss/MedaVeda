begin read only;
select jsonb_build_object(
 'active_subjects_in_inactive_years',(select count(*) from public.subjects s join public.years y on y.id=s.year_id where s.active and not y.active),
 'active_chapters_in_inactive_subjects',(select count(*) from public.chapters c join public.subjects s on s.id=c.subject_id where c.active and not s.active),
 'active_notes_in_inactive_chapters',(select count(*) from public.notes n join public.chapters c on c.id=n.chapter_id where n.active and not c.active),
 'content_all_policies',(select jsonb_agg(jsonb_build_object('table',tablename,'policy',policyname,'qual',qual)) from pg_policies where schemaname='public' and tablename in ('subjects','chapters','notes','videos','quiz_tests','products') and cmd='ALL'),
 'client_roles',(select jsonb_agg(jsonb_build_object('role',rolname,'bypassrls',rolbypassrls,'superuser',rolsuper)) from pg_roles where rolname in ('anon','authenticated'))
) as parent_snapshot;
rollback;
