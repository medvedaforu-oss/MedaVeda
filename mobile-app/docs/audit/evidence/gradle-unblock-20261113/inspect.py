"""Read-only host diagnostics and source preservation hashes; omit credential contents."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

out = Path(__file__).resolve().parent
root = out.parents[3]
label = sys.argv[1]
commands = {
    'ram': ['free', '-h'],
    'disk': ['df', '-h', str(root), '/tmp'],
    'java': ['java', '-version'],
    'jdk17': ['/home/ganeshp8545/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2/bin/java', '-version'],
    'cmake': ['/home/ganeshp8545/Android/cmake/3.22.1/bin/cmake', '--version'],
    'ndk_clang': ['/home/ganeshp8545/Android/ndk/27.1.12297006/toolchains/llvm/prebuilt/linux-x86_64/bin/clang', '--version'],
    'java_processes': ['ps', '-C', 'java', '-o', 'pid,ppid,etimes,rss,comm'],
    'locks': ['lslocks', '-o', 'PID,COMMAND,PATH'],
    'private_cache_size': ['du', '-sh', str(root/'android/.gradle-sdk-private')],
    'preflight': ['node', 'scripts/android-vault-preflight.cjs'],
}
result = {}
for name, command in commands.items():
    p = subprocess.run(command, cwd=root, stdout=subprocess.PIPE,
                       stderr=subprocess.STDOUT, text=True, timeout=30)
    result[name] = dict(command=command, exit=p.returncode, output=p.stdout)
(out/(label+'-environment.json')).write_text(json.dumps(result, indent=2))
paths = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=root).split(b'\0')
hashes = {}
for raw in paths:
    if not raw:
        continue
    relative = raw.decode()
    path = root/relative
    if relative.startswith('docs/audit/evidence/gradle-unblock-20261113/') or not path.is_file():
        continue
    hashes[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
# Native android is ignored by git; explicitly protect its authored configuration.
for relative in ['android/build.gradle', 'android/settings.gradle', 'android/gradle.properties',
                 'android/app/build.gradle', 'android/local.properties',
                 'android/gradle/wrapper/gradle-wrapper.properties']:
    hashes[relative] = hashlib.sha256((root/relative).read_bytes()).hexdigest()
(out/(label+'-hashes.json')).write_text(json.dumps(hashes, indent=2, sort_keys=True))
print(label, 'diagnostics saved;', len(hashes), 'file hashes')
