#!/usr/bin/env python3
"""Local module checks only. No installation, network, builds, or deployment."""
import json, pathlib, subprocess, sys
root=pathlib.Path(__file__).resolve().parents[1]
commands=[
 ['python3','scripts/question-papers-scope-check.py'],
 *[['node',f'admin-panel/scripts/question-papers{suffix}-selftest.cjs'] for suffix in ['', '-ui', '-form']],
 *[['node',f'mobile-app/scripts/question-papers{suffix}-selftest.cjs'] for suffix in ['', '-ui', '-download', '-lifecycle', '-web-preview']],
 *[['node',f'mobile-app/scripts/{name}-selftest.cjs'] for name in ['navigation-lazy','audit-navigation','pdf-lifecycle','pdf-remote-retry']],
 ['node','supabase/tests/question-paper-access-selftest.cjs'],
 ['npm','test','--prefix','admin-panel'],
 ['node','mobile-app/node_modules/typescript/bin/tsc','-p','mobile-app/tsconfig.json','--noEmit','--pretty','false'],
 ['node','admin-panel/node_modules/typescript/bin/tsc','-p','admin-panel/tsconfig.app.json','--noEmit','--pretty','false'],
]
results=[]
for args in commands:
 result=subprocess.run(args,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 results.append({'command':' '.join(args),'exit':result.returncode,'output':result.stdout})
 print(('PASS' if result.returncode==0 else 'FAIL')+' '+' '.join(args),flush=True)
 if result.returncode: print(result.stdout[-5000:],flush=True)
pathlib.Path('/tmp/qp-verification-results.json').write_text(json.dumps(results,indent=2))
sys.exit(any(r['exit'] for r in results))
