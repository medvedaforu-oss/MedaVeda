from pathlib import Path
import subprocess,json,hashlib,datetime
r=Path.cwd(); tag='2026-11-11_'+datetime.datetime.now(datetime.timezone.utc).strftime('%H%M%S'); o=r/'docs/audit'/('full-project-'+tag);o.mkdir(); (o/'evidence').mkdir()
files=[]
for p in r.rglob('*'):
 if any(s in {'.git','node_modules','.expo','.gradle','dist','build'} for s in p.parts) or o in p.parents or not p.is_file():continue
 files.append({'path':str(p.relative_to(r)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(o/'evidence/initial-files.json').write_text(json.dumps(files,indent=2))
(o/'evidence/initial-git-status.txt').write_text(subprocess.run(['git','status','--porcelain=v1','-uall'],capture_output=True,text=True).stdout)
(o/'evidence/git-history.txt').write_text(subprocess.run(['git','log','-15','--format=%h %ad %s','--date=iso-strict'],capture_output=True,text=True).stdout)
Path('/tmp/medveda-current-audit').write_text(str(o));print(o)
