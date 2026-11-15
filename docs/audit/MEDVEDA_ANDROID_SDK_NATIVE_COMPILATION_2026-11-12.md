# MedVeda Android SDK setup and native compilation

SDK setup: 12 November 2026 UTC. Updated: 13 November 2026 UTC. This report supersedes only the SDK/environment portion of the earlier AUD-008 report. PDF encryption remains disabled. No production release, APK packaging, signing, upload, deployment, migration, payment or device operation was initiated.

## Environment and SDK resolution

Detected Debian GNU/Linux 13 (trixie), Linux x86-64. Java and javac are OpenJDK **21.0.12.1**, actual JDK path `/usr/lib/jvm/java-21-openjdk-amd64`. The project's Gradle wrapper **9.3.1** runs with this JDK; `gradle-version.log` records the actual output. Gradle's embedded Kotlin is 2.2.21; the project's Kotlin Android compiler remains **2.1.20**. These are different components, not a version conflict by themselves.

The SDK was genuinely missing, not merely unconfigured. `ANDROID_HOME` and `ANDROID_SDK_ROOT` already pointed to absent `/home/ganeshp8545/Android`. The common home, `/opt`, `/usr/local` and `/usr/lib/android-sdk` locations contained no usable `android.jar` or SDK manager. The system `/usr/lib/android-sdk` contained platform-tools only; `/usr/bin/adb` alone is not an SDK.

**SDK installation: COMPLETE.** Installed without replacing prior files:

| Package | Installed requirement |
| --- | --- |
| Command-line tools | 23.0, bootstrapped from Google's current repository metadata |
| Platform tools | Google's selected stable Linux package; exact installed revision in `installed-packages.json` |
| Platform | `platforms;android-36`, revision 2 |
| Build tools | `build-tools;36.0.0` |
| NDK | `ndk;27.1.12297006` (r27b), plus `ndk;27.0.12077973` selected by Expo Updates/AGP during actual project configuration |
| CMake | `cmake;3.22.1` |

Requirements were read from the installed React Native catalog and existing native configuration, not inferred from the previous report. Project compile/target SDK remain 36, app min SDK 24, AGP 8.12.0; the dormant vault's existing runtime policy still denies below API 28.

The official repository XML selected `commandlinetools-linux-16111833_latest.zip`, newer than the previous report's example bootstrap. Download size and Google's published checksum were verified before extraction. The first bootstrap rename from `/tmp` failed because `/tmp` and home are different filesystems; extraction was retried in a new SDK-local staging directory and completed without overwriting an existing target. The first package-manager invocation consequently could not find the tool; the successful installation rerun is recorded separately. Package installation exited 0. Modern `sdkmanager` delegates to Android CLI; its deprecation warning is not an installation failure. No `android init` or agent resource installation was run.

The successful SDK preflight finds all required packages. Genuine local Firebase configuration validates unchanged; cloud delivery, credentials and device acceptance remain unverified. File presence is not a native compilation result.

## Local configuration and reproducible commands

Added the previously absent, git-ignored `mobile-app/android/local.properties`:

```properties
sdk.dir=/home/ganeshp8545/Android
```

Both SDK environment variables already had this same path and now resolve to the real installation. Builds explicitly set both plus JAVA_HOME. No shell startup files were overwritten. For another terminal:

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=/home/ganeshp8545/Android
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Safe package installation/verification commands for this detected Linux environment, using the now-installed official manager:

```bash
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" --licenses
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" --install \
  'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' \
  'ndk;27.1.12297006' 'ndk;27.0.12077973' 'cmake;3.22.1'
node mobile-app/scripts/android-vault-preflight.cjs
```

For a fresh machine, first download/extract the official command-line tools and validate the checksum against fresh Google repository metadata; do not overwrite an existing `cmdline-tools/latest`. This machine's selected archive/size/checksum are recorded in `sdk-packages.json`. [Official SDK manager installation and package commands](https://developer.android.com/tools/sdkmanager).

## Compilation result

**Native compilation: FAIL / BLOCKED (not verified). No completed native source compilation or Android artifact is claimed.** The SDK-location failure is resolved, but later environment failures occurred before Kotlin/Java source compilation.

| Attempt | Observed result |
| --- | --- |
| Original debug compile after SDK installation | Reached actual project/module configuration and installed the additional NDK 27.0.12077973 required by Expo Updates; interrupted, no final compiler result. |
| Resumed shared-cache offline compile | **FAILED, exit 1** after 169.7 seconds: timeout acquiring `/home/ganeshp8545/.gradle/caches/9.3.1/fileHashes/fileHashes.lock`. The reported owner was PID 2147 and this invocation PID 3593. |
| Private Gradle home/project cache compile | **TIMED OUT, exit 124** after the 600-second bound (624.53 seconds including shutdown). No source compiler diagnostics. |
| Private-cache offline attempt | **FAILED, exit 1**, 61.89 seconds: `foojay-resolver-1.0.0.jar` unavailable to offline resolution. |
| Artifact-only repair/retry | **FAILED, exit 1**, 28.04 seconds with the same offline resolution diagnostic; repository metadata was also required. |
| Complete artifact + repository metadata seed/retry | **Interrupted before source compilation**; private daemon log reports shutdown in response to interruption, and no completed result JSON exists. Not a PASS. |

Concurrent Gradle processes belonging to VS Code's Gradle importer and Java language service were observed. They were left running; no IDE process was killed, global daemon stop issued or shared lock file deleted. The lock error confirms contention but does not prove that either observed IDE process was the particular PID reported in the earlier namespace. Private caches avoid reusing the global file-hash cache; they do not establish that source compilation succeeded.

