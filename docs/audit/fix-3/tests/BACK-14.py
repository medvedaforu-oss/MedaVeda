import pathlib,subprocess,os
assert os.environ.get('PGHOST')=='/tmp/medveda-fix3-socket' and os.environ.get('PGPORT')=='55433'
p=pathlib.Path(os.environ.get('FIX3_UCB_CHECK','supabase/checks/ucb_postdeploy_checks.sql'))
s=p.read_text();predicate=s.split("union all select 'price tiers populated', exists (")[1].split('\n)\nselect check_name')[0].rstrip();assert predicate.endswith(')');predicate=predicate[:-1]
query="""begin;
delete from public.play_price_tiers;
delete from public.play_price_sync;
insert into public.play_price_sync(price_inr,status,candidate_sku) values(49,'ready','notes_49_00_v_00000000000040008000000000000014');
insert into public.play_price_tiers(price_inr,play_sku,active,verified_at,currency_code,region_code) values(49,'notes_49_00_v_00000000000040008000000000000014',true,now(),'INR','IN');
select exists("""+predicate+""");rollback;"""
r=subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d','fix3_after','-c',query],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
assert 't' in r.stdout.splitlines(),'generated verified INR/India ready tier rejected'
print('PASS BACK14 actual readiness predicate accepts generated verified ready SKU')
