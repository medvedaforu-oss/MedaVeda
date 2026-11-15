from pathlib import Path
import subprocess,json
root=Path('/home/ganeshp8545/AyurPulse');out=Path(__file__).resolve().parent
paths=['supabase/tests/'+x+'.cjs' for x in ['mv004-recovery-selftest','mv005-create-order-selftest','mv006-restoration-selftest','razorpay-security-selftest','recovery-selftest','settle-timestamp-selftest']]
paths+=['mobile-app/scripts/'+x+'.cjs' for x in ['mv004-recovery-selftest','mv007-billing-boundary-selftest','mv008-ownership-selftest','mv009-store-selftest','mv010-options-selftest','mv011-accessibility-selftest','mv012-history-selftest','release-payments-disabled-selftest','payment-routing-selftest','payment-provider-selftest','payment-request-selftest','payment-poll-selftest','payment-verdict-selftest','checkout-security-selftest','notes-entitlement-selftest','notes-open-selftest','purchases-selftest','purchases-unavailable-ui-selftest','razorpay-internal-test-selftest']]
results=[]
for path in paths:
 r=subprocess.run(['node',path],cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 log=path.replace('/','_')+'.log';(out/log).write_text(r.stdout)
 results.append({'command':['node',path],'exit_code':r.returncode,'log':log})
r=subprocess.run(['node','mobile-app/node_modules/typescript/bin/tsc','--noEmit','-p','mobile-app/tsconfig.json'],cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
(out/'mobile-typescript.log').write_text(r.stdout);results.append({'command':'mobile TypeScript','exit_code':r.returncode,'log':'mobile-typescript.log'})
(out/'regression-results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'checks':len(results),'failed':[x for x in results if x['exit_code']]}))
