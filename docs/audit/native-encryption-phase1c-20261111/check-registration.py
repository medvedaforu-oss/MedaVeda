#!/usr/bin/env python3
"""Bounded host syntax regression for the locked Expo generator's class expression.
Synthetic declaration only: does NOT compile the Android bridge or certify native acceptance.
"""
import pathlib,json,subprocess,os,tempfile,sys
ROOT=pathlib.Path(__file__).resolve().parents[3]
MODULE=ROOT/'mobile-app/modules/medveda-offline-vault'
CACHE=pathlib.Path.home()/'.gradle/caches/modules-2/files-2.1'
def jar(g,n,v):
 files=list((CACHE/g/n/v).glob('*/'+n+'-'+v+'.jar'));assert len(files)==1,(g,n,v);return str(files[0])
cp=[jar('org.jetbrains.kotlin',n,'2.1.20') for n in ['kotlin-compiler-embeddable','kotlin-stdlib','kotlin-script-runtime','kotlin-reflect']]
cp += [jar('org.jetbrains.intellij.deps','trove4j','1.0.20200330'),jar('org.jetbrains.kotlinx','kotlinx-coroutines-core-jvm','1.8.0'),jar('org.jetbrains','annotations','13.0')]
generator=ROOT/'mobile-app/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/GeneratePackagesListTask.kt'
assert '${classifier}::class.java to ${name?.let' in generator.read_text(), 'Locked generator template changed: re-investigate'
classifier=json.loads((MODULE/'expo-module.config.json').read_text())['android']['modules'][0]
bridge=list((MODULE/'android/src/main/java').rglob('MedvedaOfflineVaultModule.kt'));assert len(bridge)==1
package=bridge[0].read_text().splitlines()[0].removeprefix('package ').strip()
assert package.replace('`','')+'.MedvedaOfflineVaultModule'==classifier
with tempfile.TemporaryDirectory(prefix='medveda-phase1c-registration-') as work:
 p=pathlib.Path(work)
 (p/'Declaration.kt').write_text('package '+package+'\nclass MedvedaOfflineVaultModule\n')
 # Same interpolation as locked GeneratePackagesListTask, including null name.
 (p/'Registration.kt').write_text('package regression\nval modulesMap = mapOf(\n      '+classifier+'::class.java to null\n)\n')
 print('Classifier:',classifier,flush=True)
 print('Synthetic registration source:\n'+(p/'Registration.kt').read_text(),flush=True)
 cmd=['java','-Xmx512m','-cp',os.pathsep.join(cp),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-jvm-target','17','-classpath',cp[1],'-d',str(p/'classes'),str(p/'Declaration.kt'),str(p/'Registration.kt')]
 print('Compiler argv:',json.dumps(cmd),flush=True)
 result=subprocess.run(cmd);print('Compiler exit:',result.returncode,flush=True);sys.exit(result.returncode)
