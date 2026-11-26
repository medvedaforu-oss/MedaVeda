#!/usr/bin/env python3
"""Verify the original 3,088 states and additive-only integration diffs."""
import difflib, hashlib, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
audit = root / 'docs/audit/question-papers-20261118'
baseline = json.loads((audit / 'initial-file-hashes.json').read_text())
allowed = {
 'mobile-app/src/screens/home/HomeScreen.tsx',
 'mobile-app/src/navigation/AppNavigator.tsx',
 'mobile-app/src/types/navigation.ts',
 'admin-panel/src/App.tsx',
 'admin-panel/src/components/Sidebar.tsx',
}
errors = []
for name, expected in baseline['files'].items():
 p = root / name
 actual = hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
 if actual != expected and name not in allowed:
  errors.append(name)
# Capture exact original integration bytes once, before any product edits.
for name in allowed:
 saved = audit / 'integration-baseline' / name
 current = root / name
 if not saved.exists():
  assert hashlib.sha256(current.read_bytes()).hexdigest() == baseline['files'][name], name
  saved.parent.mkdir(parents=True, exist_ok=True)
  saved.write_bytes(current.read_bytes())
 old, new = saved.read_text().splitlines(True), current.read_text().splitlines(True)
 for tag, *_ in difflib.SequenceMatcher(None, old, new, autojunk=False).get_opcodes():
  if tag not in ('equal', 'insert'): errors.append(name + ': non-additive edit')
print(f'Checked {len(baseline["files"])} original file states; five integration files may receive insertions only.')
if errors:
 raise SystemExit('FAIL: ' + ', '.join(errors))
print('PASS preservation and strictly additive integration')
