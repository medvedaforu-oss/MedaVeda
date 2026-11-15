import pathlib,subprocess,os,sys,json
assert os.environ.get('PGHOST')=='/tmp/medveda-fix3-socket' and os.environ.get('PGPORT')=='55433'
phase,db=sys.argv[1:3];assert phase in ('before','after') and db.startswith('fix3_')
base=pathlib.Path(__file__).resolve().parent;out=base.parent/phase
for id in sys.argv[3:] or ['BACK-10','BACK-12','BACK-15','BACK-17']:
 cmd=['psql','-XqAt','-v','ON_ERROR_STOP=1','-d',db,'-f',str(base/(id+'.sql'))]
 p=subprocess.run(cmd,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (out/(id+'.log')).write_text('$ '+' '.join(cmd)+'\n'+p.stdout+f'\nEXIT {p.returncode}\n');print(id,p.returncode,flush=True)
