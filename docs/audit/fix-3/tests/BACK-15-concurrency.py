import os,subprocess,concurrent.futures
assert os.environ.get('PGHOST')=='/tmp/medveda-fix3-socket' and os.environ.get('PGPORT')=='55433'
def sql(s):return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d','fix3_after','-c',s],check=True,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout
uid='5eed0000-0000-0000-0000-00000000000b'
sql(f"delete from public.push_tokens where user_id='{uid}'; insert into public.push_tokens(user_id,expo_push_token,platform,updated_at) select '{uid}','ExpoPushToken[parallelold0000'||i||']','android',now()-i*interval '1 minute' from generate_series(1,10)i;")
def worker(n):
 sql(f"begin;set local role authenticated;select set_config('request.jwt.claim.sub','{uid}',true);select public.register_push_token('ExpoPushToken[parallelnew0000{n}]','android');select pg_sleep(0.15);commit;")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(worker,[1,2]))
r=sql(f"select count(*)=10 and count(*) filter(where expo_push_token like 'ExpoPushToken[parallelnew%')=2 and count(*) filter(where expo_push_token in ('ExpoPushToken[parallelold000010]','ExpoPushToken[parallelold00009]'))=0 from public.push_tokens where user_id='{uid}';").strip()
assert r=='t',r
print('PASS BACK15 actual concurrent authenticated RPC sessions: both new tokens retained, oldest two evicted, count ten')
