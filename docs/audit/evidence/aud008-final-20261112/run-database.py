"""Disposable local PostgreSQL only; no production credentials or hosted clients."""
import os,pathlib,subprocess,tempfile,json
root=pathlib.Path(__file__).resolve().parents[4];out=pathlib.Path(__file__).resolve().parent;binary='/usr/lib/postgresql/17/bin/'
env={k:os.environ[k] for k in ('PATH','HOME','DENO_DIR','LANG') if k in os.environ}
with tempfile.TemporaryDirectory(prefix='aud008-pg-') as work:
 env.update(PGHOST=work,PGPORT='55464',PGUSER='postgres',EXPO_NO_DOTENV='1',CI='1')
 with (out/'database-bootstrap.log').open('w') as log:
  subprocess.run([binary+'initdb','-D',work+'/data','-U','postgres','-A','trust','--no-locale'],env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
  subprocess.run([binary+'pg_ctl','-D',work+'/data','-l',work+'/server.log','-o',f'-F -k {work} -p 55464 -c listen_addresses=','-w','start'],env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
 try:
  with (out/'database-full.log').open('w') as log:
   result=subprocess.run(['bash','supabase/tests/run-all.sh'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
  (out/'database-result.json').write_text(json.dumps({'command':'bash supabase/tests/run-all.sh','cluster':'fresh disposable local PostgreSQL 17, Unix socket only','exit':result.returncode},indent=2))
 finally:subprocess.run([binary+'pg_ctl','-D',work+'/data','-m','immediate','-w','stop'],env=env,check=True)
 raise SystemExit(result.returncode)
