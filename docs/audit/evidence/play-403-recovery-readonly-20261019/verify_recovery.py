"""Read-only MedVeda recovery verification. No function invocation or write action."""
import argparse,datetime,gzip,hashlib,importlib.util,json,urllib.error,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
OPS=ROOT/'docs/audit/evidence/play-403-single-job-20261019'
RELEASE=ROOT/'docs/audit/evidence/play-403-release-20261019-r2'
sha=lambda b:hashlib.sha256(b).hexdigest()
def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--mode',choices=['candidate','rollback'],required=True)
 parser.add_argument('--source-dir',type=Path,required=True)
 parser.add_argument('--output',type=Path,required=True)
 args=parser.parse_args()
 assert not args.output.exists(),'Use a fresh local output file'
 manifest=json.loads((RELEASE/'manifest.json').read_text())
 for name,expected in manifest['archive_sha256'].items():assert sha((RELEASE/name).read_bytes())==expected,name
 assert sha(gzip.decompress((RELEASE/'production-v2.eszip.gz').read_bytes()))==manifest['production_bundle_sha256']
 assert sha((OPS/'manifest.json').read_bytes())==manifest['operator_manifest_sha256']
 for name,expected in json.loads((OPS/'manifest.json').read_text())['files_sha256'].items():assert sha((OPS/name).read_bytes())==expected,name
 source_kind='candidate' if args.mode=='candidate' else 'rollback'
 for name,expected in manifest['files'][source_kind].items():
  if name.endswith('.ts') or name.endswith('/import_map.json'):assert sha((args.source_dir/name).read_bytes())==expected,name
 spec=importlib.util.spec_from_file_location('reviewed_control',OPS/'control.py')
 c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
 def metadata():return {k:v for k,v in c.management('/functions/sync-play-catalog').items() if k in ['id','slug','version','status','verify_jwt','updated_at']}
 before=metadata()
 assert before['id']=='f0e3d974-a8e8-436c-9063-6943e4b36a08' and before['status']=='ACTIVE' and before['verify_jwt'] is False
 if args.mode=='candidate':assert before['version']==3
 else:assert before['version']>3
 preflight=c.database((OPS/'preflight.sql').read_text())
 c.one_rupee_precondition(preflight,pending=True)
 prior=ROOT/'docs/audit/evidence/play-403-execution-20261019T0510'
 baseline=json.loads((prior/'preflight-final.json').read_text())[0]['preflight']
 current=preflight[0]['preflight']
 assert sorted(current['catalog'],key=lambda j:j['price_inr'])==sorted(baseline['catalog'],key=lambda j:j['price_inr'])
 assert current['cron']==baseline['cron']
 monitoring=c.database((OPS/'monitor.sql').read_text().replace('__REQUEST_ID__','0'))
 assert monitoring[0]['monitoring']['jobs']==json.loads((prior/'monitor-final.json').read_text())[0]['monitoring']['jobs']
 outstanding=c.database("select count(*) as all_queued_http, (select count(*) from pg_stat_activity where pid<>pg_backend_pid() and state='active' and (strpos(query,'sync-play-catalog')>0 or strpos(query,'claim_play_price_sync')>0)) as active_catalog_sql from net.http_request_queue;")
 assert outstanding[0]['all_queued_http']==0 and outstanding[0]['active_catalog_sql']==0
 token=(Path.home()/'.supabase/access-token').read_text().strip()
 request=urllib.request.Request('https://api.supabase.com/v1/projects/xbvenkfmesugrbjuufyw/functions/sync-play-catalog/body',headers={'Authorization':'Bearer '+token})
 with urllib.request.urlopen(request,timeout=25) as response:digest=sha(response.read())
 if args.mode=='rollback':assert digest==manifest['production_bundle_sha256']
 after=metadata();assert before==after,'Function changed during verification'
 result={'verified_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':args.mode,'metadata':after,'deployed_bundle_sha256':digest,'source_hashes_match':True,'archive_hashes_match':True,'queue_state_unchanged':True,'cron_paused':True,'all_queued_http':0,'active_catalog_sql':0,'preflight':preflight,'monitoring':monitoring,'production_writes':0,'function_invocations':0}
 args.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
if __name__=='__main__':
 try:main()
 except urllib.error.HTTPError as error:raise SystemExit(f'Read-only verification HTTP {error.code}; raw response omitted; no writes performed')
 except Exception as error:raise SystemExit(f'Read-only verification stopped: {type(error).__name__}; no writes performed')
