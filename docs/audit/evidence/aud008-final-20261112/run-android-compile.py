"""Offline compilation attempt only, bounded; no SDK install or cloud upload."""
import pathlib,subprocess,os,signal,json
root=pathlib.Path(__file__).resolve().parents[4];out=pathlib.Path(__file__).resolve().parent
env={k:os.environ[k] for k in ('PATH','HOME','JAVA_HOME','ANDROID_HOME','ANDROID_SDK_ROOT') if k in os.environ};env.update(EXPO_NO_DOTENV='1',CI='1')
cmd=['./gradlew',':medveda-offline-vault:compileDebugKotlin','--offline','--no-daemon']
with (out/'android-compile.log').open('w') as log:
 p=subprocess.Popen(cmd,cwd=root/'mobile-app/android',env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 try:rc=p.wait(timeout=90)
 except subprocess.TimeoutExpired:
  os.killpg(p.pid,signal.SIGTERM);p.wait();rc=124
  log.write('\nTIMEOUT: native compilation did not complete within 90 seconds; no compilation PASS.\n')
(out/'android-compile-result.json').write_text(json.dumps(dict(command=cmd,exit=rc,acceptance='NOT_ACCEPTED'),indent=2))
raise SystemExit(rc)
