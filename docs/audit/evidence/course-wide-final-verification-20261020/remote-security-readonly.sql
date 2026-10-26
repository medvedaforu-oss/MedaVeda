begin read only;
select jsonb_build_object(
 'rls', (select jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'enabled',c.relrowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='public' and c.relname in ('profiles','purchases','subjects','chapters','notes','videos','quiz_tests','products')) or (n.nspname='storage' and c.relname='objects')),
 'notes_bucket', (select jsonb_build_object('private',not public) from storage.buckets where id='notes'),
 'storage_policies', (select jsonb_agg(jsonb_build_object('name',policyname,'kind',permissive,'roles',roles,'command',cmd,'qual',qual)) from pg_policies where schemaname='storage' and tablename='objects' and cmd in ('SELECT','ALL')),
 'content_policies', (select jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'qual',qual)) from pg_policies where schemaname='public' and tablename in ('subjects','chapters','notes','videos','quiz_tests','products') and cmd='SELECT'),
 'functions', (select jsonb_agg(jsonb_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid),'security_definer',p.prosecdef,'settings',p.proconfig,'privileges',p.proacl)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('has_content_access','user_can_access_note','user_can_access_video','submit_quiz_attempt','am_i_admin')),
 'url_helper_privileges',jsonb_build_object('anon_note',has_function_privilege('anon','public.user_can_access_note(uuid,text)','execute'),'student_note',has_function_privilege('authenticated','public.user_can_access_note(uuid,text)','execute'),'service_note',has_function_privilege('service_role','public.user_can_access_note(uuid,text)','execute'))
) as security_snapshot;
rollback;
