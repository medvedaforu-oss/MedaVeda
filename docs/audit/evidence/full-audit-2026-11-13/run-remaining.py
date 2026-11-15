"""Complete interrupted audit checks using local scratch databases and native host tests."""
import importlib.util, pathlib, concurrent.futures
path=pathlib.Path(__file__).with_name('run-checks.py')
spec=importlib.util.spec_from_file_location('audit_checks',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.env.update(PGHOST='/tmp/medveda-audit-sock',PGPORT='55441',PGUSER='postgres')
dbjobs=[('database-local-final','',['bash','supabase/tests/run-all.sh'],1200)]
for name in ['run-mv003-local.py','run-phase-b-local.py','run-phase-c-local.py','run-remaining-audit-local.py']:
    dbjobs.append(('db-'+name,'',['python3','supabase/tests/'+name],900))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
    list(ex.map(m.run,dbjobs))
for f in ['run-host-tests.py','phase1b/run-tests.py','acquisition/run-tests.py','content/run-tests.py']:
    m.run(('vault-final-'+f.replace('/','-'),'',['python3','mobile-app/modules/medveda-offline-vault/tests/'+f],600))
