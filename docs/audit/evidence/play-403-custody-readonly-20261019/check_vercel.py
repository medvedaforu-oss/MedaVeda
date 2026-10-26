from pathlib import Path
import datetime,json,urllib.error,urllib.parse,urllib.request
OUT=Path('/tmp/medveda-catalog-custody-readonly-20261019');ROOT=Path('/home/ganeshp8545/AyurPulse');records=[]
auth=json.loads((Path.home()/'.local/share/com.vercel.cli/auth.json').read_text());token=auth.get('token');assert isinstance(token,str) and token
seen=set()
for relative in ['.vercel/project.json','admin-panel/.vercel/project.json','website/.vercel/project.json']:
 link=json.loads((ROOT/relative).read_text());project=link['projectId'];team=link.get('orgId');identity=(project,team)
 if identity in seen:continue
 seen.add(identity);result={'linked_from':relative}
 def get(path,query=None):
  query={**({'teamId':team} if team else {}),**(query or {})}
  req=urllib.request.Request('https://api.vercel.com'+path+'?'+urllib.parse.urlencode(query),headers={'Authorization':'Bearer '+token})
  with urllib.request.urlopen(req,timeout=25) as response:return json.load(response)
 try:
  p=get('/v9/projects/'+project)
  crons=p.get('crons')
  result.update({'project_name':p.get('name'),'project_id':project,'cron_configuration_present':crons is not None,'cron_jobs':[],'cron_config_keys':list(crons) if isinstance(crons,dict) else None,'production_target_present':bool(p.get('targets',{}).get('production'))})
  jobs=crons.get('jobs',[]) if isinstance(crons,dict) else crons if isinstance(crons,list) else []
  result['cron_jobs']=[{k:j.get(k) for k in ['path','schedule']} for j in jobs if isinstance(j,dict)]
  result['crons_disabled']=crons.get('disabled') if isinstance(crons,dict) else None
  env=get('/v10/projects/'+project+'/env',{'decrypt':'false'})
  result['environment_variable_names']=[{'name':e.get('key'),'targets':e.get('target'),'type':e.get('type')} for e in env.get('envs',[])]
  result['catalog_secret_name_present']=any(e.get('key')=='PLAY_CATALOG_CRON_SECRET' for e in env.get('envs',[]))
  # Never retain or print the env value fields returned by the provider.
 except urllib.error.HTTPError as e:result['unavailable']={'http_status':e.code}
 except Exception as e:result['unavailable']={'exception_class':type(e).__name__}
 records.append(result);print(json.dumps(result),flush=True)
(OUT/'vercel-live-inventory.json').write_text(json.dumps({'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'projects':records},indent=2)+'\n')
