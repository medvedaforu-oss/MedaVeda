"""Offline audit finalization; no database or service actions."""
from pathlib import Path
import hashlib,json,re,subprocess,datetime
R=Path('/home/ganeshp8545/AyurPulse'); O=Path(__file__).resolve().parent; A=O.parent
sha=lambda b:hashlib.sha256(b).hexdigest()
initial=json.loads((O/'initial-hashes.json').read_text())
changed=[];missing=[]
for path,digest in initial.items():
    p=R/path
    if not p.is_file():missing.append(path)
    elif sha(p.read_bytes())!=digest:changed.append(path)
preservation={'initial_files':len(initial),'changed_existing':changed,'missing_existing':missing,
              'result':'PASS' if not changed and not missing else 'FAIL'}
(O/'preservation.json').write_text(json.dumps(preservation,indent=2)+'\n')
assert not changed and not missing,preservation
old=json.loads((O/'interrupted-attempt/verification-results.json').read_text())
current=json.loads((O/'verification-results.json').read_text())
assert {x['name'] for x in current}=={'atomic','proof','forward-ledger','focused','archives'}
acceptance=[x for x in old if x['name'] in ['database','mv003-006']]+current
assert len(acceptance)==7 and all(x['exit_code']==0 for x in acceptance)
focused=json.loads((O/'p0-final-check-results.json').read_text());assert len(focused)==36 and all(x['exit_code']==0 for x in focused)
additional=json.loads((O/'additional-sql-results.json').read_text());assert len(additional)==4 and all(x['exit_code']==0 for x in additional)
independent=json.loads((O/'independent-rehearsal-results.json').read_text());assert len(independent)==7
archives=json.loads((O/'archive-validation.json').read_text())['archives'];assert len(archives)==22 and all(x['exit_code']==0 for x in archives)
assert 'ALL SUITES PASSED' in (O/'database.log').read_text()
assert 'PASS complete rehearsal' in (O/'atomic.log').read_text()
(O/'acceptance-results.json').write_text(json.dumps({'recorded_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'jobs':acceptance,'focused_commands':36,'frozen_archives':22,'historical_suites':4,
 'additional_independent_rehearsal_groups':7,'preservation':preservation,'production_authorization':False},indent=2)+'\n')
failures=[]
for p in A.glob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)',p.read_text()):
        if '://' in target or target.startswith('#'):continue
        path=target.split('#')[0]
        if not (p.parent/path).exists():failures.append({'file':p.name,'target':target})
assert not failures,failures
diff=subprocess.run(['git','diff','--check'],cwd=R,capture_output=True,text=True)
assert diff.returncode==0,diff.stdout+diff.stderr
# New untracked documents are outside git diff's scope: inspect their whitespace explicitly.
bad=[]
for p in A.rglob('*'):
    if p.is_file() and p.suffix in ['.md','.py']:
        for n,line in enumerate(p.read_text().splitlines(),1):
            if line.rstrip()!=line:bad.append([str(p.relative_to(A)),n])
assert not bad,bad
(O/'final-checks.json').write_text(json.dumps({'document_links':'PASS','new_document_script_whitespace':'PASS',
 'git_diff_check_exit':diff.returncode,'required_deliverables':sorted(p.name for p in A.glob('*.md'))},indent=2)+'\n')
(O/'final-git-status.txt').write_bytes(subprocess.check_output(['git','status','--short'],cwd=R))
inventory=[{'path':str(p.relative_to(A)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())}
           for p in sorted(A.rglob('*')) if p.is_file() and p.name!='final-file-inventory.json']
(O/'final-file-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
print(json.dumps({'result':'PASS','existing_files_preserved':len(initial),'passing_job_groups':len(acceptance),
                  'deliverables':len(list(A.glob('*.md'))),'audit_files':len(inventory)+1},indent=2))
