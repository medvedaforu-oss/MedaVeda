"""Independent offline byte, dependency-graph and preservation inventory."""
from pathlib import Path, PurePosixPath
import hashlib, json, re, tarfile, tomllib
R=Path('/home/ganeshp8545/AyurPulse'); O=Path(__file__).resolve().parent
P=R/'supabase/releases/p0-critical-20261111_131014'
h=lambda b:hashlib.sha256(b).hexdigest()
M=json.loads((P/'manifest.json').read_text()); results=[]
for line in (P/'checksums.sha256').read_text().splitlines():
    digest,path=line.split(None,1); path=path.lstrip('*')
    assert h((P/path).read_bytes())==digest,path
results.append('complete checksum inventory matches')
for key,base in [('sql',P),('review_documents',P),('required_prior_artifacts',R)]:
    for path,digest in M[key].items(): assert h((base/path).read_bytes())==digest,path
drift={}; dependencies={}
for name,f in M['functions'].items():
    assert h((P/f['archive']).read_bytes())==f['archive_sha256']
    with tarfile.open(P/f['archive']) as t:
        members=t.getmembers()
        assert all(x.isfile() or x.isdir() for x in members)
        assert all(not PurePosixPath(x.name).is_absolute() and '..' not in PurePosixPath(x.name).parts for x in members)
        data={x.name:t.extractfile(x).read() for x in members if x.isfile()}
    expected={'supabase/'+x for x in f['sources']} | {'supabase/config.toml','supabase/deno.json','supabase/deno.lock'}
    assert set(data)==expected,(name,set(data)^expected)
    assert tomllib.loads(data['supabase/config.toml'].decode())['functions']=={name:{'verify_jwt':f['verify_jwt']}}
    for config in ['deno.json','deno.lock']: assert data['supabase/'+config]==(P/config).read_bytes()
    assert h(''.join(f'{v}  {k}\n' for k,v in f['sources'].items()).encode())==f['closure_sha256']
    pending=['functions/'+name+'/index.ts']; seen=set(); external=set(); rpcs=set(); tables=set()
    while pending:
        path=pending.pop()
        if path in seen: continue
        seen.add(path); b=data['supabase/'+path]
        assert h(b)==f['sources'][path] and b==(P/path).read_bytes(),path
        s=b.decode()
        rpcs.update(re.findall(r'\.rpc\(\s*["\']([^"\']+)',s))
        tables.update(re.findall(r'\.from\(\s*["\']([^"\']+)',s))
        for imp in re.findall(r'(?:from\s*|import\s*\(\s*)["\']([^"\']+)',s):
            if imp.startswith('.'):
                import posixpath
                pending.append(posixpath.normpath(posixpath.join(posixpath.dirname(path),imp)))
            else: external.add(imp)
    assert seen==set(f['sources']),(name,seen^set(f['sources']))
    assert external==set(f['external_imports']),(name,external)
    drift[name]=[p for p,digest in f['sources'].items() if h((R/'supabase'/p).read_bytes())!=digest]
    dependencies[name]={'local_files':len(seen),'external':sorted(external),'rpcs':sorted(rpcs),'tables':sorted(tables)}
results.append('five archives: exact members, graph, hashes, configs and frozen dependencies match')
for p,digest in M['sql'].items():
    if p.startswith('sql/sources/'):
        assert h((R/'supabase/migrations'/Path(p).name).read_bytes())==digest,p
results.append('eight migration source copies equal current workspace originals')
inventory=[]
prior=R/'docs/audit/p0-critical-remediation-20261111_131014'
files=list(prior.rglob('*'))+list((R/'docs/audit/full-project-2026-11-11_123321').glob('*.md'))
files+=list((R/'docs/audit').glob('MEDVEDA_PHASE_*2026-11-11.md'))
for p in sorted(set(files)):
    if not p.is_file(): continue
    b=p.read_bytes(); item={'path':str(p.relative_to(R)),'bytes':len(b),'sha256':h(b)}
    if p.suffix in ('.md','.json','.log','.py','.sql','.txt'):
        s=b.decode(errors='replace'); item['lines']=len(s.splitlines())
        if p.suffix=='.md': item['headings']=[x for x in s.splitlines() if x.startswith('#')]
        if p.suffix=='.json':
            try: item['json_valid']=json.loads(s) is not None
            except json.JSONDecodeError: item['json_valid']=False
    inventory.append(item)
(O/'prior-evidence-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
(O/'independent-integrity.json').write_text(json.dumps({'manifest_sha256':h((P/'manifest.json').read_bytes()),'checks':results,'workspace_source_differences':drift,'dependencies':dependencies},indent=2)+'\n')
print(json.dumps({'checks':results,'workspace_source_differences':drift,'review_inventory_files':len(inventory)},indent=2))
