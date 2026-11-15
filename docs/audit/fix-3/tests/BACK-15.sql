\set ON_ERROR_STOP on
begin;
insert into public.push_tokens(user_id,expo_push_token,platform,updated_at)
select '5eed0000-0000-0000-0000-00000000000b','ExpoPushToken[fix3token0000'||i||']','android',now()-i*interval '1 minute' from generate_series(1,10) i;
select set_config('request.jwt.claim.sub','5eed0000-0000-0000-0000-00000000000b',true);
set local role authenticated;
select public.register_push_token('ExpoPushToken[fix3new00000001]','android');
do $$ begin
 assert (select count(*)=10 from public.push_tokens),'token count incorrect';
 assert exists(select 1 from public.push_tokens where expo_push_token='ExpoPushToken[fix3new00000001]'),'new token missing';
 assert not exists(select 1 from public.push_tokens where expo_push_token='ExpoPushToken[fix3token000010]'),'oldest token retained';
end $$;
select public.register_push_token('ExpoPushToken[fix3new00000001]','android');
do $$ begin
 assert (select count(*)=10 from public.push_tokens),'refresh evicted token';
 begin
  insert into public.push_tokens(user_id,expo_push_token,platform) values(auth.uid(),'ExpoPushToken[fix3direct000001]','android');raise exception 'direct cap bypass';
 exception when sqlstate '54000' then null;end;
end $$;
rollback;
\echo PASS BACK-15 evict-before-insert, refresh and direct cap
