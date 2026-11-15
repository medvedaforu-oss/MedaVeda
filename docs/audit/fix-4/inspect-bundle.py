from pathlib import Path
import json
base=Path('/tmp/medveda-fix4-bundle-final');maps=list(base.rglob('*.map'));sources=[]
def collect(value):
 sources.extend(value.get('sources',[]))
 for section in value.get('sections',[]):collect(section.get('map',{}))
for p in maps:collect(json.loads(p.read_text()))
patterns=['minimatch','/glob/','@expo/fingerprint','react-native-blob-util']
result={x:[s for s in sources if x in s] for x in patterns}
out={'map_count':len(maps),'source_count':len(sources),'matches':result}
Path('docs/audit/fix-4/bundle-dependency-check.json').write_text(json.dumps(out,indent=2))
assert maps and sources,'No source maps found; cannot classify bundle'
assert not result['minimatch'] and not result['/glob/'] and not result['@expo/fingerprint'],'Advisory package is bundled'
print('PASS',len(maps),'source maps,',len(sources),'sources; minimatch/glob/fingerprint excluded; blob-util runtime sources',len(result['react-native-blob-util']))
