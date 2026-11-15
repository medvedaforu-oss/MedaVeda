# Validation of the future genuine AAB

Date: 2026-11-11 UTC. Scope: local Android/Firebase/EAS preflight only. No cloud/native build, deployment, Console change, secret creation/upload, payment, production mutation or Play submission was performed. Existing P0/P1/P2 work is preserved.

**Plan only. No AAB or APK was built, downloaded, installed or uploaded here.** Historical artifacts and synthetic validator ZIPs do not certify a current genuine binary. Obtain tools from [bundletool](https://developer.android.com/tools/bundletool) and use an owner-controlled artifact directory.

1. Bind the artifact to the authorized EAS build ID, exact source hashes, CLI/image, production environment and full resolved config from that same job. Keep any sensitive provenance private. Record AAB SHA-256 and preserve cloud logs, manifest-merger report and exact R8 mapping. Do not reuse `evidence/production-public-config.json` from this audit: it lacks the genuine Firebase file, is redacted and predates the build.

2. Set paths in the owner's shell and inspect the bundle without uploading:

```bash
cd /home/ganeshp8545/AyurPulse
AAB=/secure/medveda/artifacts/app-release.aab
BUNDLETOOL_JAR=/opt/android-tools/bundletool-all.jar
ACCEPTANCE_DIR=/secure/medveda/artifacts/acceptance
RELEASE_CONFIG=/secure/medveda/artifacts/resolved-production-config.json
LAST_USED_VERSION_CODE=0  # replace with verified highest-ever-used Play code
mkdir -p "$ACCEPTANCE_DIR"
sha256sum "$AAB" > "$ACCEPTANCE_DIR/aab.sha256"
java -jar "$BUNDLETOOL_JAR" validate --bundle="$AAB"
java -jar "$BUNDLETOOL_JAR" dump manifest --bundle="$AAB" --module=base > "$ACCEPTANCE_DIR/manifest.xml"
java -jar "$BUNDLETOOL_JAR" dump resources --bundle="$AAB" > "$ACCEPTANCE_DIR/resources.txt"
jarsigner -verify -verbose -certs "$AAB" > "$ACCEPTANCE_DIR/jarsigner.txt" 2>&1
java mobile-app/scripts/VerifyAndroidBundleSignature.java "$AAB" > "$ACCEPTANCE_DIR/signature.txt"
python3 mobile-app/scripts/inspect-android-bundle.py "$AAB"   --manifest "$ACCEPTANCE_DIR/manifest.xml"   --release-config "$RELEASE_CONFIG"   --output "$ACCEPTANCE_DIR/bundle-report.json"   --mapping-dir "$ACCEPTANCE_DIR/mapping"   --expect-optimized --min-version-code "$LAST_USED_VERSION_CODE"
```

Replace every example path and the version baseline first. Run each command with exit-status checking; stop at any failure. JAR verification may warn about an expected self-signed upload certificate; manually verify trust by comparing the public SHA-256 signer fingerprint with the approved upload certificate, not by accepting an arbitrary self-signed key. The Java verifier must report no unsigned payload entries, no duplicate ZIP entries and exactly one expected signer. The upload signature and Play-installed signing certificate serve different purposes. Do not use apksigner to validate an AAB signature.

3. Inspect `manifest.xml`: exact package `in.medveda.app`, versionName `1.2.2`, positive new versionCode strictly above the verified baseline; expected min/target SDK, non-debuggable/non-testOnly, backup false, cleartext false, resizable MainActivity with unspecified orientation/adjustResize. Review exported components, intent filters and URI queries. Inspect the merged manifest/report for the exact permission inventory and absence of blocked permissions; retain BILLING. Review every module, including any dynamic features, rather than assuming base covers everything.

4. Use resources.txt/packaged resources privately to verify `google_app_id`, `gcm_defaultSenderId`, `project_id` and `google_api_key` correspond to the genuine approved client file. Check the Google Services plugin ran in build logs and the generated resources came from that exact file. Never copy service-account private keys into this check or public reports. Confirm production Expo metadata has disabled provider, standard distribution, production target, false enrollment/acceptance flags and runtime `1.2.2-disabled-notes-choice-v1`.

5. Confirm R8 metadata and mapping belong to this AAB, record the mapping hash, review native dependency provenance/Billing integration, PDF JNI keep rules, all shipped ABIs and native library page alignment. Check 16 KB ELF and APK ZIP alignment using the [Android page-size procedure](https://developer.android.com/guide/practices/page-sizes); the Python inspector does not implement ELF/page-alignment checks. Use approved local tool versions and retain outputs.

6. If APK generation/install/device QA is separately authorized, use bundletool to produce a test APK set using the approved signer without exposing passwords, inspect it using aapt2/apksigner and `zipalign -c -P 16 -v 4`, and install only on approved test devices. No production records or financial operations are authorized by a build. Verify native startup, PDF/open/download/offline ownership, layout/TalkBack/back/keyboard, release R8 behavior and 16 KB runtime. Follow Firebase/FCM device acceptance only with approved QA writes. Do not make genuine purchases.

Validator limits: the Python inspector requires an externally supplied XML manifest and resolved config. It does not cryptographically bind them to the bundle, validate all compiled JS/native guards, prove Firebase authenticity, inspect all exported components, enforce every SDK/versionName property, verify signatures or native 16 KB compatibility. Bundletool must extract the XML from the exact AAB, the config must be captured from the same build, and the independent signature/manual/device checks above remain mandatory. Tests demonstrate rejection behavior, not compiled artifact correctness. Missing `--manifest` permits measurement only; never treat measurement as release acceptance.

No Play upload/publication follows automatically. Report artifact acceptance separately from build permission, notification delivery, payment policy and production release approval.
