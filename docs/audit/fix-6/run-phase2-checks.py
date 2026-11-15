#!/usr/bin/env python3
"""Credential-free local source checks. No SQL/provider/deployment operations."""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'docs/audit/fix-6/phase2/after'
ENV = {k: v for k, v in os.environ.items() if k in {'PATH', 'HOME', 'DENO_DIR', 'LANG', 'TMPDIR'}}
ENV.update(EXPO_NO_DOTENV='1', CI='1')
jobs = {
    'mobile-tsc': ['node', 'mobile-app/node_modules/typescript/bin/tsc', '-p', 'mobile-app/tsconfig.json', '--noEmit', '--incremental', 'false'],
    'admin-tsc': ['node', 'admin-panel/node_modules/typescript/bin/tsc', '-p', 'admin-panel/tsconfig.app.json', '--noEmit', '--incremental', 'false'],
    'admin-node-tsc': ['node', 'admin-panel/node_modules/typescript/bin/tsc', '-p', 'admin-panel/tsconfig.node.json', '--noEmit', '--incremental', 'false'],
    'admin-tests': ['npm', 'test', '--prefix', 'admin-panel'],
    'password-recovery': ['npm', 'run', 'test:password-recovery', '--prefix', 'mobile-app'],
    'website-links': ['node', 'website/scripts/check-links.mjs'],
}
entries = sorted((ROOT / 'supabase/functions').glob('*/index.ts'))
jobs['deno-check'] = ['deno', 'check', '--cached-only', '--config', 'supabase/deno.json',
    *[str(p.relative_to(ROOT)) for p in entries], 'supabase/workers/validate-note-pdf.ts',
    'supabase/functions/report-external-transaction/index.fix3.ts', 'supabase/functions/_shared/paymentQueueFix3.ts']
tests = ['pdf-validation-test.ts', 'upload-body-test.ts', 'quarantine-worker-test.ts', 'note-pdf-hash-test.ts',
    'play_catalog_unit_test.ts', 'play_diagnostic_sanitization_review_test.ts', 'upload-note-pdf-test.ts',
    'play_catalog_api_test.ts', 'play_catalog_patch_diagnostic_test.ts']
jobs['deno-unit'] = ['deno', 'test', '--cached-only', '--config', 'supabase/deno.json', '--allow-read', '--allow-env',
    *['supabase/tests/' + t for t in tests], 'supabase/functions/diagnose-play-pricing/handler_test.ts',
    'supabase/functions/diagnose-play-pricing/sanitize_test.ts']
extra = ['scripts/p2-quality-selftest.cjs', 'scripts/p2-admin-labels-selftest.cjs',
    'mobile-app/scripts/notification-preferences-selftest.cjs', 'mobile-app/scripts/notification-routing-selftest.cjs',
    'mobile-app/scripts/push-lifecycle-selftest.cjs', 'mobile-app/scripts/nonplay-test-isolation-selftest.cjs',
    'mobile-app/scripts/closed-testing-selftest.cjs', 'mobile-app/__tests__/MOB-08.cjs',
    'supabase/tests/p0-notification-selftest.cjs', 'supabase/tests/p1-push-delivery-selftest.cjs',
    'supabase/tests/audit-push-policy-selftest.cjs', 'admin-panel/scripts/p1-financial-ui-selftest.cjs',
    'docs/audit/fix-6/tests/notification-contract.cjs', 'docs/audit/fix-6/tests/nonplay-sales-gate.cjs',
    'docs/audit/fix-6/tests/scheduling-scanner.cjs']
for p in extra:
    jobs[Path(p).stem] = ['node', p]

def run(item):
    name, cmd = item
    started = time.monotonic()
    with (OUT / (name + '.log')).open('w') as log:
        log.write('$ ' + ' '.join(cmd) + '\n'); log.flush()
        try:
            result = subprocess.run(cmd, cwd=ROOT, env=ENV, stdout=log, stderr=subprocess.STDOUT, timeout=600)
            code = result.returncode
        except subprocess.TimeoutExpired:
            code = 124
        log.write('\nEXIT ' + str(code) + '\n')
    return name, {'command': cmd, 'exit': code, 'seconds': round(time.monotonic() - started, 2)}

if __name__ == '__main__':
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for future in concurrent.futures.as_completed([pool.submit(run, item) for item in jobs.items()]):
            name, result = future.result(); results[name] = result
            (OUT / 'source-results.json').write_text(json.dumps(results, indent=2) + '\n')
            print(name, result['exit'], flush=True)
    raise SystemExit(any(r['exit'] for r in results.values()))
