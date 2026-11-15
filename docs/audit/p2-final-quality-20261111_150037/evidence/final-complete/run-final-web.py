from pathlib import Path
import os,json,subprocess,time
R=Path('/home/ganeshp8545/AyurPulse');O=Path(__file__).resolve().parent
E={k:os.environ[k] for k in ['PATH','HOME']};E.update(EXPO_NO_DOTENV='1',EXPO_OFFLINE='1',EXPO_NO_TELEMETRY='1',CI='1',EAS_BUILD_PROFILE='production',EAS_BUILD_PLATFORM='android');E.update(json.loads((R/'mobile-app/eas.json').read_text())['build']['production']['env'])
cmd=['node','node_modules/expo/bin/cli','export','--platform','web','--output-dir','/tmp/medveda-p2-web-dist-exact'];start=time.monotonic()
with (O/'final-web-build.log').open('w') as log:p=subprocess.run(cmd,cwd=R/'mobile-app',env=E,stdout=log,stderr=subprocess.STDOUT,timeout=240)
(O/'final-web-build.json').write_text(json.dumps(dict(command=cmd,exit_code=p.returncode,seconds=round(time.monotonic()-start,2),source_inventory='mobile-source-inventory.json'),indent=2)+'\n')
print('current-source web export',p.returncode);raise SystemExit(p.returncode)
