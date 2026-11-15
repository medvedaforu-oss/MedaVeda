import os, pathlib, socket, subprocess, tempfile
for kind in [socket.SOCK_STREAM, socket.SOCK_DGRAM]:
    try:
        with socket.socket(socket.AF_INET, kind) as s:
            s.bind(('127.0.0.1', 0))
            print(kind.name, 'loopback bind PASS', flush=True)
    except OSError as e:
        print(kind.name, repr(e), flush=True)
with tempfile.TemporaryDirectory(prefix='medveda-toolchain-probe-') as tmp:
    root = pathlib.Path(tmp)
    (root / 'settings.gradle').write_text("rootProject.name = 'medveda-empty-probe'\n")
    (root / 'build.gradle').write_text('')
    env = os.environ.copy()
    env['GRADLE_USER_HOME'] = str(root / 'gradle-home')
    env['GRADLE_OPTS'] = '-Dorg.gradle.java.installations.auto-download=false'
    gradle = '/home/ganeshp8545/.gradle/wrapper/dists/gradle-9.3.1-bin/23ovyewtku6u96viwx3xl3oks/gradle-9.3.1/bin/gradle'
    cmd = [gradle, '--offline', '--no-daemon', '--no-configuration-cache', '--console=plain', '--max-workers=1', '-Dorg.gradle.jvmargs=-Xmx256m -XX:MaxMetaspaceSize=256m', 'help']
    print('EMPTY offline project only; no repository or SDK evaluation', flush=True)
    try:
        p = subprocess.run(cmd, cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=90)
        print(p.stdout)
        print('GRADLE_EXIT', p.returncode)
    except subprocess.TimeoutExpired as e:
        print('GRADLE_TIMEOUT', e.stdout)
