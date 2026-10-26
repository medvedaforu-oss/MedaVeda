from pathlib import Path
import base64,datetime,json,subprocess
OUT=Path('/tmp/medveda-catalog-custody-readonly-20261019');REPO='ganeshp8545/MedaVeda';records={}
def api(path):
 r=subprocess.run(['gh','api',path],capture_output=True,text=True,timeout=40)
 if r.returncode:return {'unavailable':True,'exit_code':r.returncode,'http_status':next((n for n in [401,403,404,429] if f'HTTP {n}' in r.stderr),None)}
 return json.loads(r.stdout)
def save(n,v):records[n]=v;print(json.dumps({n:v}),flush=True)
try:
 info=api('repos/'+REPO);save('github-repository',{'default_branch':info.get('default_branch'),'private':info.get('private'),'permission_names':[k for k,v in info.get('permissions',{}).items() if v]} if 'unavailable' not in info else info)
 workflows=api('repos/'+REPO+'/actions/workflows?per_page=100');save('github-workflows',{'total_count':workflows.get('total_count'),'workflows':[{k:w.get(k) for k in ['id','name','path','state']} for w in workflows.get('workflows',[])]} if 'unavailable' not in workflows else workflows)
 refs=[]
 for w in workflows.get('workflows',[]):
  if w.get('path','').startswith('.github/workflows/'):
   content=api('repos/'+REPO+'/contents/'+w['path'])
   if 'content' in content:
    text=base64.b64decode(content['content']).decode();lines=text.splitlines()
    refs.append({'path':w['path'],'git_blob_sha':content.get('sha'),'has_schedule_key':any(l.strip().startswith('schedule:') for l in lines),'has_workflow_dispatch_key':any(l.strip().startswith('workflow_dispatch:') for l in lines),'has_workflow_call_key':any(l.strip().startswith('workflow_call:') for l in lines),'catalog_reference_lines':[i+1 for i,l in enumerate(lines) if any(t.lower() in l.lower() for t in ['sync-play-catalog','PLAY_CATALOG_CRON_SECRET','x-play-catalog-cron-secret'])]})
   else:refs.append({'path':w['path'],'unavailable':True})
 save('github-live-workflow-references',refs)
 sec=api('repos/'+REPO+'/actions/secrets?per_page=100');save('github-repository-secret-names',{'total_count':sec.get('total_count'),'names':[s['name'] for s in sec.get('secrets',[])]} if 'unavailable' not in sec else sec)
 envs=api('repos/'+REPO+'/environments?per_page=100');save('github-environments',{'total_count':envs.get('total_count'),'names':[e['name'] for e in envs.get('environments',[])]} if 'unavailable' not in envs else envs)
 envsecs=[]
 for e in envs.get('environments',[]):
  sec=api('repos/'+REPO+'/environments/'+e['name']+'/secrets?per_page=100');envsecs.append({'environment':e['name'],**({'names':[x['name'] for x in sec.get('secrets',[])],'total_count':sec.get('total_count')} if 'unavailable' not in sec else sec)})
 save('github-environment-secret-names',envsecs)
 runs=api('repos/'+REPO+'/actions/runs?per_page=10');save('github-recent-runs',{'runs':[{k:r.get(k) for k in ['id','workflow_id','event','status','conclusion','created_at']} for r in runs.get('workflow_runs',[])]} if 'unavailable' not in runs else runs)
except Exception as e:save('github-check-error',{'exception_class':type(e).__name__})
finally:(OUT/'github-live-inventory.json').write_text(json.dumps({'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),**records},indent=2)+'\n')
