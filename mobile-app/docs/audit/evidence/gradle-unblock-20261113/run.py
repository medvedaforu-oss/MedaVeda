"""Bounded debug compiler evidence; no packaging, signing, or device operations."""
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
mode = sys.argv[1]
label = sys.argv[2] if len(sys.argv) > 2 else mode
assert label.replace('-', '').isalnum()
assert mode in ('offline', 'online', 'app')
env = os.environ.copy()
env.update(JAVA_HOME='/usr/lib/jvm/java-21-openjdk-amd64',
           ANDROID_HOME='/home/ganeshp8545/Android',
           ANDROID_SDK_ROOT='/home/ganeshp8545/Android',
           GRADLE_USER_HOME=str(ROOT / 'android/.gradle-sdk-private'),
           EXPO_NO_DOTENV='1', CI='1')
tasks = [':app:compileDebugKotlin'] if mode == 'app' else [
    ':medveda-offline-vault:compileDebugKotlin',
    ':medveda-offline-vault:compileDebugAndroidTestKotlin']
command = ['/home/ganeshp8545/.gradle/wrapper/dists/gradle-9.3.1-bin/23ovyewtku6u96viwx3xl3oks/gradle-9.3.1/bin/gradle',
           *tasks, '--project-cache-dir', str(ROOT / 'android/.gradle-sdk-project')]
if mode == 'offline':
    command += ['--offline']
command += ['--no-daemon', '--console=plain', '--max-workers=1',
            '-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=384m',
            '-Dorg.gradle.parallel=false', '-Pkotlin.compiler.execution.strategy=in-process']
if mode != 'offline':
    command += ['-Dorg.gradle.internal.http.connectionTimeout=15000',
                '-Dorg.gradle.internal.http.socketTimeout=30000', '--info', '--stacktrace']
started = time.monotonic()
with (OUT / (label + '.log')).open('w') as log:
    proc = subprocess.Popen(command, cwd=ROOT / 'android', env=env,
                            stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    (OUT / (label + '-process.json')).write_text(json.dumps(
        dict(pid=proc.pid, command=command, cwd=str(ROOT / 'android')), indent=2))
    timed_out = False
    try:
        rc = proc.wait(timeout=900)
    except subprocess.TimeoutExpired:
        timed_out = True
        os.killpg(proc.pid, signal.SIGTERM)
        try:
            proc.wait(timeout=30)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
        rc = 124
    result = dict(command=command, exit=rc, timed_out=timed_out,
                  seconds=round(time.monotonic() - started, 2))
    (OUT / (label + '-result.json')).write_text(json.dumps(result, indent=2))
print(json.dumps(result), flush=True)
sys.exit(rc)
