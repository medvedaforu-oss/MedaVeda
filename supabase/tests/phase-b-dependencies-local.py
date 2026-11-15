"""Compare reachable SQL definitions with fresh read-only production hashes.
Requires a /tmp socket and a disposable database. Never opens hosted connections.
"""
from pathlib import Path
import os,subprocess,json,hashlib,re
assert os.environ.get('PGHOST','').startswith('/tmp/')
assert re.fullmatch('mv003_[0-9a-f]+',os.environ.get('PGDATABASE',''))
r=Path(__file__).resolve().parents[2];e=r/'docs/audit/evidence/phase-b-20261111'
prod=json.loads((e/'production-readonly.json').read_text())['database']
q="select json_agg(json_build_object('name',proname,'args',pg_get_function_identity_arguments(oid),'definition',pg_get_functiondef(oid))) from pg_proc where pronamespace='public'::regnamespace"
local=json.loads(subprocess.check_output(['psql','-XqAt','-v','ON_ERROR_STOP=1','-c',q],text=True))
names={f['name'] for f in local};byname={f['name']:f for f in local}
roots=['create_priced_order','settle_razorpay_payment','handle_payment_refund','handle_payment_dispute','record_payment_capture','record_provider_event','rate_limit_hit','razorpay_entitlement_committed','guard_razorpay_order_transition','guard_purchase_success_ownership','user_can_access_note']
# Include triggers only on relations written by the reachable SQL/handlers.
# Auth signup/profile maintenance is a fixture concern, not a payment write path.
triggerq="select json_agg(json_build_object('table',c.relname,'function',p.proname)) from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and p.pronamespace='public'::regnamespace"
triggers=json.loads(subprocess.check_output(['psql','-XqAt','-c',triggerq],text=True))
handler_writes=['orders','payment_captures','payment_compensations','provider_events']
roots += [t['function'] for t in triggers if t['table'] in handler_writes]
pending=list(roots);seen={};mismatches=[]
while pending:
 name=pending.pop()
 if name in seen:continue
 assert name in byname,name
 f=byname[name]
 # Remove comments and literal strings before finding executable calls. A
 # comment mentioning delete_my_account() must not become a payment dependency.
 code=re.sub(r"'(?:''|[^'])*'|--[^\n]*|/\*.*?\*/",' ',f['definition'],flags=re.S)
 deps=sorted(n for n in names if n!=name and re.search(r'(?<![\w])'+re.escape(n)+r'\s*\(',code))
 writes=re.findall(r'\b(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?([a-z_][a-z_0-9]*)',code,re.I)
 deps=sorted(set(deps+[t['function'] for t in triggers if t['table'] in writes and t['function']!=name]))
 digest=hashlib.sha256(f['definition'].strip().encode()).hexdigest()
 prior=[p for p in prod['rpcs'] if p['name']==name and p['args']==f['args']]
 phasea=name in ['razorpay_entitlement_committed','guard_razorpay_order_transition','guard_purchase_success_ownership']
 assert phasea or len(prior)==1,(name,'missing baseline signature')

 if not phasea and prior[0]['definition_sha256']!=digest:mismatches.append(name)
 seen[name]={'args':f['args'],'definition_sha256':digest,'origin':'Phase A' if phasea else 'production baseline','calls':deps}
 pending+=deps
(e/'sql-dependency-closure.json').write_text(json.dumps(seen,indent=2)+'\n')
assert not mismatches, ('production/local definition mismatches',mismatches)
print(f'PASS {len(seen)} reachable SQL/trigger/reader definitions match production baseline plus exactly Phase A')
