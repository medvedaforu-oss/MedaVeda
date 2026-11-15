#!/usr/bin/env python3
"""Read-only verification of baseline files; writes report evidence only."""
import hashlib, json
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
baseline=json.loads((HERE/'baseline.json').read_text())
changed=[p for p,h in baseline.items() if (ROOT/p).is_file() and digest(ROOT/p)!=h]
missing=[p for p in baseline if not (ROOT/p).is_file()]
allowed=['mobile-app/modules/medveda-offline-vault/README.md']
unexpected=[p for p in changed if p not in allowed]
preserved={p:digest(ROOT/p) for p in baseline if p.startswith('mobile-app/modules/medveda-offline-vault/') and p not in allowed}
result={'baselineFiles':len(baseline),'modifiedExistingFiles':changed,'missingFiles':missing,
        'unexpectedModifications':unexpected,'unchangedFoundation':preserved,
        'productionNoGo':True,'nativeAcceptance':False}
(HERE/'preservation.json').write_text(json.dumps(result,indent=2)+'\n')
module=ROOT/'mobile-app/modules/medveda-offline-vault'
paths=set(p for p in module.rglob('*') if p.is_file())
paths.add(ROOT/'docs/superpowers/plans/2026-11-11-native-encryption-phase1b.md')
paths.update(p for p in HERE.rglob('*') if p.is_file())
manifest=[]
for p in sorted(paths):
    relative=str(p.relative_to(ROOT))
    if relative not in baseline or relative in changed:
        if p.name=='files-changed.json':continue
        manifest.append({'path':relative,'change':'modified' if relative in baseline else 'added','sha256':digest(p)})
manifest.append({'path':str((HERE/'files-changed.json').relative_to(ROOT)),'change':'added','sha256':None,'note':'Self-reference; all other entries hashed.'})
(HERE/'files-changed.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'baselineFiles':len(baseline),'modifiedExistingFiles':changed,'missingFiles':missing,'unexpectedModifications':unexpected,'manifestEntries':len(manifest)}))
assert not missing and not unexpected
