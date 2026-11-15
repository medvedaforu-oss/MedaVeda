"""Create one reviewed finding commit, projecting only its delta onto HEAD."""
import os,pathlib,subprocess,tempfile,sys,json
root=pathlib.Path(__file__).resolve().parents[3];os.chdir(root)
id=sys.argv[1];title=sys.argv[2];base=root/'docs/audit/mobile-fix-2/checkpoints';snapshot=base/id
paths=[p.relative_to(snapshot/'after') for p in (snapshot/'after').rglob('*') if p.is_file() and str(p.relative_to(snapshot/'after')).startswith('mobile-app/')]
extra=[pathlib.Path(x) for x in sys.argv[3:]]
idx=tempfile.mktemp(prefix='mobile-fix-index-');env={**os.environ,'GIT_INDEX_FILE':idx}
def git(*args,**kw):return subprocess.run(['git',*args],env=env,check=True,**kw)
git('read-tree','HEAD')
projected={}
for rel in paths:
 before=(snapshot/'before'/rel).read_bytes();after=(snapshot/'after'/rel).read_bytes()
 head=subprocess.run(['git','show',f'HEAD:{rel}'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 if head.returncode:
  if before:raise SystemExit(f'BLOCKED {id}: prerequisite untracked {rel}')
  merged=after
 else:
  with tempfile.TemporaryDirectory() as tmp:
   a,b,c=[pathlib.Path(tmp)/x for x in ['head','before','after']];a.write_bytes(head.stdout);b.write_bytes(before);c.write_bytes(after)
   r=subprocess.run(['git','merge-file','-p',str(a),str(b),str(c)],stdout=subprocess.PIPE)
   if r.returncode:raise SystemExit(f'BLOCKED {id}: inseparable existing changes {rel}')
   merged=r.stdout
 projected[rel]=merged
for rel in extra:
 assert str(rel).startswith(('mobile-app/__tests__/','docs/audit/mobile-fix-2/')) and '.env' not in rel.name,rel
 projected[rel]=(root/rel).read_bytes()
for rel,data in projected.items():
 blob=git('hash-object','-w','--stdin',input=data,stdout=subprocess.PIPE).stdout.decode().strip()
 git('update-index','--add','--cacheinfo',f'100644,{blob},{rel}')
git('diff','--cached','--check');git('diff','--cached','--stat')
git('commit','-m',f'fix({id}): {title}')
subprocess.run(['git','reset','--quiet','HEAD','--',*[str(p) for p in projected]],check=True)
hash=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();print(id,hash)
ledger=root/'docs/audit/mobile-fix-2/commits.json';d=json.loads(ledger.read_text()) if ledger.exists() else {};d[id]={'hash':hash,'files':[str(p) for p in projected]};ledger.write_text(json.dumps(d,indent=2));pathlib.Path(idx).unlink(missing_ok=True)
