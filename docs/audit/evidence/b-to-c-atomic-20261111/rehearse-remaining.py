"""Continue failure/concurrency checks in fresh databases; preserves transition evidence."""
from pathlib import Path
O=Path(__file__).resolve().parent
s=(O/'rehearse.py').read_text()
a=s.index(' # Baseline+A handler fixtures');b=s.index(' # Exact original wrapper success.')
s=s[:a]+" ctext=(O/'03-phase-c-atomic-compatible.sql').read_text()\n"+s[b:]
a=s.index(" for name in ['phase-b-handlers','phase-b-recovery','phase-b-history']:");b=s.index(' # Drift and index-failure cases')
s=s[:a]+s[b:]
s=s.replace("'rehearsal-results.json'","'remaining-results.json'")
exec(compile(s,__file__,'exec'))
