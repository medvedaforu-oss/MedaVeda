from pathlib import Path
import re,json
O=Path(__file__).resolve().parent;s=(O/'03-phase-c-atomic-compatible.sql').read_text();out=[];i=0
while i<len(s):
 if s.startswith('--',i):
  j=s.find('\n',i);i=len(s) if j<0 else j;continue
 if s.startswith('/*',i):
  j=s.index('*/',i+2);i=j+2;continue
 if s[i]=="'":
  i+=1
  while i<len(s):
   if s.startswith("''",i):i+=2;continue
   if s[i]=="'":i+=1;break
   i+=1
  out.append(' ');continue
 tag=re.match(r'\$(?:[A-Za-z_]\w*)?\$',s[i:]) if s[i]=='$' else None
 if tag:
  t=tag[0];i=s.index(t,i+len(t))+len(t);out.append(' ');continue
 out.append(s[i]);i+=1
sql=''.join(out)
writes=re.findall(r'^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE|MERGE\s+INTO)\s+([\w.]+)',sql,re.M|re.I)
assert writes==['supabase_migrations.schema_migrations']*4,writes
assert len(re.findall(r'^BEGIN ISOLATION',sql,re.M))==1 and len(re.findall(r'^COMMIT;',sql,re.M))==1
(O/'top-level-dml.json').write_text(json.dumps({'migration_financial_dml':0,'top_level_writes':writes,'outer_transactions':1,'method':'Lex SQL comments/quoted strings/dollar bodies; inspect remaining top-level statements.'},indent=2)+'\n')
print('PASS one outer transaction; zero historical financial DML; four ledger INSERTs')
