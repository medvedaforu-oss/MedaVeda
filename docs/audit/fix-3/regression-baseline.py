import pathlib,subprocess,json
root=pathlib.Path(__file__).resolve().parents[3];out=root/'docs/audit/fix-3';results=[]
for p in sorted((root/'mobile-app/__tests__').glob('MOB-*.cjs')):
 r=subprocess.run(['node',str(p)],cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (out/'before'/p.with_suffix('.log').name).write_text(r.stdout+f'\nEXIT {r.returncode}\n');results.append({'name':p.name,'exit':r.returncode});print(p.name,r.returncode,flush=True)
(out/'regression-baseline-results.json').write_text(json.dumps(results,indent=2))
