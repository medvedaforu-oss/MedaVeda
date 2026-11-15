from pathlib import Path
import subprocess,os,json
out=Path(Path('/tmp/medveda-current-audit').read_text())/'evidence';env={'PATH':os.environ['PATH'],'PGHOST':'/tmp','PGPORT':'55489','PGUSER':'postgres'}
p=subprocess.run(['psql','-XAt','-d','postgres','-c',"select datname from pg_database where not datistemplate and datname <> 'postgres' order by datname"],env=env,text=True,capture_output=True)
(out/'scratch-databases-after.txt').write_text(p.stdout+p.stderr);print('database inventory exit',p.returncode,'scratch count',len(p.stdout.splitlines()))
assert p.returncode==0 and p.stdout.splitlines()==['ap_wh'],'Unexpected disposable databases remain; inspect before shutdown'
# This freshly initialized isolated cluster's ap_wh is created by webhook-harness/run.sh.
drop=subprocess.run(['psql','-XAt','-d','postgres','-c','drop database ap_wh'],env=env,text=True,capture_output=True)
assert drop.returncode==0,drop.stderr
check=subprocess.run(['psql','-XAt','-d','postgres','-c',"select datname from pg_database where not datistemplate and datname <> 'postgres'"],env=env,text=True,capture_output=True)
(out/'scratch-databases-after-cleanup.txt').write_text(check.stdout+check.stderr)
assert check.returncode==0 and not check.stdout.strip()
print('removed only local webhook fixture; scratch count 0')
p=subprocess.run(['/usr/lib/postgresql/17/bin/pg_ctl','-D','/tmp/medveda-full-audit-pg/data','stop','-m','fast'],text=True,capture_output=True)
(out/'cluster-stop.log').write_text(p.stdout+p.stderr);print('cluster stop',p.returncode)
