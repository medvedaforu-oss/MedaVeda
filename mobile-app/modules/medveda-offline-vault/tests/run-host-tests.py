#!/usr/bin/env python3
"""Offline Kotlin/JCA tests. No Gradle, Android build, npm install or app access."""
import os
from pathlib import Path
import subprocess
import tempfile
import hashlib

HERE = Path(__file__).resolve().parent
CACHE = Path.home() / '.gradle/caches/modules-2/files-2.1'


def artifact(group, name, version):
    matches = sorted((CACHE / group / name / version).glob(f'*/{name}-{version}.jar'))
    if len(matches) != 1:
        raise SystemExit(f'Requires one cached host artifact: {name} {version}; no downloads attempted')
    return str(matches[0])


compiler = [artifact('org.jetbrains.kotlin', name, '2.1.20') for name in (
    'kotlin-compiler-embeddable', 'kotlin-stdlib', 'kotlin-script-runtime', 'kotlin-reflect')]
compiler += [artifact('org.jetbrains.intellij.deps', 'trove4j', '1.0.20200330'),
             artifact('org.jetbrains.kotlinx', 'kotlinx-coroutines-core-jvm', '1.8.0'),
             artifact('org.jetbrains', 'annotations', '13.0')]
stdlib = compiler[1]
sources = sorted((HERE.parent / 'core').glob('*.kt')) + sorted(HERE.glob('*.kt'))
with tempfile.TemporaryDirectory(prefix='medveda-vault-host-') as work:
    subprocess.run(['node', str(HERE / 'reference-codec.cjs'), 'generate', work], check=True)
    subprocess.run(['java', '-Xmx512m', '-cp', os.pathsep.join(compiler),
                    'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect',
                    '-jvm-target', '17', '-classpath', stdlib, '-d', work,
                    *map(str, sources)], check=True)
    subprocess.run(['java', '-Xmx48m', '-cp', work + os.pathsep + stdlib,
                    'in.medveda.offline.FoundationTestKt', work], check=True)
    subprocess.run(['node', str(HERE / 'reference-codec.cjs'), 'verify', work], check=True)
    for stage in ('file', 'link', 'directory', 'cleanup'):
        root = Path(work) / f'crash-{stage}'
        command = ['java', '-Xmx48m', '-cp', work + os.pathsep + stdlib,
                   'in.medveda.offline.FoundationTestKt']
        crashed = subprocess.run(command + ['crash', stage, str(root)])
        assert crashed.returncode == 91, f'Crash boundary not reached: {stage}'
        baseline_id, digest = (Path(work) / f'{root.name}.baseline').read_text().splitlines()
        assert hashlib.sha256((root / f'{baseline_id}.mvp').read_bytes()).hexdigest() == digest
        finals = list(root.glob('*.mvp'))
        assert len(finals) == (1 if stage == 'file' else 2)
        for p in list(root.glob('*.mvp')) + list(root.glob('*.part')):
            b = p.read_bytes()
            assert b.startswith(b'MVPDF001') and b'%PDF-' not in b
        subprocess.run(command + ['recover', str(root)], check=True)
        print(f'PASS forced JVM halt after {stage}: prior final unchanged; ciphertext only', flush=True)
