"""Build only a named LOCAL disposable fixture using the current migrations."""
import os,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[4]
assert os.environ.get('PGHOST','').startswith('/tmp/medveda-fix3-')
assert os.environ.get('PGPORT')=='55433'
db=sys.argv[1];assert db.startswith('fix3_') and db.replace('_','').isalnum()
def sql(*args,database=db,**kw):return subprocess.run(['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',database,*args],check=True,cwd=root,**kw)
sql('-c',f'DROP DATABASE IF EXISTS {db}',database='postgres');sql('-c',f'CREATE DATABASE {db}',database='postgres')
sql('-f','supabase/tests/support/supabase_stub.sql',stdout=subprocess.DEVNULL)
for p in sorted((root/'supabase/migrations').glob('*.sql')):sql('-f',str(p),stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
sql('-f','supabase/tests/support/seed.sql',stdout=subprocess.DEVNULL)
print('PASS disposable database built '+db,flush=True)
if len(sys.argv)>2:sql('-f',sys.argv[2])
