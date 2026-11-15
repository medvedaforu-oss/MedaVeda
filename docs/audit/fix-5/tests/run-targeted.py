#!/usr/bin/env python3
"""Fresh disposable local databases; never connects to a hosted system."""
import os,subprocess,json,re
from pathlib import Path
root=Path(__file__).resolve().parents[4]
assert os.environ.get('PGHOST','').startswith('/tmp/'),'local socket required'
out=root/'docs/audit/fix-5/after'; db='fix5_target_'+str(os.getpid());results={}
def command(name,args,extra=None):
 with (out/(name+'.log')).open('w') as f:
  r=subprocess.run(args,cwd=root,env=dict(os.environ,**(extra or {})),stdout=f,stderr=subprocess.STDOUT)
  f.write('\nEXIT '+str(r.returncode)+'\n')
 results[name]=r.returncode
 (out/'target-results.json').write_text(json.dumps({'database':db,'results':results},indent=2)+'\n')
 print(name,'exit='+str(r.returncode),flush=True)
 return r.returncode
def psql(database):return ['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',database]
def build(database,legacy=False):
 script='create database '+database+';'
 assert subprocess.run(psql('postgres')+['-c',script],check=True).returncode==0
 files=[root/'supabase/tests/support/supabase_stub.sql']
 files+= [p for p in sorted((root/'supabase/migrations').glob('*.sql')) if re.match(r'^\d{8,14}_',p.name) and not (legacy and 'fix5_' in p.name)]
 files+=[root/'supabase/tests/support/seed.sql']
 with (out/(database+'-build.log')).open('w') as f:
  for p in files:
   subprocess.run(psql(database)+['-f',str(p)],stdout=f,stderr=subprocess.STDOUT,check=True)
build(db)
names=['BACK-11','BACK-11-partial','BACK-13','WR-01','WR-02','WR-06','WR-07','FIFO','refund-before-expiry','refund-after-expiry','no-expiry-and-deletion','security-and-conservation','expiry-security','provider-clawback','provider-clawback-reverse-tie','provider-zero-replay','expiry-boundaries','get-wallet-expiry','DB-NULL']
for n in names:command(n,psql(db)+['-f','docs/audit/fix-5/tests/'+n+'.sql'])
# WR-03.sql deliberately retains the incompatible raw-zero acceptance probe.
# It is not silently changed: unchanged K4 requires rejection, verified by DB-NULL.sql.
for n in ['BACK-11','BACK-13','backend','MOB-17','ADM-03','ADM-08','BACK-08']:
 command('fix4-'+n,psql(db)+['-f','docs/audit/fix-4/tests/'+n+'.sql'])
for name,script,args in [
 ('WR-05','concurrency.py',['reciprocal']),('concurrency','concurrency.py',['expiry']),
 ('deletion-concurrency','deletion-concurrency.py',[]),('new-credit-concurrency','new-credit-concurrency.py',[]),
 ('held-release-expiry','held-release-expiry.py',[])]:
 command(name,['python3','docs/audit/fix-5/tests/'+script,*args],{'TEMPLATE_DB':db})
legacy=db+'_legacy';build(legacy,True)
command('legacy-before',psql(legacy)+['-f','docs/audit/fix-5/tests/legacy-before.sql'])
command('legacy-migration',psql(legacy)+['-f','supabase/migrations/20261114090000_fix5_wallet_expiry_facts.sql'])
command('legacy-backfill',psql(legacy)+['-f','docs/audit/fix-5/tests/legacy-after.sql'])
raise SystemExit(any(results.values()))
