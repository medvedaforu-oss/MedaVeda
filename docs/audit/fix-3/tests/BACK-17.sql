\set ON_ERROR_STOP on
do $$ begin
 assert not has_function_privilege('authenticated','public.delete_my_account()','EXECUTE'),'authenticated can still execute delete_my_account';
 assert not has_function_privilege('anon','public.delete_my_account()','EXECUTE'),'anon can still execute delete_my_account';
end $$;
\echo PASS BACK-17 legacy self-delete RPC inaccessible; no deletion executed
