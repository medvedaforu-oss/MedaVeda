#!/usr/bin/env python3
"""Local-only fault rehearsal; no URL, credential, or project argument accepted.

Usage: python3 rehearse.py /absolute/path/to/supabase-2.75.0
Requires native PostgreSQL 17. Fixtures never enter the isolated execution package.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PG = Path('/usr/lib/postgresql/17/bin')
CLI = Path(sys.argv[1]).resolve()
EXPECTED = '6811f8573487c4d0e4f55716a7cbb1051f2ac2d0f8189165178a585b54ce9359'
CLI_SHA = 'ede7713ac26a4e8bd8ebdfad93676d9652b254d4d6bc163a003a6493f4b3302b'
VERSION = '20261118172019'
MIGRATION = f'{VERSION}_question_papers.sql'
PACKAGE = HERE / 'package'
env = {'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8', 'SUPABASE_TELEMETRY_DISABLED': 'true'}
results = {}


def command(args, **kw):
    return subprocess.run([str(a) for a in args], env=env, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, **kw)


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class LostAcknowledgement:
    """Forward the batch; suppress COMMIT and all subsequent server responses.

    Close only on ReadyForQuery after COMMIT. PostgreSQL has finished the ledger
    transaction, while the CLI has not received the success response.
    """
    def __init__(self, port):
        self.listener = socket.socket()
        self.listener.bind(('127.0.0.1', 0))
        self.listener.listen(1)
        self.listener.settimeout(25)
        self.port = self.listener.getsockname()[1]
        self.target = port
        self.events = []
        self.error = None
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()

    def run(self):
        try:
            client, _ = self.listener.accept()
            with client, socket.create_connection(('127.0.0.1', self.target)) as server:
                def upstream():
                    try:
                        while data := client.recv(65536):
                            server.sendall(data)
                    except OSError:
                        pass
                threading.Thread(target=upstream, daemon=True).start()
                buf = b''
                dropping = False
                while data := server.recv(65536):
                    buf += data
                    while len(buf) >= 5:
                        length = struct.unpack('!I', buf[1:5])[0]
                        if len(buf) < length + 1:
                            break
                        frame, buf = buf[:length + 1], buf[length + 1:]
                        if frame[:1] == b'C' and frame[5:] == b'COMMIT\0':
                            dropping = True
                            self.events.append('withheld COMMIT acknowledgement')
                        if not dropping:
                            client.sendall(frame)
                        elif frame[:1] == b'Z':
                            self.events.append('server ReadyForQuery received; connection dropped')
                            client.shutdown(socket.SHUT_RDWR)
                            server.shutdown(socket.SHUT_RDWR)
                            return
        except Exception as exc:
            self.error = str(exc)
        finally:
            self.listener.close()


with tempfile.TemporaryDirectory(prefix='medveda-qp-executor-') as tmp:
    temp = Path(tmp)
    env.update(HOME=str(temp / 'home'), PGHOST=str(temp), PGPORT=str(free_port()),
               PGUSER='postgres', PGDATABASE='postgres', PGAPPNAME='qp-observer')
    Path(env['HOME']).mkdir()
    package_files = sorted(str(p.relative_to(PACKAGE)) for p in PACKAGE.rglob('*') if p.is_file())
    assert package_files == ['supabase/config.toml', f'supabase/migrations/{MIGRATION}']
    artifact = PACKAGE / 'supabase/migrations' / MIGRATION
    assert hashlib.sha256(artifact.read_bytes()).hexdigest() == EXPECTED
    assert artifact.read_bytes() == (ROOT / 'supabase/migrations' / MIGRATION).read_bytes()
    cli_version = command([CLI, '--version'])
    assert cli_version.returncode == 0 and cli_version.stdout.splitlines()[0] == '2.75.0', cli_version.stdout
    binary_sha = hashlib.sha256(CLI.read_bytes()).hexdigest()
    assert binary_sha == CLI_SHA, f'Unexpected CLI binary: {binary_sha}'
    results['executor'] = {'version': '2.75.0', 'binary_sha256': binary_sha,
                           'postgres': command([PG / 'postgres', '--version']).stdout.strip()}
    results['artifact'] = {'sha256': EXPECTED, 'files': package_files}
    work = temp / 'work'
    shutil.copytree(PACKAGE, work)
    port = int(env['PGPORT'])

    def sql(query, database='postgres', check=True):
        p = command([PG / 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-d', database, '-c', query])
        if check and p.returncode:
            raise RuntimeError(p.stdout)
        return p.stdout.strip()

    def executor(database, proxy_port=None, include_all=False, asynchronous=False):
        # Hardcoded literal loopback; never derives target from repository config or env.
        # CLI ConnectByConfig reconstructs URLs without sslmode. Match its local
        # host/port detection to select the supported non-TLS local connector.
        config = (PACKAGE / 'supabase/config.toml').read_text()
        (work / 'supabase/config.toml').write_text(config.replace('[db]', f'[db]\nport = {proxy_port or port}'))
        url = f'postgresql://postgres@127.0.0.1:{proxy_port or port}/{database}?sslmode=disable'
        args = [str(CLI), 'migration', 'up', '--db-url', url, '--workdir', str(work), '--yes']
        if include_all:
            args.append('--include-all')
        if asynchronous:
            return subprocess.Popen(args, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        return command(args, timeout=40)

    def state(database):
        return json.loads(sql("""select json_build_object(
            'papers',to_regclass('public.question_papers') is not null,
            'receipts',to_regclass('public.question_paper_validated_objects') is not null,
            'bucket',(select count(*) from storage.buckets where id='question-papers'),
            'ledger',(select count(*) from supabase_migrations.schema_migrations where version='20261118172019'),
            'historical',(select count(*) from supabase_migrations.schema_migrations where version<>'20261118172019'))""", database))

    def record(name, p, database, **extra):
        results[name] = {'exit': p.returncode, 'output': p.stdout, 'state': state(database), **extra}
        (HERE / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
        print(name, json.dumps({k: v for k, v in results[name].items() if k != 'output'}), flush=True)

    def wait_and_terminate(database, marker):
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            pid = sql(f"select pid from pg_stat_activity where datname='{database}' and pid<>pg_backend_pid() and wait_event='PgSleep' and query like '%{marker}%' limit 1")
            if pid:
                assert sql(f'select pg_terminate_backend({int(pid)})') == 't'
                return
            time.sleep(0.05)
        raise RuntimeError('Fault barrier not reached')

    started = False
    try:
        p = command([PG / 'initdb', '-D', temp / 'data', '--auth=trust', '--no-locale', '-U', 'postgres'])
        assert p.returncode == 0, p.stdout
        p = command([PG / 'pg_ctl', '-D', temp / 'data', '-l', temp / 'server.log', '-o',
                     f'-k {temp} -p {port} -h 127.0.0.1', '-w', 'start'])
        assert p.returncode == 0, p.stdout
        started = True
        # Minimal synthetic prerequisites only; no historical migration SQL or seeds.
        stub = ROOT / 'supabase/tests/support/supabase_stub.sql'
        p = command([PG / 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-f', stub])
        assert p.returncode == 0, p.stdout
        sql("""create table public.courses(id text primary key, active boolean);
            create table public.years(id text primary key,course_id text references public.courses,active boolean);
            create table public.subjects(id text primary key,year_id text references public.years,active boolean);
            create function public.am_i_admin() returns boolean language sql stable as $$select false$$;
            create schema supabase_migrations;
            create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);
            create table public.payment_preservation_sentinel(id integer primary key,value text);
            insert into public.payment_preservation_sentinel values(1,'unchanged');""")

        def fresh(name):
            sql(f'create database {name} template postgres')

        # Catalog fingerprint excludes only named module additions and ledger schema.
        fingerprint = """select jsonb_build_object(
          'columns',(select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage') and c.relname not like 'question_paper%' and a.attnum>0),
          'relations',(select jsonb_agg(jsonb_build_array(c.oid,c.relname,c.relkind,c.relacl,c.relrowsecurity,c.relforcerowsecurity,c.reloptions) order by c.oid) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage') and c.relname not like 'question_paper%'),
          'functions',(select jsonb_agg(jsonb_build_array(p.oid,pg_get_functiondef(p.oid),p.proacl) order by p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth','storage') and p.proname not like 'question_paper%'),
          'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where policyname not like 'question_paper%'),
          'buckets',(select jsonb_agg(to_jsonb(b) order by id) from storage.buckets b where id<>'question-papers'),
          'payments',(select jsonb_agg(to_jsonb(s)) from public.payment_preservation_sentinel s))::text"""
        fresh('qp_success')
        before = sql(fingerprint, 'qp_success')
        p = executor('qp_success')
        record('success', p, 'qp_success')
        assert p.returncode == 0 and state('qp_success')['ledger'] == 1
        assert before == sql(fingerprint, 'qp_success')
        results['preservation'] = {'existing_fixture_catalog_and_data_identical': True,
            'fingerprint_sha256': hashlib.sha256(before.encode()).hexdigest()}
        ledger = json.loads(sql("select row_to_json(s) from supabase_migrations.schema_migrations s", 'qp_success'))
        assert ledger['version'] == VERSION and ledger['name'] == 'question_papers'
        assert ledger['statements'][0].lower().endswith('begin')
        assert ledger['statements'][-1].lower() == 'commit'
        results['ledger'] = {'version': ledger['version'], 'name': ledger['name'],
                             'statement_count': len(ledger['statements']),
                             'first_statement': ledger['statements'][0], 'last_statement': ledger['statements'][-1]}
        p = executor('qp_success')
        record('repeat', p, 'qp_success')
        assert p.returncode == 0 and state('qp_success')['ledger'] == 1

        fresh('qp_sql_failure')
        sql("insert into storage.buckets(id,name) values('question-papers','collision')", 'qp_sql_failure')
        p = executor('qp_sql_failure')
        record('sql_failure', p, 'qp_sql_failure')
        assert p.returncode != 0 and not state('qp_sql_failure')['papers'] and state('qp_sql_failure')['ledger'] == 0

        fresh('qp_ledger_failure')
        sql("""create function public.fail_ledger() returns trigger language plpgsql as $$begin raise exception 'injected ledger failure'; end$$;
          create trigger fail_ledger before insert on supabase_migrations.schema_migrations for each row execute function public.fail_ledger()""", 'qp_ledger_failure')
        p = executor('qp_ledger_failure')
        record('ledger_failure', p, 'qp_ledger_failure')
        assert p.returncode != 0 and state('qp_ledger_failure')['papers'] and state('qp_ledger_failure')['ledger'] == 0
        sql('drop trigger fail_ledger on supabase_migrations.schema_migrations', 'qp_ledger_failure')
        p = executor('qp_ledger_failure')
        record('retry_after_ledger_failure', p, 'qp_ledger_failure')
        assert p.returncode != 0 and state('qp_ledger_failure')['ledger'] == 0

        fresh('qp_precommit_loss')
        sql("""create function public.pause_ddl() returns event_trigger language plpgsql as $$begin perform pg_sleep(30); end$$;
          create event trigger pause_ddl on ddl_command_end when tag in ('CREATE POLICY') execute function public.pause_ddl()""", 'qp_precommit_loss')
        proc = executor('qp_precommit_loss', asynchronous=True)
        wait_and_terminate('qp_precommit_loss', 'question_papers_admin')
        output, _ = proc.communicate(timeout=15)
        p = subprocess.CompletedProcess([], proc.returncode, output)
        record('connection_loss_before_commit', p, 'qp_precommit_loss')
        assert p.returncode != 0 and not state('qp_precommit_loss')['papers'] and state('qp_precommit_loss')['ledger'] == 0

        fresh('qp_postcommit_loss')
        sql("""create function public.pause_ledger() returns trigger language plpgsql as $$begin perform pg_sleep(30); return new; end$$;
          create trigger pause_ledger before insert on supabase_migrations.schema_migrations for each row execute function public.pause_ledger()""", 'qp_postcommit_loss')
        proc = executor('qp_postcommit_loss', asynchronous=True)
        wait_and_terminate('qp_postcommit_loss', 'INSERT INTO supabase_migrations')
        output, _ = proc.communicate(timeout=15)
        p = subprocess.CompletedProcess([], proc.returncode, output)
        record('connection_loss_after_sql_commit', p, 'qp_postcommit_loss')
        assert p.returncode != 0 and state('qp_postcommit_loss')['papers'] and state('qp_postcommit_loss')['ledger'] == 0

        fresh('qp_ack_loss')
        proxy = LostAcknowledgement(port)
        p = executor('qp_ack_loss', proxy_port=proxy.port)
        proxy.thread.join(timeout=5)
        record('committed_but_acknowledgement_lost', p, 'qp_ack_loss', proxy_events=proxy.events, proxy_error=proxy.error)
        assert p.returncode != 0 and state('qp_ack_loss')['papers'] and state('qp_ack_loss')['ledger'] == 1
        assert proxy.error is None and len(proxy.events) == 2
        p = executor('qp_ack_loss')
        record('repeat_after_ack_loss', p, 'qp_ack_loss')
        assert p.returncode == 0 and state('qp_ack_loss')['ledger'] == 1

        fresh('qp_history')
        history = json.loads((HERE.parent / 'production-preflight-applied-migrations-20261119.json').read_text())['migrations']
        assert len(history) == 85
        for item in history:
            assert item['version'].isdigit()
            name = item['name'].replace("'", "''")
            sql(f"insert into supabase_migrations.schema_migrations(version,name) values('{item['version']}','{name}')", 'qp_history')
        before_history = sql('select jsonb_agg(to_jsonb(s) order by version) from supabase_migrations.schema_migrations s', 'qp_history')
        for include in [False, True]:
            p = executor('qp_history', include_all=include)
            record('existing_history_include_all' if include else 'existing_history', p, 'qp_history')
            assert p.returncode != 0 and not state('qp_history')['papers']
            assert before_history == sql('select jsonb_agg(to_jsonb(s) order by version) from supabase_migrations.schema_migrations s', 'qp_history')
        results['all_assertions_passed'] = True
    finally:
        if started:
            p = command([PG / 'pg_ctl', '-D', temp / 'data', '-m', 'immediate', '-w', 'stop'])
            results['local_cluster_stopped'] = p.returncode == 0
        (HERE / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
