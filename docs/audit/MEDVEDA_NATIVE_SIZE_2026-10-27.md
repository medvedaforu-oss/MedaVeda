# Native Android artifact measurements — 27 October 2026

Production baseline: `99c91a4`, versionCode **6**. Candidate: `4a4416b`, versionCode **7**. Both are MedVeda **1.2.1**, package `in.medveda.app`, API **36**, min SDK **24**, non-debuggable, backup/cleartext disabled. These were built from isolated source checkouts with the existing production EAS profile and locked dependencies. The native baseline was built later from the unchanged original commit; it is not an older unrelated release.

Four EAS builds completed successfully. No Play submission, OTA publication, database operation or provider transaction occurred. The production EAS remote version counter advanced from 5 to 7 through its existing auto-increment setting; a subsequent production build will increment again. The test controls use versionCode 7.

| Artifact | EAS build | Source / condition |
| --- | --- | --- |
| Production before | [d9756efb-968a-408a-8f44-004bf6302e34](https://expo.dev/accounts/ganeshp0305/projects/ayurpulse/builds/d9756efb-968a-408a-8f44-004bf6302e34) | `99c91a4`, production |
| Production after | [2214fa7b-4166-4f6d-81af-94377f1dc774](https://expo.dev/accounts/ganeshp0305/projects/ayurpulse/builds/2214fa7b-4166-4f6d-81af-94377f1dc774) | `4a4416b`, production |
| R8/resource shrink trial | [042b1ed6-e008-4872-9980-9976bf997274](https://expo.dev/accounts/ganeshp0305/projects/ayurpulse/builds/042b1ed6-e008-4872-9980-9976bf997274) | `4a4416b`, existing shrink-test / ANDROID_SHRINK=1 |
| Matching APK control | [6bc5b693-21e7-4f87-b605-3a01e70d3686](https://expo.dev/accounts/ganeshp0305/projects/ayurpulse/builds/6bc5b693-21e7-4f87-b605-3a01e70d3686) | `4a4416b` plus temporary ANDROID_SHRINK=0 in the same test profile |

Raw artifacts remain in `/tmp/medveda-native` for this session and can be downloaded again from those EAS pages. Checksums, manifests, per-file inventories, alignment checks and size estimates are retained in [native before](evidence/perf-size-20261027/native-before.json), [native after](evidence/perf-size-20261027/native-after.json), [shrink trial](evidence/perf-size-20261027/native-shrink.json), [control](evidence/perf-size-20261027/native-unshrunk-test.json). No signed artifact/log URLs or private signing keys are in these records.

## Comparable sizes

All sizes are decimal bytes. Device configurations are Android API 36, English, density 420, and the single listed ABI. Per-ABI delivery includes base + ABI + language + density APKs; it is not just the native-library split. These are APK file sizes, **not OS installed-size measurements**.

| Metric | Before B | After B | Saved B |
| --- | ---: | ---: | ---: |
| Production AAB | 90,914,706 | 88,979,545 | 1,935,161 |
| Universal APK (same local analysis signer) | 136,878,504 | 134,828,067 | 2,050,437 |
| arm64-v8a device APK split set | 82,435,695 | 80,385,258 | 2,050,437 |
| armeabi-v7a device APK split set | 73,326,245 | 71,275,808 | 2,050,437 |
| x86 device APK split set | 83,168,717 | 81,118,280 | 2,050,437 |
| x86_64 device APK split set | 83,062,302 | 81,011,865 | 2,050,437 |
| Embedded Hermes bytecode | 6,600,124 | 6,290,352 | 309,772 |

AAB savings: **2.1%**. Universal APK savings: **1.5%**. The canonical JS export reported separately has different Hermes debug metadata; the embedded bundle is verified to match the export’s Hermes magic header.

## Estimated Play compressed download

Measured with pinned bundletool **1.18.3** (`get-size total`, overall, `--dimensions=ABI`, and each fixed device spec). This is a local estimate; actual Play Console delivery can differ. The same disposable signing key was used for both generated APK sets. [Official bundletool sizing method](https://developer.android.com/tools/bundletool).

| Configuration | Before B | After B | Saved B |
| --- | ---: | ---: | ---: |
| arm64-v8a, API 36 / en / 420 dpi | 33,652,295 | 31,724,676 | 1,927,619 |
| armeabi-v7a, API 36 / en / 420 dpi | 32,205,916 | 30,278,325 | 1,927,591 |
| x86, API 36 / en / 420 dpi | 34,315,895 | 32,388,291 | 1,927,604 |
| x86_64, API 36 / en / 420 dpi | 33,999,064 | 32,071,457 | 1,927,607 |
| All supported device configurations (range) | 31,816,859–34,508,679 | 29,890,412–32,581,061 | Compare identical devices above |

For the fixed arm64 configuration this is **5.7%** less estimated compressed download. Across matched fixed devices the saving is about **1.93 MB**. Native ABI split sizes are unchanged: arm64 28,776,800 B, armeabi-v7a 19,667,350 B, x86 29,509,822 B, x86_64 29,403,407 B. The common master split decreases from 53,242,881 to 51,192,444 B; English stays 57,690 B and xxhdpi 358,324 B.

## AAB components (uncompressed entry bytes)

| Component | Before B | After B |
| --- | ---: | ---: |
| Native libraries, all four ABIs | 106,389,060 | 106,389,060 |
| DEX | 40,486,340 | 40,484,528 |
| Hermes | 6,600,124 | 6,290,352 |
| Android resources, including fonts/images | 9,653,956 | 6,126,013 |
| Other assets | 16,012 | 10,135 |
| Other / build metadata | 95,720,130 | 95,714,101 |

Fonts are Android `res/raw/*.ttf` resources in these artifacts: **19 → 2** files, **4,076,840 → 555,272 B**. Both retained fonts match their baseline SHA-256 values. Raster image bytes are **2,649,024 → 2,647,699 B** (only **1,325 B** less after native processing). Source/export PNG savings are larger; they are not claimed as native APK savings.

All **243** common native PNG/WebP/JPEG resources have identical decoded pixels; **242** are byte-identical. The one changed PNG is `base/res/drawable-mdpi-v4/assets_icon.png`, 886,239 → 884,914 B. [Native pixel comparison](evidence/perf-size-20261027/native-images.json).

The AAB contains **93,540,668 B** of native debug symbols (**24,432,526 ZIP bytes**) before and after. Those upload metadata files are absent from the generated universal APK and do not belong in a device download estimate. Symbols were retained for native crash diagnosis.

## Largest 15 AAB entries

Uncompressed sizes; the same 15 paths rank largest in both artifacts. Symbols in `BUNDLE-METADATA` are upload metadata, not delivered native libraries.

| Entry | Before B | After B |
| --- | ---: | ---: |
| `BUNDLE-METADATA/com.android.tools.build.debugsymbols/arm64-v8a/libreactnative.so.sym` | 11,353,552 | 11,353,552 |
| `BUNDLE-METADATA/com.android.tools.build.debugsymbols/x86/libreactnative.so.sym` | 10,844,052 | 10,844,052 |
| `BUNDLE-METADATA/com.android.tools.build.debugsymbols/x86_64/libreactnative.so.sym` | 10,756,120 | 10,756,120 |
| `base/dex/classes4.dex` | 10,279,260 | 10,279,260 |
| `base/dex/classes.dex` | 9,546,616 | 9,546,616 |
| `base/dex/classes3.dex` | 9,324,324 | 9,322,512 |
| `base/dex/classes2.dex` | 8,968,540 | 8,968,540 |
| `BUNDLE-METADATA/com.android.tools.build.debugsymbols/armeabi-v7a/libreactnative.so.sym` | 8,810,804 | 8,810,804 |
| `base/lib/x86/libreactnative.so` | 7,362,736 | 7,362,736 |
| `base/lib/x86_64/libreactnative.so` | 7,098,048 | 7,098,048 |
| `base/lib/arm64-v8a/libreactnative.so` | 6,985,168 | 6,985,168 |
| `base/assets/index.android.bundle` | 6,600,124 | 6,290,352 |
| `base/lib/x86_64/libpdfium.so` | 4,966,672 | 4,966,672 |
| `base/lib/armeabi-v7a/libreactnative.so` | 4,859,120 | 4,859,120 |
| `base/lib/arm64-v8a/libpdfium.so` | 4,771,352 | 4,771,352 |

## Native libraries per ABI

All **108** native-library paths and SHA-256 values are unchanged. The table gives each library’s uncompressed bytes; before = after. The JSON inventories also include ZIP bytes and each ELF/ZIP alignment result.

| Library | arm64-v8a B | armeabi-v7a B | x86 B | x86_64 B |
| --- | ---: | ---: | ---: | ---: |
| `libappmodules.so` | 1,362,864 | 1,005,948 | 1,403,336 | 1,390,760 |
| `libc++_shared.so` | 1,292,904 | 872,872 | 1,254,988 | 1,252,080 |
| `libdatastore_shared_counter.so` | 7,112 | 4,416 | 5,148 | 6,224 |
| `libexpo-modules-core.so` | 1,496,064 | 1,062,296 | 1,408,200 | 1,457,448 |
| `libexpo-sqlite.so` | 1,830,224 | 1,267,940 | 1,982,760 | 1,880,848 |
| `libexpo-updates.so` | 101,912 | 60,824 | 107,716 | 113,552 |
| `libfbjni.so` | 177,000 | 119,456 | 166,480 | 172,952 |
| `libgesturehandler.so` | 38,456 | 8,420 | 34,680 | 35,608 |
| `libgifimage.so` | 318,992 | 184,380 | 281,448 | 302,952 |
| `libhermestooling.so` | 141,432 | 76,548 | 136,716 | 138,128 |
| `libhermesvm.so` | 2,477,320 | 1,700,248 | 3,019,744 | 2,591,976 |
| `libimagepipeline.so` | 8,760 | 5,876 | 7,040 | 8,464 |
| `libjsi.so` | 412,696 | 289,716 | 437,228 | 418,872 |
| `libnative-filters.so` | 23,712 | 12,588 | 22,040 | 30,528 |
| `libnative-imagetranscoder.so` | 585,376 | 341,072 | 664,736 | 720,432 |
| `libpdfium.so` | 4,771,352 | 3,194,528 | 4,526,852 | 4,966,672 |
| `libpdfiumandroid.so` | 432,200 | 269,808 | 374,444 | 418,720 |
| `libreact_codegen_rnscreens.so` | 1,200,424 | 853,692 | 1,244,856 | 1,225,728 |
| `libreact_codegen_safeareacontext.so` | 159,208 | 97,972 | 153,476 | 159,728 |
| `libreactnative.so` | 6,985,168 | 4,859,120 | 7,362,736 | 7,098,048 |
| `libreanimated.so` | 1,500,888 | 965,552 | 1,428,124 | 1,538,464 |
| `librnscreens.so` | 100,904 | 51,704 | 93,560 | 97,696 |
| `libsentry-android.so` | 16,832 | 12,080 | 14,760 | 16,384 |
| `libsentry.so` | 723,712 | 470,964 | 742,304 | 710,280 |
| `libstatic-webp.so` | 501,856 | 367,592 | 550,092 | 560,968 |
| `libworklets.so` | 1,101,120 | 730,468 | 968,828 | 1,055,472 |
| `libzstd-kmp.so` | 731,872 | 566,996 | 857,780 | 816,568 |

The x86 + x86_64 native components account for **58,435,624 B** in the universal APK. This is a component-only estimate of the potential direct-APK saving before ZIP/header/alignment changes, **not** a measured restricted-ABI APK. No ABI was removed. Arm64 Play delivery already excludes those native splits; no corresponding saving is claimed for arm64 Play users.

## API, signing and 16 KB checks

Both AABs pass `bundletool validate` and `jarsigner -verify`, request API **36**, and set native-library alignment to **PAGE_ALIGNMENT_16K**. All **54** 64-bit `.so` files in each artifact have PT_LOAD alignment at least 16,384 B; all 54 are also 16 KB aligned in each generated universal APK. The same static checks pass for both cloud test APKs. The parser was independently checked against GNU `readelf -lW` on Hermes, React Native and pdfium libraries in both universal APKs.

Google `apksig.ApkVerifier` checks pass over APIs 24–36 for all four APKs. The cloud shrink/control APKs have the same signer certificate; the two generated universal APKs share the disposable analysis signer. These local analysis APKs are not Play App Signing artifacts and do not qualify licensed Play purchases. [Signature evidence](evidence/perf-size-20261027/native-signatures.json).

These are **static** checks. No connected device/emulator exists, so a 16 KB native launch, PDF/IAP/FCM/WebView smoke pass, actual installed size, cold start/TTI, FPS and memory remain unmeasured. No runtime compatibility claim replaces that checklist.

## Existing shrink-test versus matching unshrunk control

| Metric | Unshrunk control B | Shrink trial B | Saved B |
| --- | ---: | ---: | ---: |
| Signed APK | 134,750,072 | 124,943,608 | 9,806,464 |
| DEX (uncompressed) | 40,484,528 | 12,942,600 | 27,541,928 |
| Resources (uncompressed) | 5,378,838 | 5,125,728 | 253,110 |

Observed APK reduction: **9,806,464 B (7.3%)**. Same candidate code, test profile/channel/environment, versionCode 7 and signer. Only the temporary control checkout’s `ANDROID_SHRINK` value changes from 1 to 0; the repository’s `eas.json` stays unchanged. Embedded Hermes SHA-256 and all native-library hashes match across the two APKs. This isolates the R8/resource-shrinking trial without changing production. Native build success does not prove reflective/JNI/runtime behavior; production shrinking **remains off** pending the full device checklist and owner approval.

## Permissions

The before/after production manifests declare the same **30** permissions. None was removed. The exact list is retained below for review; library badge/FCM/biometric/capture permissions need their own device-supported removal decision, with negligible size gain. The signature-level dynamic receiver permission protects AndroidX receivers and should not be removed as a size optimization.

- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.ACCESS_WIFI_STATE`
- `android.permission.DETECT_SCREEN_CAPTURE`
- `android.permission.INTERNET`
- `android.permission.POST_NOTIFICATIONS`
- `android.permission.READ_APP_BADGE`
- `android.permission.RECEIVE_BOOT_COMPLETED`
- `android.permission.USE_BIOMETRIC`
- `android.permission.USE_FINGERPRINT`
- `android.permission.VIBRATE`
- `android.permission.WAKE_LOCK`
- `com.anddoes.launcher.permission.UPDATE_COUNT`
- `com.android.vending.BILLING`
- `com.google.android.c2dm.permission.RECEIVE`
- `com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE`
- `com.htc.launcher.permission.READ_SETTINGS`
- `com.htc.launcher.permission.UPDATE_SHORTCUT`
- `com.huawei.android.launcher.permission.CHANGE_BADGE`
- `com.huawei.android.launcher.permission.READ_SETTINGS`
- `com.huawei.android.launcher.permission.WRITE_SETTINGS`
- `com.majeur.launcher.permission.UPDATE_BADGE`
- `com.oppo.launcher.permission.READ_SETTINGS`
- `com.oppo.launcher.permission.WRITE_SETTINGS`
- `com.sec.android.provider.badge.permission.READ`
- `com.sec.android.provider.badge.permission.WRITE`
- `com.sonyericsson.home.permission.BROADCAST_BADGE`
- `com.sonymobile.home.permission.PROVIDER_INSERT_BADGE`
- `in.medveda.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
- `me.everything.badger.permission.BADGE_COUNT_READ`
- `me.everything.badger.permission.BADGE_COUNT_WRITE`

## Reproduction and remaining work

The pinned tool checksum, device spec, signing distinction and temporary R8 control are in [native methods](evidence/perf-size-20261027/native-methods.json). [Main audit and exact release/bundletool/Play Console commands](MEDVEDA_PERF_SIZE_2026-10-27.md), [manual Android performance and critical-flow checklist](MEDVEDA_PERF_ANDROID_CHECKLIST_2026-10-27.md). No new app logic or dependency/configuration change was needed for this follow-up; `measure-mobile-size.py` gains read-only ELF/ZIP/component inspection only.
