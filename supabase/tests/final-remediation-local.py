#!/usr/bin/env python3
"""Credential-free PG17 replay and final-remediation fixtures; never contacts hosted PostgreSQL."""
import os,pathlib,subprocess,tempfile,json
root=pathlib.Path(__file__).resolve().parents[2]
bin=pathlib.Path('/usr/lib/postgresql/17/bin')
new=['20261125210000_restore_admin_product_entrypoint_privileges.sql','20261125210100_drop_redundant_play_sku_unique_constraint.sql']
with tempfile.TemporaryDirectory(prefix='medveda-remediation-final-pg-') as directory:
 d=pathlib.Path(directory);env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
 env.update(PGHOST=str(d),PGPORT='55489',PGUSER='postgres',PGDATABASE='postgres',PGOPTIONS='-c search_path=public,extensions')
 def run(args,success=True):
  p=subprocess.run([str(x) for x in args],env=env,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  if success and p.returncode:raise RuntimeError(p.stdout[-7000:])
  return p
 def query(sql,success=True):return run([bin/'psql','-XqAt','-v','ON_ERROR_STOP=1','-c',sql],success)
 def file(path,success=True):return run([bin/'psql','-XqAt','-v','ON_ERROR_STOP=1','-f',path],success)
 run([bin/'initdb','-D',d/'data','--auth=trust','--no-locale','-U','postgres']);started=False
 try:
  run([bin/'pg_ctl','-D',d/'data','-l',d/'server.log','-o',f"-k {d} -p 55489 -h '' -c shared_buffers=16MB -c max_connections=12 -c work_mem=2MB",'-w','start']);started=True
  query('create database ap_ci_final');env['PGDATABASE']='ap_ci_final'
  file(root/'supabase/tests/support/supabase_stub.sql')
  for path in sorted((root/'supabase/migrations').glob('*.sql')):
   if path.name[:8].isdigit() and path.name not in new:file(path)
  file(root/'supabase/tests/support/seed.sql');print('PASS full pre-existing migration replay + fixture seed',flush=True)
  # Reproduce exactly the hosted entrypoint ACL drift, without changing RLS/RPC bodies.
  query('revoke insert,delete on public.products from authenticated;revoke execute on function public.products_update(text,integer,jsonb) from authenticated;')
  red=file(root/'supabase/tests/final_product_permissions_checks.sql',False)
  assert red.returncode and 'Admin INSERT grant missing' in red.stdout,red.stdout
  query('rollback');print('PASS RED reproduced hosted ACL mismatch',flush=True)
  snapshots="""select jsonb_build_object(
   'products',(select jsonb_agg(to_jsonb(t) order by id) from public.products t),
   'orders',(select jsonb_agg(to_jsonb(t) order by id) from public.orders t),
   'purchases',(select jsonb_agg(to_jsonb(t) order by id) from public.purchases t),
   'tiers',(select jsonb_agg(to_jsonb(t) order by play_sku) from public.play_price_tiers t),
   'jobs',(select jsonb_agg(to_jsonb(t) order by kind,order_id) from public.play_payment_jobs t),
   'functions',(select jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,pg_get_functiondef(p.oid)) order by p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
   'policies',(select jsonb_agg(to_jsonb(t) order by tablename,policyname) from pg_policies t where schemaname='public'))::text"""
  before=query(snapshots).stdout
  file(root/'supabase/migrations'/new[0]);file(root/'supabase/tests/final_product_permissions_checks.sql')
  print('PASS GREEN restored Admin entrypoints; RLS/MFA/revision checks run as real authenticated/anon roles',flush=True)
  # Guard rejects alternative semantics and dependent foreign keys on independent clones.
  query('create database ap_ci_index_drift template ap_ci_final')
  original_db=env['PGDATABASE'];env['PGDATABASE']='ap_ci_index_drift'
  query('alter table public.play_price_tiers drop constraint play_price_tiers_play_sku_key;create unique index play_price_tiers_play_sku_key on public.play_price_tiers(play_sku desc);')
  result=file(root/'supabase/migrations'/new[1],False)
  assert result.returncode and 'not equivalent' in result.stdout,result.stdout
  env['PGDATABASE']=original_db;query('drop database ap_ci_index_drift')
  query('create database ap_ci_index_fk template ap_ci_final');env['PGDATABASE']='ap_ci_index_fk'
  query('create table public.final_dependency(sku text references public.play_price_tiers(play_sku))')
  bound=query("select conindid='public.play_price_tiers_play_sku_key'::regclass from pg_constraint where conrelid='public.final_dependency'::regclass and contype='f'").stdout.strip()
  assert bound=='t','Fixture FK did not bind duplicate index'
  result=file(root/'supabase/migrations'/new[1],False)
  assert result.returncode and 'has dependents' in result.stdout,result.stdout
  env['PGDATABASE']=original_db;query('drop database ap_ci_index_fk')
  print('PASS index guards reject differing ordering/ownership and FK dependency',flush=True)
  file(root/'supabase/migrations'/new[1]);file(root/'supabase/migrations'/new[1])
  assert query(snapshots).stdout==before,'Forward migrations changed data, function definitions, or RLS'
  print('PASS forward migrations preserve all fixture products/orders/entitlements/tiers/jobs, RPC bodies and RLS',flush=True)
  index_check=query("""do $$begin
    assert to_regclass('public.play_price_tiers_play_sku_key') is null;
    assert exists(select 1 from pg_constraint where conrelid='public.play_price_tiers'::regclass and conname='play_price_tiers_pkey' and contype='p');
    assert to_regclass('public.play_one_active_verified_tier_per_price') is not null;
  end $$;
  begin;
  insert into public.play_price_tiers(price_inr,play_sku,active) values(881.01,'final_fixture_sku',false);
  do $$begin
    begin
      insert into public.play_price_tiers(price_inr,play_sku,active) values(882.01,'final_fixture_sku',false);
      raise exception 'SKU duplicate accepted';
    exception when unique_violation then null;end;
    assert (select count(*)=1 from public.play_price_tiers where play_sku='final_fixture_sku');
    insert into public.play_price_tiers(price_inr,play_sku,active,verified_at) values(883.01,'final_price_1',true,now());
    begin
      insert into public.play_price_tiers(price_inr,play_sku,active,verified_at) values(883.01,'final_price_2',true,now());
      raise exception 'Active price duplicate accepted';
    exception when unique_violation then null;end;
  end $$;
  set local enable_seqscan=off;
  explain select * from public.play_price_tiers where play_sku='final_fixture_sku';
  rollback;""")
  assert 'play_price_tiers_pkey' in index_check.stdout,index_check.stdout
  print('PASS redundant index removed only; PK uniqueness, partial price uniqueness and indexed SKU lookup preserved',flush=True)
  suites=['admin_catalog_remediation_checks','play_india_price_validation_checks','play_terminal_recovery_checks','content_publication_checks','course_wide_browsing_checks','quiz_answer_and_admin_mfa_checks','admin_mfa_checks','high_phone_and_notes_checks','question_papers_checks']
  failures=[]
  for suite in suites:
   result=file(root/f'supabase/tests/{suite}.sql',False)
   if result.returncode or any(line.startswith('FAIL') for line in result.stdout.splitlines()):
    failures.append(suite);print('FAIL '+suite+'\n'+result.stdout[-2200:],flush=True)
   else:print('PASS '+suite,flush=True)
  assert not failures,failures
  env['TEMPLATE_DB']='ap_ci_final'
  run(['python3','supabase/tests/product-concurrency-local.py'])
  run(['python3','supabase/tests/audit-notification-concurrency-local.py'])
  print('PASS real local product revision/catalog concurrency and notification reservation concurrency',flush=True)
 finally:
  if started:run([bin/'pg_ctl','-D',d/'data','-m','immediate','-w','stop'])
