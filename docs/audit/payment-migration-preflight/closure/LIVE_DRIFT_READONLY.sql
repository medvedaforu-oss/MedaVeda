-- PREPARED ONLY. No production execution authorized. Output is PRIVATE.
-- Run only this file using psql -X -v ON_ERROR_STOP=1 after separate approval.
-- Establish target project through an independently verified connection/control-plane record.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
SET LOCAL idle_in_transaction_session_timeout='30s';
SET LOCAL search_path=pg_catalog;
SELECT jsonb_build_object('observed_at',clock_timestamp(),'database',current_database(),
 'session_user',session_user,'current_user',current_user,'server_version',version(),
 'read_only',current_setting('transaction_read_only'),'isolation',current_setting('transaction_isolation'),
 'in_recovery',pg_is_in_recovery()) AS observation;
SELECT e.extname,e.extversion,n.nspname AS schema,pg_get_userbyid(e.extowner) AS owner
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY e.extname;
SELECT to_regprocedure('extensions.digest(text,text)')::text AS required_digest_signature;
SELECT nspname,pg_get_userbyid(nspowner) AS owner,nspacl,
 has_schema_privilege('anon',oid,'CREATE') AS anon_create,
 has_schema_privilege('authenticated',oid,'CREATE') AS authenticated_create
FROM pg_namespace WHERE nspname IN ('public','auth','storage','extensions') ORDER BY nspname;
SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconfig
FROM pg_roles ORDER BY rolname;
SELECT pg_get_userbyid(roleid) AS role,pg_get_userbyid(member) AS member,admin_option,inherit_option,set_option
FROM pg_auth_members ORDER BY role,member;
SELECT pg_get_userbyid(defaclrole) AS owner,n.nspname,d.defaclobjtype,d.defaclacl
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace ORDER BY owner,nspname,defaclobjtype;
SELECT p.oid::regprocedure::text AS signature,pg_get_function_identity_arguments(p.oid) AS identity_arguments,
 pg_get_function_result(p.oid) AS result,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.provolatile,
 p.proconfig,p.proacl,md5(p.prosrc) AS body_md5,
 encode(sha256(convert_to(btrim(pg_get_functiondef(p.oid),E' \t\n\r'),'UTF8')),'hex') AS trimmed_definition_sha256,
 pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','auth','storage','extensions') AND p.prokind IN ('f','p') ORDER BY signature;
-- Effective role privileges include inheritance/PUBLIC; inspect unexpected service/admin paths too.
SELECT p.oid::regprocedure::text AS signature,r.rolname,
 has_function_privilege(r.oid,p.oid,'EXECUTE') AS effective_execute
FROM pg_proc p CROSS JOIN pg_roles r
WHERE p.pronamespace='public'::regnamespace AND p.prokind='f'
ORDER BY signature,r.rolname;
SELECT n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner,c.relacl,
 c.relrowsecurity,c.relforcerowsecurity,c.reloptions
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','auth','storage') ORDER BY n.nspname,c.relname;
SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,column_default
FROM information_schema.columns WHERE table_schema IN ('public','auth','storage') ORDER BY table_schema,table_name,ordinal_position;
SELECT * FROM pg_policies WHERE schemaname IN ('public','auth','storage') ORDER BY schemaname,tablename,policyname;
SELECT t.tgrelid::regclass::text AS relation,t.tgname,t.tgenabled,t.tgfoid::regprocedure::text AS function,
 t.tgtype,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE c.relnamespace IN ('public'::regnamespace,'auth'::regnamespace,'storage'::regnamespace)
ORDER BY relation,t.tgname;
SELECT evtname,evtevent,evtenabled,evtfoid::regprocedure::text AS function,evttags FROM pg_event_trigger ORDER BY evtname;
SELECT i.indrelid::regclass::text AS relation,i.indexrelid::regclass::text AS index,
 i.indisunique,i.indisprimary,i.indisvalid,i.indisready,i.indislive,
 pg_get_indexdef(i.indexrelid) AS definition,pg_get_expr(i.indpred,i.indrelid) AS predicate,
 pg_get_expr(i.indexprs,i.indrelid) AS expressions,pg_relation_size(i.indexrelid) AS bytes
FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
WHERE c.relnamespace IN ('public'::regnamespace,'auth'::regnamespace,'storage'::regnamespace) ORDER BY relation,index;
SELECT conrelid::regclass::text AS relation,conname,contype,convalidated,condeferrable,condeferred,
 pg_get_constraintdef(oid) AS definition FROM pg_constraint
WHERE connamespace IN ('public'::regnamespace,'auth'::regnamespace,'storage'::regnamespace) ORDER BY relation,conname;
-- Full original arrays, not a fabricated concatenation or a version-count proxy.
SELECT version,name,statements FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT relname,n_live_tup,n_dead_tup,n_tup_ins,n_tup_upd,n_tup_del,
 pg_total_relation_size(relid) AS total_bytes FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY relname;
SELECT locktype,relation::regclass::text AS relation,mode,granted,count(*)
FROM pg_locks WHERE database=(SELECT oid FROM pg_database WHERE datname=current_database())
GROUP BY locktype,relation,mode,granted ORDER BY relation,mode,granted;
ROLLBACK;
