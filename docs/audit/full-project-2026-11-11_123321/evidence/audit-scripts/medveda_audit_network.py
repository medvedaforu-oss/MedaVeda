import os,subprocess,json
from pathlib import Path
o=Path(Path('/tmp/medveda-current-audit').read_text())/'evidence'; env={'PATH':os.environ['PATH'],'HOME':os.environ['HOME'],'CI':'1'}; results=[]
for folder in ['admin-panel','mobile-app']:
 cmd=['npm','audit','--prefix',folder,'--omit=dev','--json']
 try:p=subprocess.run(cmd,cwd='/home/ganeshp8545/AyurPulse',env=env,capture_output=True,text=True,timeout=90);code=p.returncode;log=p.stdout+p.stderr
 except subprocess.TimeoutExpired as e:code=124;log=str(e)
 (o/(folder+'-dependency-audit.json')).write_text(log);results.append({'command':cmd,'exit_code':code});print(folder,code,flush=True)
(o/'dependency-checks.json').write_text(json.dumps(results,indent=2))
