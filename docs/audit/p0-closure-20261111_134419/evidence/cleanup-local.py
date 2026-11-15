"""Inspect and stop only this task's synthetic cluster. No data deletion."""
from pathlib import Path
import os,subprocess,json
O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']}
E.update(PGHOST='/tmp/medveda-closure-pg/socket',PGPORT='55492',PGUSER='postgres')
query="select json_build_object('tcp_listen_addresses',current_setting('listen_addresses'),'scratch_databases',(select coalesce(json_agg(datname),'[]') from pg_database where datname like 'mv003_%' or datname like 'ap_%'),'active_other_clients',(select count(*) from pg_stat_activity where backend_type='client backend' and pid<>pg_backend_pid()))"
p=subprocess.run(['psql','-XAt','-d','postgres','-c',query],env=E,text=True,capture_output=True,check=True)
state=json.loads(p.stdout)
assert state['tcp_listen_addresses']=='' and state['scratch_databases']==[] and state['active_other_clients']==0,state
cmd=['/usr/lib/postgresql/17/bin/pg_ctl','-D','/tmp/medveda-closure-pg/data','-m','fast','stop']
r=subprocess.run(cmd,env=E,text=True,capture_output=True,check=True)
state.update(shutdown_command=cmd,shutdown_exit=r.returncode,shutdown_output=r.stdout+r.stderr,
             production_access=False,synthetic_cluster_retained_stopped=True)
(O/'local-database-cleanup.json').write_text(json.dumps(state,indent=2)+'\n')
print('PASS task synthetic cluster had no remaining scratch databases/clients and is stopped')
