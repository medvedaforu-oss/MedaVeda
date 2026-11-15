#!/usr/bin/env python3
"""Copy first, offline JS export, immediately inspect/retain maps; no native build."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time

root = Path(__file__).resolve().parents[3]
out = root / 'docs/audit/fix-6/phase2/after'
scratch = Path(tempfile.mkdtemp(prefix='medveda-fix6-export-'))
dest = scratch / 'mobile-app'
def ignore(directory, names):
    return [n for n in names if n.startswith('.env') or n in {
        '.git', 'node_modules', 'android', 'ios', '.expo', 'code-signing-keys',
    } or n.endswith(('.keystore', '.jks', '.p12'))]
shutil.copytree(root / 'mobile-app', dest, ignore=ignore)
shutil.copytree(root / 'mobile-app/node_modules', dest / 'node_modules', symlinks=True)
source_hashes = {str(p.relative_to(dest)): hashlib.sha256(p.read_bytes()).hexdigest()
                 for p in dest.rglob('*') if p.is_file() and 'node_modules' not in p.parts}
env = {k: v for k, v in os.environ.items() if k in {'PATH', 'HOME', 'LANG', 'TMPDIR'}}
env.update(EXPO_NO_DOTENV='1', EXPO_OFFLINE='1', CI='1')
export_root = Path('/tmp/medveda-fix6-android-export')
assert not export_root.exists(), 'Use a fresh output directory; retain earlier evidence'
cmd = ['node', 'node_modules/expo/bin/cli', 'export', '--platform', 'android', '--output-dir', str(export_root), '--source-maps']
start = time.monotonic()
with (out / 'android-export.log').open('w') as log:
    try:
        result = subprocess.run(cmd, cwd=dest, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=420)
        code = result.returncode
    except subprocess.TimeoutExpired:
        code = 124
report = {'command': cmd, 'cwd': str(dest), 'exit': code, 'seconds': round(time.monotonic() - start, 2),
          'source_hashes': source_hashes, 'maps': [], 'hits': [], 'classification': 'INCONCLUSIVE'}
pattern = re.compile(r'(^|/)(minimatch|glob|eslint|typescript-eslint)(/|$)|@expo/fingerprint|@typescript-eslint|@eslint/config-array')
def sources(m):
    yield from m.get('sources', [])
    for section in m.get('sections', []):
        assert 'map' in section, 'External section requires separate inspection'
        yield from sources(section['map'])
try:
    maps = list(export_root.rglob('*.map'))
    assert maps, 'No source maps: exclusion NOT verified'
    for index, path in enumerate(maps):
        raw = path.read_bytes()
        entries = list(sources(json.loads(raw)))
        assert entries, f'Empty/unusable map: {path.name}'
        retained = out / ('android-map-' + str(index) + '.map.gz')
        with gzip.open(retained, 'wb') as archive:
            archive.write(raw)
        report['maps'].append({'path': str(path.relative_to(export_root)), 'sha256': hashlib.sha256(raw).hexdigest(),
                              'sources': entries, 'retained': retained.name})
        report['hits'].extend((str(path.relative_to(export_root)), s) for s in entries if pattern.search(s.replace('\\', '/')))
    if code == 0:
        report['classification'] = 'HITS REQUIRE REVIEW' if report['hits'] else 'EXCLUDED FROM THIS EXPORT'
except (AssertionError, ValueError) as error:
    report['inspection_error'] = str(error)
(out / 'android-export-result.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['exit', 'seconds', 'classification', 'hits']}), flush=True)
