"""Additional exact A/C/D sequence, D locking/interruption and role probes."""
from pathlib import Path
import os, subprocess, uuid, json, time
R=Path('/home/ganeshp8545/AyurPulse'); O=Path(__file__).resolve().parent
P=R/'supabase/releases/p0-critical-20261111_131014'
assert os.environ.get('PGHOST')=='/tmp/medveda-closure-pg/socket'
E={k:os.environ[k] for k in ['PATH','PGHOST','PGPORT','PGUSER']}
db='mv003_'+uuid.uuid4().hex[:12]; E.update(PGDATABASE=db,PGOPTIONS='-c search_path=public,extensions')
def sql(q,check=True):
    p=subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True,env=E,cwd=R)
    if check and p.returncode: raise RuntimeError(p.stdout+p.stderr)
    return p
def apply(p):
    # Preserve byte-exact CRLF inside historical dollar-quoted function bodies.
    return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-f',str(p)],
                          text=True,capture_output=True,env=E,cwd=R,check=True)
lit=lambda s:"'"+s.replace("'","''")+"'"
results=[]
def ok(s): results.append(s); print('PASS '+s,flush=True)
def count(n): assert sql('select count(*) from supabase_migrations.schema_migrations').stdout.strip()==str(n)
def settings(keys): return ''.join('set medveda.'+k+"='SYNTHETIC_ONLY';\n" for k in keys.split())
def schema():
    return sql("select jsonb_build_object('routines',(select jsonb_agg(jsonb_build_array(oid,pg_get_functiondef(oid),proacl,proconfig,proowner) order by oid) from pg_proc where pronamespace='public'::regnamespace),'policies',(select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p),'relations',(select jsonb_agg(jsonb_build_array(oid,relacl,relrowsecurity,relforcerowsecurity) order by oid) from pg_class where relnamespace='public'::regnamespace),'ledger',(select jsonb_agg(to_jsonb(t) order by version) from supabase_migrations.schema_migrations t))").stdout
def rows():
    tables=json.loads(sql("select json_agg(tablename order by tablename) from pg_tables where schemaname='public'").stdout)
    return {t:sql('select md5(coalesce(string_agg(to_jsonb(r)::text,\'\' order by to_jsonb(r)::text),\'\')) from public."'+t+'" r').stdout for t in tables}
def interactive(q):
    p=subprocess.Popen(['psql','-XqAt','-v','ON_ERROR_STOP=1'],text=True,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=E,cwd=R)
    p.stdin.write(q+'\n\\echo READY\n'); p.stdin.flush()
    while True:
        line=p.stdout.readline()
        if line.strip()=='READY': return p
        if not line and p.poll() is not None: raise RuntimeError(p.stderr.read())
def stop(p): p.kill(); p.communicate(timeout=5)
subprocess.run(['createdb',db],env=E,check=True)
try:
    apply(R/'supabase/tests/support/supabase_stub.sql')
    sql('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text)')
    M=json.loads((R/'docs/audit/production-execution-20261111/manifest.json').read_text())
    for m in sorted((R/'supabase/migrations').glob('*.sql')):
        if m.name.split('_')[0] not in M['baseline_versions']:continue
        apply(m); version,name=m.stem.split('_',1)
        sql('insert into supabase_migrations.schema_migrations values('+lit(version)+',ARRAY['+lit(m.read_text())+'],'+lit(name)+')')
    apply(R/'supabase/tests/support/phase_b_production_normalize_phone.sql')
    apply(O/'atomic/production-sync-phone-fixture.sql');apply(R/'supabase/tests/support/seed.sql');count(66)
    sql(settings('phase_a_owner_approval')+(P/'sql/01-phase-a.sql').read_text());count(69)
    sql(settings('c_owner_approval recovery_evidence window_approval phase_b_verified quiescence_evidence drift_approval')+(P/'sql/03-phase-c-atomic-compatible.sql').read_text());count(73)
    ok('exact frozen A and corrected C wrappers commit 66 -> 69 -> 73')
    gates=settings('p0_review_approval recovery_evidence quiescence_evidence window_approval drift_approval')
    d=(P/'sql/05-p0-forward-proof.sql').read_text();before=schema();data=rows()
    # Competing operator holds the actual ledger lock. D must time out atomically.
    p=interactive('begin;lock table supabase_migrations.schema_migrations in share row exclusive mode;')
    try:
        r=sql(gates+d,False);assert r.returncode and 'lock timeout' in r.stderr,r.stderr
    finally:stop(p)
    assert schema()==before and rows()==data
    ok('D competing ledger lock hits 2s timeout with no schema, ACL, policy, ledger or public-row change')
    # Stop the client after replacement but before ledger insertion and commit.
    prefix=d[:d.index('INSERT INTO supabase_migrations')]
    p=interactive(gates+prefix)
    try:
        count(73)
        assert sql("select md5(prosrc) from pg_proc where oid='public.razorpay_entitlement_committed(text,text)'::regprocedure").stdout.strip()=='49b01fbcc7a5e71bd527366fd342a6e9'
        ok('D uncommitted proof replacement invisible to independent observer; observer retains 73 and C3')
    finally:stop(p)
    for _ in range(100):
        if schema()==before:break
        time.sleep(.02)
    assert schema()==before and rows()==data
    ok('D precommit client termination rolls back function, ACL and ledger; all public rows unchanged')
    policy=sql("select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p").stdout
    relations=sql("select jsonb_agg(jsonb_build_array(oid,relacl,relrowsecurity,relforcerowsecurity) order by oid) from pg_class where relnamespace='public'::regnamespace").stdout
    sql(gates+d);count(74);assert rows()==data
    assert policy==sql("select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p").stdout
    assert relations==sql("select jsonb_agg(jsonb_build_array(oid,relacl,relrowsecurity,relforcerowsecurity) order by oid) from pg_class where relnamespace='public'::regnamespace").stdout
    for role in ['anon','authenticated']:
        r=sql('set role '+role+";select public.razorpay_entitlement_committed('missing','missing')",False)
        assert r.returncode and 'permission denied' in r.stderr
    assert sql("set role service_role;select public.razorpay_entitlement_committed('missing','missing')").stdout.strip()=='f'
    ok('D commit reaches 74, public rows/RLS/policies/relation ACLs unchanged; actual anon/auth execution denied and service-role execution works')
    # Confirm each frozen literal RPC and relation root exists on the final schema.
    deps=json.loads((O/'independent-integrity.json').read_text())['dependencies']
    for name,f in deps.items():
        for rpc in f['rpcs']:assert sql('select exists(select 1 from pg_proc where pronamespace=\'public\'::regnamespace and proname='+lit(rpc)+')').stdout.strip()=='t',(name,rpc)
        for table in f['tables']:assert sql('select to_regclass('+lit('public.'+table)+') is not null').stdout.strip()=='t',(name,table)
    ok('all independently extracted frozen-archive literal RPC/relation dependencies exist at exact 74 ledger')
    after=schema();r=sql(gates+d,False);assert r.returncode and 'exact 73-version' in r.stderr;assert schema()==after
    ok('D post-success retry refused unchanged; no ledger premarking or blind replay')
finally:
    (O/'independent-rehearsal-results.json').write_text(json.dumps(results,indent=2)+'\n')
    subprocess.run(['dropdb',db],env=E,check=True)
