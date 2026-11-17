"""Build only a disposable local DB; exercise release handlers and actual SQL."""
import os
import pathlib
import subprocess
import uuid
import json

root = pathlib.Path(__file__).resolve().parents[2]
assert os.environ.get("PGHOST", "").startswith("/tmp/") or os.environ.get("PGHOST") in ("127.0.0.1", "localhost"), "explicit local host required"
db = "audit_batch1_" + uuid.uuid4().hex[:12]
env = {k: os.environ[k] for k in ("PATH", "HOME", "PGHOST", "PGPORT", "PGUSER")}
# Retain only explicit libpq authentication settings for the isolated local DB.
# Never inherit unrelated application/payment secrets.
for key in ("PGPASSWORD", "PGPASSFILE"):
    if key in os.environ:
        env[key] = os.environ[key]
env.update(WH_DB=db, PGOPTIONS="-c search_path=public,extensions")
if os.environ.get("AUDIT_BATCH1_ROOT"):
    env["AUDIT_BATCH1_ROOT"] = os.environ["AUDIT_BATCH1_ROOT"]

def run(args, **kw):
    return subprocess.run(args, cwd=root, env=env, check=True, **kw)

def psql(*args, database=db, **kw):
    return run(["psql", "-XqAt", "-v", "ON_ERROR_STOP=1", "-d", database, *args], **kw)

try:
    psql("-c", "create database " + db, database="postgres")
    psql("-f", "supabase/tests/support/supabase_stub.sql", stdout=subprocess.DEVNULL)
    for migration in sorted((root / "supabase/migrations").glob("*.sql")):
        if migration.name.endswith("_audit_batch1_refund_revocation.sql"):
            expected = json.loads((root / "supabase/releases/audit-batch1-20261112/production-contracts.json").read_text())
            for function in expected["functions"]:
                query = "select jsonb_build_object('definition',pg_get_functiondef(p.oid),'acl',p.proacl::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='" + function["name"] + "'"
                actual = json.loads(subprocess.check_output(["psql", "-XqAt", "-d", db, "-c", query], env=env, text=True))
                assert actual["definition"] == function["definition"], "production/local RPC drift: " + function["name"]
                assert actual["acl"] == function["acl"], "production/local ACL drift: " + function["name"]
            print("PASS pre-migration RPC definitions/ACLs match fresh deployed metadata (" + str(len(expected["functions"])) + " functions)", flush=True)
        psql("-f", str(migration), stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    psql("-f", "supabase/tests/support/seed.sql", stdout=subprocess.DEVNULL)
    # A repeat application must not rewrite historical/catalog/financial rows.
    tables = ["orders", "payments", "purchases", "products", "wallet_ledger", "referrals"]
    fingerprint_sql = "select jsonb_build_array(" + ",".join(
        "(select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public." + t + " t)"
        for t in tables) + ")"
    def fingerprint():
        return subprocess.check_output(["psql", "-XqAt", "-d", db, "-c", fingerprint_sql], env=env, text=True)
    before = fingerprint()
    for migration in sorted((root / "supabase/migrations").glob("*_audit_batch1_refund_revocation.sql")):
        psql("-f", str(migration), stdout=subprocess.DEVNULL)
    assert before == fingerprint(), "repeat migration changed financial/catalog rows"
    print("PASS repeat migration preserves financial/catalog rows", flush=True)
    run(["node", "supabase/tests/audit-batch1-selftest.cjs"])
    sql_test = root / "supabase/tests/audit-batch1-refund.sql"
    if sql_test.exists():
        psql("-f", str(sql_test))
finally:
    psql("-c", "drop database if exists " + db, database="postgres")
