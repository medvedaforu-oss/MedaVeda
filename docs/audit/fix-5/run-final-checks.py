#!/usr/bin/env python3
"""Local source checks only. No network/package install/deploy/provider calls."""
from pathlib import Path
import subprocess,json,concurrent.futures
root=Path(__file__).resolve().parents[3]
out=root/'docs/audit/fix-5/after'
checks={
 'mobile-tsc':['node','mobile-app/node_modules/typescript/bin/tsc','-p','mobile-app/tsconfig.json','--noEmit'],
 'mobile-eslint':['node','tooling/node_modules/eslint/bin/eslint.js','mobile-app/App.tsx','mobile-app/src','admin-panel/src'],
 'admin-tsc':['node','admin-panel/node_modules/typescript/bin/tsc','-p','admin-panel/tsconfig.app.json','--noEmit','--incremental','false'],
 'admin-node-tsc':['node','admin-panel/node_modules/typescript/bin/tsc','-p','admin-panel/tsconfig.node.json','--noEmit','--incremental','false'],
 'admin-tests':['npm','test','--prefix','admin-panel'],
 'admin-referral-tests':['node','admin-panel/scripts/batch2-selftest.cjs'],
 'password-recovery':['npm','run','test:password-recovery','--prefix','mobile-app'],
 'website-links':['node','website/scripts/check-links.mjs'],
 'wallet-terms':['node','mobile-app/scripts/wallet-terms-selftest.cjs'],
 'mobile-policy':['node','docs/audit/fix-5/tests/mobile-policy.cjs'],
}
entries=sorted(root.glob('supabase/functions/*/index.ts'))
checks['deno-check']=['deno','check','--cached-only','--config','supabase/deno.json',*[str(p.relative_to(root)) for p in entries],'supabase/workers/validate-note-pdf.ts','supabase/functions/report-external-transaction/index.fix3.ts','supabase/functions/_shared/paymentQueueFix3.ts']
tests=['pdf-validation-test.ts','upload-body-test.ts','quarantine-worker-test.ts','note-pdf-hash-test.ts','play_catalog_unit_test.ts','play_diagnostic_sanitization_review_test.ts','upload-note-pdf-test.ts','play_catalog_api_test.ts','play_catalog_patch_diagnostic_test.ts']
checks['deno-unit']=['deno','test','--cached-only','--config','supabase/deno.json','--allow-read','--allow-env',*['supabase/tests/'+t for t in tests],'supabase/functions/diagnose-play-pricing/handler_test.ts','supabase/functions/diagnose-play-pricing/sanitize_test.ts']
for p in sorted((root/'mobile-app/scripts').glob('*selftest.cjs')):
 if p.name=='wallet-terms-selftest.cjs':continue
 if 'wallet' in p.read_text().lower() or 'referral' in p.read_text().lower():
  checks['mobile-'+p.stem]=['node',str(p.relative_to(root))]
results={}
def run(item):
 name,cmd=item
 with (out/(name+'.log')).open('w') as f:
  f.write('$ '+' '.join(cmd)+'\n');f.flush()
  r=subprocess.run(cmd,cwd=root,stdout=f,stderr=subprocess.STDOUT)
  f.write('\nEXIT '+str(r.returncode)+'\n')
 return name,{'command':cmd,'exit':r.returncode}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for future in concurrent.futures.as_completed([pool.submit(run,item) for item in checks.items()]):
  name,r=future.result()
  results[name]=r
  (out/'source-results.json').write_text(json.dumps(results,indent=2)+'\n')
  print(name,'exit='+str(r['exit']),flush=True)
raise SystemExit(any(r['exit'] for r in results.values()))
