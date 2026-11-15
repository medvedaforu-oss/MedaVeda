from pathlib import Path
import os,subprocess,json
root=Path(__file__).resolve().parents[4]; out=root/'docs/audit/evidence/b-to-c-atomic-20261111'
mobile='''mv007-billing-boundary mv008-ownership mv009-store mv010-options mv011-accessibility mv012-history accessibility purchases notes-entitlement notes-open list-states search-lazy-hook mv004-recovery payment-request payment-poll payment-verdict checkout-security release-payments-disabled payment-routing razorpay-internal-test notes-billing-choice pdf-lifecycle pdf-remote-retry payment-summary payment-provider purchases-unavailable-ui android-release auth-recovery login-network'''.split()
backend='''phase-c-gates mv006-restoration mv004-recovery mv005-create-order recovery settle-timestamp razorpay-security notes-choice-order billing-recovery-worker play-consumption play-reconcile-fairness compensation-worker play-verification play-order play-payment-worker razorpay-routing'''.split()
commands=[['node',f'mobile-app/scripts/{n}-selftest.cjs'] for n in mobile]+[['node',f'supabase/tests/{n}-selftest.cjs'] for n in backend]
commands += [['node','supabase/tests/google-reporting-selftest.cjs','--production-only'],['node','mobile-app/node_modules/typescript/bin/tsc','--noEmit','-p','mobile-app/tsconfig.json'],['git','diff','--check']]
results=[]
for i,cmd in enumerate(commands):
 p=subprocess.run(cmd,cwd=root,env={'PATH':os.environ['PATH'],'TZ':'UTC'},capture_output=True,text=True,timeout=120)
 log=f'regression-{i:02d}.log';(out/log).write_text(p.stdout+p.stderr)
 results.append({'command':cmd,'exit_code':p.returncode,'log':log});print('PASS' if p.returncode==0 else 'FAIL',' '.join(cmd),flush=True)
(out/'regression-results.json').write_text(json.dumps(results,indent=2)+'\n')
raise SystemExit(any(r['exit_code'] for r in results))
