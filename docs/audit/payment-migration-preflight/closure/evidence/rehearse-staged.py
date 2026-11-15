"""Additional exact A/C/D sequence, D locking/interruption and role probes."""
from pathlib import Path
import os, subprocess, uuid, json, time, hashlib
R=Path('/home/ganeshp8545/AyurPulse'); O=Path(__file__).resolve().parent
P=R/'supabase/releases/p0-critical-20261111_131014'
assert os.environ.get('PGHOST')=='/tmp/medveda-payment-preflight-pg/socket'
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
    apply('/home/ganeshp8545/AyurPulse/docs/audit/p0-closure-20261111_134419/evidence/atomic/production-sync-phone-fixture.sql');apply(R/'supabase/tests/support/seed.sql');count(66)
    sql(settings('phase_a_owner_approval')+(P/'sql/01-phase-a.sql').read_text());count(69)
    c=(P/'sql/03-phase-c-atomic-compatible.sql').read_text()
    cgates=settings('c_owner_approval recovery_evidence window_approval phase_b_verified quiescence_evidence drift_approval')
    pre=schema(); predata=rows()
    r=sql(c,False); assert r.returncode and 'missing independently signed' in r.stderr
    assert schema()==pre and rows()==predata
    ok('C missing approvals refused with no state change')
    prefix=c[:c.index('INSERT INTO supabase_migrations')]
    p=interactive(cgates+prefix)
    try:
        count(69)
        assert sql("select to_regclass('public.notes_choice_checkouts') is null").stdout.strip()=='t'
    finally:stop(p)
    for _ in range(100):
        if schema()==pre:break
        time.sleep(.02)
    assert schema()==pre and rows()==predata
    ok('C interrupted after first DDL/function replacements: observer sees pre-state; disconnect rolls back')
    # Inject a failing postcheck immediately before commit, after all source/ledger work.
    r=sql(cgates+c.replace('COMMIT;',"select 1/0;\nCOMMIT;"),False)
    assert r.returncode and 'division by zero' in r.stderr
    assert schema()==pre and rows()==predata
    ok('C last postcheck failure rolls back all four migrations, definitions, ACLs and source records')
    sql(cgates+c);count(73)
    before_c_retry=schema();r=sql(cgates+c,False)
    assert r.returncode and 'version-set mismatch' in r.stderr
    assert schema()==before_c_retry
    ok('C known-success retry refused unchanged')
    for name in ['notes-choice-checkout','billing-settlement-recovery','phase-c-contracts','phase-c-play-duplicates']:
        apply(R/f'supabase/tests/{name}.sql')
        ok('C SQL acceptance '+name)
    for source in sorted((P/'sql/sources').glob('*.sql')):
        version=source.name.split('_')[0]
        if version=='20261111120000':continue
        assert sql('select statements=ARRAY['+lit(source.read_text())+'] from supabase_migrations.schema_migrations where version='+lit(version)).stdout.strip()=='t'
    ok('all seven A/C ledger source arrays equal exact original sources')
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
    deps=json.loads((Path('/home/ganeshp8545/AyurPulse/docs/audit/p0-closure-20261111_134419/evidence/independent-integrity.json')).read_text())['dependencies']
    for name,f in deps.items():
        for rpc in f['rpcs']:assert sql('select exists(select 1 from pg_proc where pronamespace=\'public\'::regnamespace and proname='+lit(rpc)+')').stdout.strip()=='t',(name,rpc)
        for table in f['tables']:assert sql('select to_regclass('+lit('public.'+table)+') is not null').stdout.strip()=='t',(name,table)
    ok('all independently extracted frozen-archive literal RPC/relation dependencies exist at exact 74 ledger')
    after=schema();r=sql(gates+d,False);assert r.returncode and 'exact 73-version' in r.stderr;assert schema()==after
    ok('D post-success retry refused unchanged; no ledger premarking or blind replay')
    apply(R/'supabase/tests/p0-classified-reversal.sql')
    ok('D classified reversal SQL regression')
    inventory=json.loads(sql((O/'schema-queries.sql').read_text()).stdout)
    (O/'schema-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
    apply(R/'docs/audit/payment-migration-preflight/closure/LIVE_DRIFT_READONLY.sql')
    ok('prepared drift collector executes successfully in READ ONLY transaction on synthetic PostgreSQL 17')
    # Full synthetic database dump/restore mechanics only; roles already exist in this cluster.
    restore=db+'_restore';dump=Path('/tmp/medveda-payment-preflight-pg/synthetic.dump')
    start=time.monotonic()
    subprocess.run(['/usr/lib/postgresql/17/bin/pg_dump','-Fc','-f',str(dump),db],env=E,check=True,capture_output=True)
    subprocess.run(['createdb',restore],env=E,check=True)
    try:
        subprocess.run(['/usr/lib/postgresql/17/bin/pg_restore','--exit-on-error','-d',restore,str(dump)],env=E,check=True,capture_output=True)
        restored_env={**E,'PGDATABASE':restore}
        def restored(q):
            return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',q],env=restored_env,text=True)
        restored_inventory=json.loads(restored((O/'schema-queries.sql').read_text()))
        (O/'synthetic-restored-schema.json').write_text(json.dumps(restored_inventory,indent=2)+'\n')
        assert restored_inventory==inventory
        for namespace in ['public','auth','storage']:
            tables=json.loads(sql("select json_agg(tablename order by tablename) from pg_tables where schemaname="+lit(namespace)).stdout)
            for table in tables:
                query='select md5(coalesce(string_agg(to_jsonb(r)::text,\'\' order by to_jsonb(r)::text),\'\')) from '+namespace+'."'+table+'" r'
                assert restored(query)==sql(query).stdout,(namespace,table)
        result={'scope':'synthetic PostgreSQL database including stub Auth/Storage metadata; same-cluster roles; no object bytes or managed services',
          'dump_sha256':hashlib.sha256(dump.read_bytes()).hexdigest(),'bytes':dump.stat().st_size,
          'elapsed_seconds':round(time.monotonic()-start,3),'schema_and_all_public_auth_storage_table_fingerprints_equal':True,
          'production_RPO_RTO_proven':False}
        (O/'synthetic-restore.json').write_text(json.dumps(result,indent=2)+'\n')
        ok('synthetic dump/restore: schema/security/ledger and all public/Auth-stub/Storage-metadata row fingerprints match; managed restore still unverified')
    finally:
        subprocess.run(['dropdb',restore],env=E,check=True)

finally:
    (O/'independent-rehearsal-results.json').write_text(json.dumps(results,indent=2)+'\n')
    subprocess.run(['dropdb',db],env=E,check=True)