No Kotlin/Java source compilation error was produced in these attempts. The latest private-cache retry was interrupted, and its daemon has exited; it is not a background accepted build. Consequently **no source or dependency-version fix is justified by these logs**. The missing jar was found in the existing shared cache; 341 small immutable artifacts and a 4,600,195-byte repository-metadata snapshot were copied into the private cache without shared lock files. No Gradle, AGP, Expo, React Native or Kotlin version was changed. Java 21 runs the wrapper and reaches Android project configuration. AGP 8.12 documents JDK 17 and Gradle 8.13 minimums and API 36 support; the project's actual generated wrapper remains 9.3.1. This is evidence of startup/configuration compatibility, not a claim that the full dependency stack has compiled. [AGP compatibility reference](https://developer.android.com/build/releases/agp-8-12-0-release-notes).

Debug-only command used (no packaging/signing/release task):

```bash
cd /home/ganeshp8545/AyurPulse/mobile-app/android
./gradlew :medveda-offline-vault:compileDebugKotlin \
  :medveda-offline-vault:compileDebugAndroidTestKotlin \
  --no-daemon --console=plain --max-workers=1 \
  '-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=384m' \
  -Pkotlin.compiler.execution.strategy=in-process
```

`run-native-compile.py` records exact commands, process/result JSON and logs, including isolated Gradle-home/project-cache variants. These compile only the vault and its Android test sources. They neither run instrumentation nor compile/package the complete app.

## Preservation and remaining blockers

Only the new local SDK/tooling, generated Gradle caches, evidence/report and previously absent ignored `local.properties` were prepared. Existing downloads, quiz/user data, Firebase configuration, signing configuration and production profiles were not changed. Native encryption capabilities remain literal `contentEnabled=false`, `nativeAccepted=false`; no activation API was added.

Remaining requirements:

1. Obtain a completed debug native compiler result in a quiet build environment with sufficient memory/disk and no competing cache ownership. Do not remove lock files while another process may own them. Pause competing IDE imports manually or use an isolated build environment; do not silently terminate the user's IDE.
2. Fix only actual compiler diagnostics when they become available. A cache-lock timeout or launcher timeout is not evidence of a vault source defect.
3. After vault/test-source compilation succeeds, compile the application's debug sources with `./gradlew :app:compileDebugKotlin`, then run the isolated device/instrumentation acceptance. Neither has passed in this task.
4. The original AUD-008 native authorization, application integration, preservation/migration and physical-device gates remain open. SDK installation alone does not close them.
5. For APK acceptance, verify existing Firebase cloud file delivery and signing credentials, obtain approval to start the build, then build/test the exact standalone artifact. No production profile or real payment is needed to prove native source compilation.

## Next command for APK acceptance — not executed

After compiler gates pass, existing inputs are verified and build approval is given:

```bash
cd /home/ganeshp8545/AyurPulse/mobile-app
eas build --platform android --profile razorpay-live-testing --non-interactive --freeze-credentials
```

This preserves the existing standalone profile and credential policy. It is not an authorization to initiate live payments, deploy backend changes, publish to Play or enable encryption. No APK or production release was built by this work.

All evidence: `docs/audit/evidence/android-sdk-compile-20261112/`. Historical logs retain their original dates/names. The prior AUD-008 report remains unchanged; this report supersedes its missing-SDK finding only.

## Final verified status

- **SDK:** installed and configured at `/home/ganeshp8545/Android`; final package-presence preflight passes. Both NDK revisions required during configuration are present.
- **Java/Gradle:** OpenJDK 21.0.12.1 runs Gradle 9.3.1 and the SDK-configured Android project reaches module configuration. Full native stack compilation is still unverified.
- **Native compilation:** **FAIL / BLOCKED**, never recorded as PASS. The first completed Gradle failure is a shared-cache lock timeout; later attempts failed offline dependency resolution, timed out or were interrupted before compiler output.
- **Confirmed native source defects:** none identified, because Kotlin/Java source compilation did not complete or emit source diagnostics. Source/dependency versions were preserved.
- **Immediate next step:** allow an uninterrupted debug compilation attempt with the now-seeded private cache, or run in a quiet isolated build environment. Use the exact command below; then address actual compiler diagnostics. Do not delete shared locks or silently stop IDE processes.
- **Preservation:** every file in the initial protected-source/config inventory is unchanged (`preserved-source.json`). `local.properties` is the only local project configuration addition; generated private caches and reports/evidence are separate. Encryption stays disabled. No user data, Firebase/signing settings or production profiles were changed.

Exact private-cache retry (debug compiler tasks only), from this machine:

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=/home/ganeshp8545/Android
export ANDROID_SDK_ROOT="$ANDROID_HOME"
cd /home/ganeshp8545/AyurPulse/mobile-app/android
export GRADLE_USER_HOME="$PWD/.gradle-sdk-private"
/home/ganeshp8545/.gradle/wrapper/dists/gradle-9.3.1-bin/23ovyewtku6u96viwx3xl3oks/gradle-9.3.1/bin/gradle \
  :medveda-offline-vault:compileDebugKotlin \
  :medveda-offline-vault:compileDebugAndroidTestKotlin \
  --project-cache-dir "$PWD/.gradle-sdk-project" \
  --offline --no-daemon --console=plain --max-workers=1 \
  '-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=384m' \
  -Dorg.gradle.parallel=false -Pkotlin.compiler.execution.strategy=in-process
```

If a new dependency is absent, rerun without `--offline` using the same private cache and verify that dependency resolution completes. Do not call SDK preflight, cached Gradle plugin tasks, launcher startup or an interrupted invocation a native build success. APK acceptance still requires the separately approved build command above, a successful artifact and device tests.
