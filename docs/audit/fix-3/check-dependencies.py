import subprocess,pathlib,os,json
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/audit/fix-3'
env={k:os.environ[k] for k in ['PATH','HOME','LANG','HTTPS_PROXY','HTTP_PROXY','ALL_PROXY','NO_PROXY','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE'] if k in os.environ};env['EXPO_NO_DOTENV']='1'
results=[]
for prefix in ['mobile-app','admin-panel','tooling']:
 cmd=['npm','--cache','/tmp/medveda-fix3-npm-cache','audit','--json','--prefix',prefix];r=subprocess.run(cmd,cwd=root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=180)
 (out/('final-'+prefix+'-npm-audit.log')).write_text(r.stdout);results.append({'name':prefix,'exit':r.returncode});print(prefix,r.returncode,flush=True)
for name,spec,fields in [('expo','expo@~57.0.33',['version','dependencies.@expo/fingerprint']),('fingerprint','@expo/fingerprint@~0.20.16',['version','dependencies.minimatch']),('eslint','eslint@~10.13.0',['version','dependencies.minimatch']),('typescript-eslint','typescript-eslint@~8.59.4',['version','dependencies'])]:
 cmd=['npm','--cache','/tmp/medveda-fix3-npm-cache','view',spec,*fields,'--json'];r=subprocess.run(cmd,cwd=root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=180);(out/('dependency-parent-'+name+'.log')).write_text(r.stdout+f'\nEXIT {r.returncode}\n');print(name,r.returncode,flush=True)
(out/'dependency-results.json').write_text(json.dumps(results,indent=2))
