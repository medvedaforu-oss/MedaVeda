"""Local-only cleanup evidence runner; no database or provider calls."""
import subprocess,pathlib,sys,json,time
root=pathlib.Path(__file__).resolve().parents[3];batch=sys.argv[1]
out=pathlib.Path('/tmp/medveda-cleanup-phase2')/batch;out.mkdir(parents=True,exist_ok=True)
mobile=['razorpay-reenable','payment-provider','payment-routing','payment-request','payment-summary','payment-poll','payment-success-owner','payment-verdict','mv004-recovery','mv008-ownership','mv012-history','razorpay-internal-test','razorpay-live-testing']
checks=[('mobile-tsc',['node','node_modules/typescript/bin/tsc','--noEmit'],root/'mobile-app'),('admin-tsc',['node','node_modules/typescript/bin/tsc','-p','tsconfig.app.json','--noEmit'],root/'admin-panel')]
checks += [(n,['node',f'mobile-app/scripts/{n}-selftest.cjs'],root) for n in mobile]
checks += [(n,['node',f'supabase/tests/{n}-selftest.cjs'],root) for n in ['razorpay-routing','razorpay-security']]
results=[]
for name,cmd,cwd in checks:
 t=time.time()
 try:
  r=subprocess.run(cmd,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=180);code=r.returncode;output=r.stdout
 except subprocess.TimeoutExpired as e:code=124;output=str(e.stdout)
 (out/(name+'.log')).write_text(output);results.append({'name':name,'command':cmd,'cwd':str(cwd.relative_to(root)),'code':code,'seconds':round(time.time()-t,2)})
 print(batch,name,code,flush=True)
 if code:print(output[-1800:],flush=True)
(pathlib.Path(__file__).parent/(batch+'-results.json')).write_text(json.dumps(results,indent=2)+'\n')
sys.exit(any(r['code'] for r in results))
