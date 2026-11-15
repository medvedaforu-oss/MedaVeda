"""Debug compilation only. No release, package/sign, cloud build or device access."""
import pathlib,subprocess,os,json,time,sys,signal
root=pathlib.Path(__file__).resolve().parents[4];out=pathlib.Path(__file__).resolve().parent
name=sys.argv[1] if len(sys.argv)>1 else 'native'
tasks=sys.argv[2:] or [':medveda-offline-vault:compileDebugKotlin',':medveda-offline-vault:compileDebugAndroidTestKotlin']
assert tasks and all(t in [':medveda-offline-vault:compileDebugKotlin',':medveda-offline-vault:compileDebugAndroidTestKotlin',':app:compileDebugKotlin'] for t in tasks)
env={k:os.environ[k] for k in ['PATH','HOME','HTTPS_PROXY','HTTP_PROXY','NO_PROXY'] if k in os.environ}
env.update(JAVA_HOME='/usr/lib/jvm/java-21-openjdk-amd64',ANDROID_HOME='/home/ganeshp8545/Android',ANDROID_SDK_ROOT='/home/ganeshp8545/Android',EXPO_NO_DOTENV='1',CI='1')
command=['./gradlew',*tasks,'--no-daemon','--console=plain','--max-workers=1','-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=384m','-Pkotlin.compiler.execution.strategy=in-process']
if 'private' in name:
 env['GRADLE_USER_HOME']=str(root/'mobile-app/android/.gradle-sdk-private')
 installed=list(pathlib.Path('/home/ganeshp8545/.gradle/wrapper/dists/gradle-9.3.1-bin').glob('*/gradle-9.3.1/bin/gradle'))
 assert len(installed)==1
 command[0]=str(installed[0])
 command+=['--project-cache-dir',str(root/'mobile-app/android/.gradle-sdk-project'),'-Dorg.gradle.parallel=false']
if 'offline' in name:command.append('--offline')
started=time.monotonic()
with (out/(name+'.log')).open('w') as log:
 p=subprocess.Popen(command,cwd=root/'mobile-app/android',env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 (out/(name+'-process.json')).write_text(json.dumps(dict(pid=p.pid,command=command),indent=2))
 try:rc=p.wait(timeout=600)
 except subprocess.TimeoutExpired:
  os.killpg(p.pid,signal.SIGTERM);p.wait();rc=124
  log.write('\nBounded compile attempt timed out after 600 seconds; no native compilation PASS.\n')
(out/(name+'-result.json')).write_text(json.dumps(dict(command=command,exit=rc,seconds=round(time.monotonic()-started,2)),indent=2))
print(name,'exit',rc,flush=True);raise SystemExit(rc)
