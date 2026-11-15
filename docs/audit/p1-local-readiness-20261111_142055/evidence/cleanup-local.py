import os,subprocess,json
from pathlib import Path
O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']};E.update(PGHOST='/tmp/medveda-p1-pg/socket',PGPORT='55493',PGUSER='postgres')
def q(sql):return subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d','postgres','-c',sql],env=E,text=True).strip()
address=q('show listen_addresses');dbs=q("select datname from pg_database where datname not in ('postgres','template0','template1') order by datname");clients=q("select count(*) from pg_stat_activity where backend_type='client backend' and pid<>pg_backend_pid()")
assert not address;assert clients=='0',clients
initial_dbs=dbs.splitlines()
assert all(name=='ap_wh' for name in initial_dbs),dbs
# run-all's webhook harness creates this fixed synthetic database in this new cluster.
for name in initial_dbs:q('drop database '+name)
dbs=q("select datname from pg_database where datname not in ('postgres','template0','template1') order by datname")
assert not dbs,dbs
cmd=['/usr/lib/postgresql/17/bin/pg_ctl','-D','/tmp/medveda-p1-pg/data','-m','fast','stop']
p=subprocess.run(cmd,env=E,text=True,capture_output=True)
(O/'local-database-cleanup.json').write_text(json.dumps({'tcp_listen_addresses':address,'initial_harness_databases':initial_dbs,'remaining_scratch_databases':dbs.splitlines(),'active_other_clients':int(clients),'shutdown_command':cmd,'exit_code':p.returncode,'output':p.stdout+p.stderr,'scope':'P1 synthetic cluster only; retained stopped under /tmp'},indent=2)+'\n')
print(p.stdout+p.stderr);raise SystemExit(p.returncode)
