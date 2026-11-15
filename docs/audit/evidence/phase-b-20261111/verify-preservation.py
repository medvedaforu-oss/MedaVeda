"""Final preservation and complete task-created path inventory."""
from pathlib import Path
import json,hashlib,subprocess
r=Path('/home/ganeshp8545/AyurPulse');e=Path(__file__).resolve().parent
before=json.loads((e/'initial-file-hashes.json').read_text())
changed=[p for p,h in before.items() if not (r/p).is_file() or hashlib.sha256((r/p).read_bytes()).hexdigest()!=h]
assert not changed,changed
owned=[r/'docs/audit/MEDVEDA_PHASE_B_EDGE_COMPATIBILITY_2026-11-11.md',*sorted((r/'supabase/releases/phase-b-20261111').rglob('*')),*sorted(e.rglob('*'))]
owned += [r/'supabase/tests'/p for p in ['run-phase-b-local.py','phase-b-dependencies-local.py','phase-b-handlers-selftest.cjs','phase-b-recovery-selftest.cjs','phase-b-history-selftest.cjs','support/phase_b_production_normalize_phone.sql']]
owned=[p for p in owned if p.is_file()];assert all(str(p.relative_to(r)) not in before for p in owned)
result=subprocess.run(['git','diff','--check'],cwd=r,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
(e/'diff-check.log').write_text(result.stdout);assert result.returncode==0
for p in owned:
 if p.suffix in ['.ts','.cjs','.py','.sql','.md','.toml']:
  for i,line in enumerate(p.read_text().splitlines(),1):assert line==line.rstrip(),(str(p),i,'trailing whitespace')
# Recompute list after producing verification output, including the inventory itself.
paths=set(str(p.relative_to(r)) for p in owned)
paths.update(str((e/p).relative_to(r)) for p in ['preservation.json','changed-file-inventory.json','diff-check.log'])
(e/'changed-file-inventory.json').write_text(json.dumps(sorted(paths),indent=2)+'\n')
(e/'preservation.json').write_text(json.dumps({'preexisting_files_unchanged':len(before),'preexisting_changed_or_deleted':changed,'task_created_file_count':len(paths),'all_task_files_new':True,'git_diff_check_exit_code':result.returncode},indent=2)+'\n')
print(json.dumps({'preexisting_unchanged':len(before),'new_files':len(paths),'diff_check':'PASS'}))
