#!/usr/bin/env python3
"""Disposable PG17.12 original/candidate SQL comparison. No external target accepted."""
import hashlib,json,os,re,subprocess,tempfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
PG=Path('/usr/lib/postgresql/17/bin')
# Exactly the 40 SQL suites and ordering used by the existing run-all.sh.
source=(ROOT/'supabase/tests/run-all.sh').read_text()
groups=re.findall(r'for s in (.*?); do',source,re.S)
assert len(groups)==3
suites=[g.replace('\\\n',' ').split() for g in groups]
assert sum(map(len,suites))==40
results={}
with tempfile.TemporaryDirectory(prefix='qp-executor-regressions-') as directory:
 d=Path(directory)
 env={'PATH':os.environ['PATH'],'LANG':'C.UTF-8','PGHOST':str(d),'PGPORT':'55479','PGUSER':'postgres','PGDATABASE':'postgres'}
 def cmd(args,check=True,**kw):
  p=subprocess.run([str(x) for x in args],env=env,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,**kw)
  if check and p.returncode:raise RuntimeError(p.stdout[-10000:])
  return p
 def sql(query,db='postgres'):
  return cmd([PG/'psql','-XAt','-v','ON_ERROR_STOP=1','-d',db,'-c',query]).stdout.strip()
 def apply(path,db):
  return cmd([PG/'psql','-Xq','-v','ON_ERROR_STOP=1','-d',db,'-f',path]).stdout
 started=False
 try:
  cmd([PG/'initdb','-D',d/'data','--auth=trust','--no-locale','-U','postgres'])
  cmd([PG/'pg_ctl','-D',d/'data','-l',d/'server.log','-o',f"-k {d} -p 55479 -h ''",'-w','start']);started=True
  assert sql('show server_version').startswith('17.12')
  sql('create database qp_base')
  apply(ROOT/'supabase/tests/support/supabase_stub.sql','qp_base')
  historical={}
  for p in sorted((ROOT/'supabase/migrations').glob('*.sql')):
   if p.name[:8].isdigit() and not p.name.endswith('_question_papers.sql'):
    historical[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
    apply(p,'qp_base')
  assert len(historical)==85
  # This is test-fixture construction only, outside the migration executor.
  # The executor rehearsal never executes historical SQL.
  results['fixture']={'postgres':sql('show server_version'),'historical_sql_sha256':historical}
  fingerprint="""select jsonb_build_object(
   'tables',(select jsonb_agg(jsonb_build_array(c.oid,c.relname,c.relacl,c.relrowsecurity,c.relforcerowsecurity,c.reloptions,(select jsonb_agg(to_jsonb(a) order by attnum) from pg_attribute a where a.attrelid=c.oid)) order by c.oid) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage') and c.relkind in ('r','v') and c.relname not like 'question_paper%'),
   'functions',(select jsonb_agg(jsonb_build_array(p.oid,pg_get_functiondef(p.oid),p.proacl) order by p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth','storage') and p.proname not like 'question_paper%'),
   'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where policyname not like 'question_paper%'),
   'buckets',(select jsonb_agg(to_jsonb(b) order by id) from storage.buckets b where id<>'question-papers'))::text"""
  before=sql(fingerprint,'qp_base')
  for mode in ['original','candidate']:
   db='qp_'+mode;sql(f'create database {db} template qp_base')
   raw=(HERE/'original.sql').read_bytes()
   if mode=='candidate':
    raw=raw.replace(b'begin;\n',b'',1)[:-len(b'commit;\n')]
    assert raw == (ROOT/'supabase/migrations/20261118172019_question_papers.sql').read_bytes()
   artifact=d/(mode+'.sql');artifact.write_bytes(raw)
   cmd([PG/'psql','-Xq','-1','-v','ON_ERROR_STOP=1','-d',db,'-f',artifact])
   assert sql(fingerprint,db)==before,'Existing security/schema changed'
   apply(ROOT/'supabase/tests/support/seed.sql',db)
   rows=[]
   for group,names in enumerate(suites):
    for name in names:
     args=[PG/'psql','-XqAt','-d',db]
     if group!=1:args+=['-v','ON_ERROR_STOP=1']
     p=cmd([*args,'-f',ROOT/f'supabase/tests/{name}.sql'],check=False)
     if group==1:
      summary=re.findall(r'(\d+) FAIL, (\d+) PASS',p.stdout)
      ok=p.returncode==0 and bool(summary) and summary[-1][0]=='0' and int(summary[-1][1])>0
     else:ok=p.returncode==0 and not re.search(r'(^|[^A-Za-z])FAIL',p.stdout)
     rows.append({'suite':name,'exit':p.returncode,'pass':ok,'output':p.stdout})
     print(mode, 'PASS' if ok else 'FAIL',name,flush=True)
   # Dedicated QP tests use rollback fixtures, run separately from mutated broad suite.
   clean=db+'_qp';sql(f'create database {clean} template qp_base')
   cmd([PG/'psql','-Xq','-1','-v','ON_ERROR_STOP=1','-d',clean,'-f',artifact])
   apply(ROOT/'supabase/tests/support/seed.sql',clean)
   qp=apply(ROOT/'supabase/tests/question_papers_checks.sql',clean)
   cascade=cmd([PG/'psql','-Xq','-v','ON_ERROR_STOP=1','-v','qp_module=true','-d',clean,'-f',ROOT/'supabase/tests/question_papers_subject_delete_checks.sql']).stdout
   results[mode]={'sha256':hashlib.sha256(raw).hexdigest(),'existing_schema_security_preserved':True,'suites':rows,'passed':sum(r['pass'] for r in rows),'question_papers':qp,'cascade':cascade}
   (HERE/'sql-results.json').write_text(json.dumps(results,indent=2)+'\n')
  a=[(r['suite'],r['exit'],r['pass']) for r in results['original']['suites']]
  b=[(r['suite'],r['exit'],r['pass']) for r in results['candidate']['suites']]
  assert a==b
  results['baseline_candidate_outcomes_identical']=True
 finally:
  if started:results['cluster_stopped']=cmd([PG/'pg_ctl','-D',d/'data','-m','immediate','-w','stop'],check=False).returncode==0
  (HERE/'sql-results.json').write_text(json.dumps(results,indent=2)+'\n')
