"""Exercise installation, replay, conflicts and recovery on disposable local clones."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import uuid

root = Path(__file__).resolve().parents[2]
assert os.environ.get('PGHOST') in ('/tmp', '127.0.0.1', 'localhost'), 'localhost required'
assert os.environ.get('PGPORT'), 'explicit disposable PostgreSQL port required'
template = os.environ.get('TEMPLATE_DB', '')
assert re.fullmatch(r'ap_ci_[a-z0-9_]+', template), 'disposable baseline template required'
environment = {key: value for key, value in os.environ.items() if key in (
    'PATH', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'LD_LIBRARY_PATH')}
migration = (root / 'supabase/migrations/20261109120000_isolated_nonplay_test.sql').read_text()
databases = []


def command(database):
    return ['psql', '-XqAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-d', database]


def sql(database, query, check=True):
    return subprocess.run(command(database), input=query, text=True, env=environment,
                          capture_output=True, check=check)


def clone(source=template):
    database = 'ap_ci_repeat_' + uuid.uuid4().hex[:12]
    sql('postgres', f'create database {database} template {source}')
    databases.append(database)
    return database


def snapshot(database):
    dump = subprocess.check_output(['pg_dump', '--schema-only', '--no-comments', database],
                                   env=environment, text=True)
    dump = '\n'.join(line for line in dump.splitlines() if not line.startswith('\\'))
    tables = json.loads(sql(database, """
      select json_agg(json_build_array(n.nspname,c.relname) order by n.nspname,c.relname)
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','auth','storage','cron') and c.relkind='r'
    """).stdout)
    def identifier(value):
        return '"' + value.replace('"', '""') + '"'
    entries = [f"(select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from {identifier(schema)}.{identifier(table)} t)"
               for schema, table in tables]
    rows = sql(database, 'select jsonb_build_array(' + ','.join(entries) + ')').stdout
    sequences = sql(database, 'select jsonb_agg(to_jsonb(s) order by schemaname,sequencename) from pg_sequences s').stdout
    identities = sql(database, """
      select jsonb_build_object(
        'functions',(select jsonb_agg(to_jsonb(p) order by p.oid) from pg_proc p where pronamespace='public'::regnamespace),
        'relations',(select jsonb_agg(jsonb_build_array(oid,relname,relowner,relacl) order by oid) from pg_class where relnamespace='public'::regnamespace),
        'triggers',(select jsonb_agg(to_jsonb(t) order by oid) from pg_trigger t where not tgisinternal),
        'policies',(select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p))
    """).stdout
    return hashlib.sha256((dump + rows + sequences + identities).encode()).hexdigest()


def reject(database, query, label, expected='55000'):
    sql(database, query)
    before = snapshot(database)
    result = sql(database, migration, check=False)
    assert result.returncode != 0 and expected in result.stderr, (label, result.stderr)
    assert 'incompatible or incomplete object' in result.stderr or 'configuration row' in result.stderr, result.stderr
    assert snapshot(database) == before, f'{label}: failed replay changed existing state'
    print(f'PASS incompatible object rejected without writes: {label}', flush=True)


try:
    original_database = clone()
    original = 'begin;\n' + migration.split('execute $install$\n', 1)[1].split('\n$install$;', 1)[0] + '\ncommit;'
    sql(original_database, original)
    original_state = snapshot(original_database)
    result = sql(original_database, original, check=False)
    assert result.returncode != 0 and '42P07' in result.stderr and 'nonplay_test_config' in result.stderr, result.stderr
    assert snapshot(original_database) == original_state
    print('PASS original failure reproduced: 42P07 relation "nonplay_test_config" already exists', flush=True)
    sql(original_database, migration)
    assert snapshot(original_database) == original_state
    print('PASS compatible original installation accepted without catalog/data/sequence changes', flush=True)

    installed = clone()
    sql(installed, migration)
    first_state = snapshot(installed)
    sql(installed, migration)
    assert snapshot(installed) == first_state
    sql(installed, 'set default_transaction_read_only=on; set search_path=auth;\n' + migration)
    assert snapshot(installed) == first_state
    print('PASS first install, second install and read-only replay with alternate search_path', flush=True)

    populated = clone(installed)
    fixture = (root / 'supabase/tests/nonplay-test-isolation.sql').read_text()
    assert fixture.rstrip().endswith('rollback;')
    sql(populated, fixture.rsplit('rollback;', 1)[0] + 'update public.nonplay_test_config set enabled=false; commit;')
    populated_state = snapshot(populated)
    sql(populated, migration)
    assert snapshot(populated) == populated_state
    assert int(sql(populated, 'select count(*) from public.nonplay_test_orders').stdout) > 0
    print('PASS replay preserves populated synthetic records, revoked entitlement, claims, audit and sequence positions', flush=True)

    sql(populated, """
      begin;
      do $$ declare target record; begin
        for target in select oid::regclass relation from pg_class
          where relnamespace='public'::regnamespace and relkind='r'
            and relname like 'nonplay\\_test\\_%' escape '\\' loop
          execute format('grant select,insert on %s to authenticated,anon',target.relation);
        end loop;
      end $$;
      set local role authenticated;
      do $$ declare target record; visible boolean; begin
        for target in select oid::regclass relation from pg_class
          where relnamespace='public'::regnamespace and relkind='r'
            and relname like 'nonplay\\_test\\_%' escape '\\' loop
          execute format('select exists(select 1 from %s)',target.relation) into visible;
          if visible then raise exception 'authenticated RLS bypass: %',target.relation; end if;
        end loop;
        begin
          insert into public.nonplay_test_webhooks(event_id,payload_hash) values('rls-probe',repeat('0',64));
          raise exception 'authenticated RLS write bypass';
        exception when insufficient_privilege then null; end;
        begin
          perform public.nonplay_test_quote(null,null);
          raise exception 'authenticated RPC execute bypass';
        exception when insufficient_privilege then null; end;
      end $$;
      reset role;
      set local role anon;
      do $$ begin
        if exists(select 1 from public.nonplay_test_orders) then raise exception 'anon RLS bypass'; end if;
        begin
          perform public.nonplay_test_quote(null,null);
          raise exception 'anon RPC execute bypass';
        exception when insufficient_privilege then null; end;
      end $$;
      reset role;
      set local role service_role;
      do $$ begin
        if not exists(select 1 from public.nonplay_test_orders) then raise exception 'service role read denied'; end if;
        if public.nonplay_test_user_allowed(null) then raise exception 'OFF gate bypass'; end if;
      end $$;
      reset role;
      rollback;
    """)
    assert snapshot(populated) == populated_state
    print('PASS actual client RLS denies reads/writes even with temporary grants; client RPCs denied; service privileges and OFF gate enforced', flush=True)

    interrupted = clone()
    initial_state = snapshot(interrupted)
    result = sql(interrupted, migration.rsplit('commit;', 1)[0] + "do $$ begin raise exception 'simulated pre-COMMIT interruption'; end $$;", check=False)
    assert result.returncode != 0 and 'simulated pre-COMMIT interruption' in result.stderr
    assert snapshot(interrupted) == initial_state
    sql(interrupted, migration)
    sql(interrupted, migration)
    print('PASS interrupted first installation rolls back fully; clean retry and replay succeed', flush=True)

    concurrent = clone()
    with tempfile.TemporaryFile(mode='w+') as first_input, tempfile.TemporaryFile(mode='w+') as second_input:
        for stream in (first_input, second_input):
            stream.write(migration)
            stream.seek(0)
        processes = [subprocess.Popen(command(concurrent), stdin=stream, stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE, text=True, env=environment)
                     for stream in (first_input, second_input)]
        for process in processes:
            output = process.communicate(timeout=60)
            assert process.returncode == 0, output
    sql(concurrent, migration)
    print('PASS concurrent initial applications serialize and remain repeatable', flush=True)

    collisions = [
        ('partial compatible table', "create table public.nonplay_test_config(environment text primary key check(environment='production-isolated-razorpay-test-v1'),enabled boolean not null default false)"),
        ('incompatible table', 'create table public.nonplay_test_config(environment integer)'),
        ('pre-existing bucket', "insert into storage.buckets(id,name,public) values('nonplay-test-notes','nonplay-test-notes',true)"),
        ('pre-existing function', 'create function public.nonplay_test_quote() returns integer language sql as $$ select 1 $$'),
    ]
    for label, query in collisions:
        reject(clone(), query, label)

    conflicts = [
        ('column type', 'alter table public.nonplay_test_products alter column price_paise type bigint'),
        ('column default', 'alter table public.nonplay_test_products alter column active set default true'),
        ('nullability', 'alter table public.nonplay_test_products alter column title drop not null'),
        ('missing constraint', 'alter table public.nonplay_test_products drop constraint nonplay_test_products_price_paise_check'),
        ('index definition', 'alter index public.nonplay_test_one_open_order rename to unexpected_open_order'),
        ('missing table', 'alter table public.nonplay_test_audit rename to unexpected_audit'),
        ('RLS disabled', 'alter table public.nonplay_test_orders disable row level security'),
        ('forced RLS disabled', 'alter table public.nonplay_test_orders no force row level security'),
        ('client table grant', 'grant select on public.nonplay_test_orders to authenticated'),
        ('client column grant', 'grant select(title) on public.nonplay_test_products to anon'),
        ('missing service grant', 'revoke insert on public.nonplay_test_orders from service_role'),
        ('changed owner', 'alter table public.nonplay_test_webhooks owner to service_role'),
        ('function body', "create or replace function public.nonplay_test_quote(p_user uuid,p_product text) returns jsonb language sql security definer set search_path=public,pg_temp as $$ select '{}'::jsonb $$"),
        ('function security', 'alter function public.nonplay_test_quote(uuid,text) security invoker'),
        ('function search_path', 'alter function public.nonplay_test_quote(uuid,text) set search_path=public'),
        ('function overload', 'create function public.nonplay_test_quote() returns integer language sql as $$ select 1 $$'),
        ('function public privilege', 'grant execute on function public.nonplay_test_quote(uuid,text) to public'),
        ('trigger disabled', 'alter table public.nonplay_test_orders disable trigger nonplay_test_order_snapshot'),
        ('extra trigger', 'create trigger unexpected_snapshot before update on public.nonplay_test_orders for each row execute function public.nonplay_test_immutable_order()'),
        ('storage policy', 'alter policy nonplay_test_no_direct_storage on storage.objects using(true)'),
        ('extra table policy', 'create policy unexpected_policy on public.nonplay_test_orders using(true)'),
        ('bucket public', "update storage.buckets set public=true where id='nonplay-test-notes'"),
        ('bucket limit', "update storage.buckets set file_size_limit=1 where id='nonplay-test-notes'"),
        ('bucket MIME types', "update storage.buckets set allowed_mime_types=array['text/plain'] where id='nonplay-test-notes'"),
        ('sequence definition', 'alter sequence public.nonplay_test_audit_id_seq increment by 2'),
        ('sequence privilege', 'grant usage on sequence public.nonplay_test_audit_id_seq to anon'),
        ('unexpected enablement', 'update public.nonplay_test_config set enabled=true'),
        ('missing config row', 'delete from public.nonplay_test_config'),
    ]
    for label, query in conflicts:
        reject(clone(installed), query, label)
    print(json.dumps({'result': 'PASS', 'conflict_cases': len(collisions) + len(conflicts),
                      'hosted_calls': 0, 'provider_calls': 0}), flush=True)
finally:
    for database in reversed(databases):
        sql('postgres', f'drop database if exists {database}')
