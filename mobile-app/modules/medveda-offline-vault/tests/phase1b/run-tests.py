#!/usr/bin/env python3
"""New shared native-control tests only; no Android/iOS acceptance implied."""
import os, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CACHE=Path.home()/'.gradle/caches/modules-2/files-2.1'
def jar(group,name,version):
    found=list((CACHE/group/name/version).glob(f'*/{name}-{version}.jar'))
    if len(found)!=1: raise SystemExit(f'BLOCKED: cached {name} {version} unavailable')
    return str(found[0])
compiler=[jar('org.jetbrains.kotlin',n,'2.1.20') for n in ['kotlin-compiler-embeddable','kotlin-stdlib','kotlin-script-runtime','kotlin-reflect']]
compiler += [jar('org.jetbrains.intellij.deps','trove4j','1.0.20200330'),jar('org.jetbrains.kotlinx','kotlinx-coroutines-core-jvm','1.8.0'),jar('org.jetbrains','annotations','13.0')]
sources=list((ROOT/'core').glob('*.kt'))+list((ROOT/'integration').glob('*.kt'))+list(Path(__file__).parent.glob('*.kt'))
with tempfile.TemporaryDirectory(prefix='medveda-phase1b-') as work:
    subprocess.run(['java','-Xmx512m','-cp',os.pathsep.join(compiler),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-jvm-target','17','-classpath',compiler[1],'-d',work,*map(str,sources)],check=True)
    subprocess.run(['java','-Xmx48m','-cp',work+os.pathsep+compiler[1],'in.medveda.offline.Phase1BTestKt'],check=True)
    for stage in ['file','link','directory']:
        parent=Path(work)/stage
        parent.mkdir()
        command=['java','-Xmx48m','-cp',work+os.pathsep+compiler[1],'in.medveda.offline.Phase1BTestKt']
        crashed=subprocess.run(command+['crash',stage,str(parent/'registry')])
        assert crashed.returncode==91, f'Expected forced halt at {stage}'
        subprocess.run(command+['reopen',stage,str(parent/'registry')],check=True)
