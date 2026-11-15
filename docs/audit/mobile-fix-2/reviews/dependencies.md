# CFG dependency review

Decision: **APPROVE CFG-01 and the partial CFG-02 remediation. CFG-02 remains BLOCKED for complete advisory clearance.**

Reviewed the durable CFG-01/CFG-02 before/after package manifests and lockfiles, both patches and notes, installer/parent-inspection logs, and raw `after/CFG-01.log`, `after/expo-doctor.log`, and `after/CFG-02.log`. This is a dependency-only review; no source, test, or Git changes were made.

Both checkpoints contain identical before snapshots and identical after snapshots. The current mobile manifest and lockfile match those after snapshots byte for byte. Manifest changes are limited to Expo ~57.0.33, expo-constants ~57.0.24, expo-sqlite ~57.0.5, expo-updates ~57.0.28, and the existing react-native-blob-util ^0.24.13. All other manifest fields, including scripts and configuration flags, are unchanged. No override, forced major update, or new native module was added.

The lockfile changes track these updates and their Expo dependencies: fingerprint 0.20.15 → 0.20.16, related Expo tooling/modules, and compatible transitive glob/minimatch/ws patch resolutions. The vulnerable root glob 13.0.6 and its unused path-scurry/lru-cache subtree are removed; nested glob 14 packages remain. Root minimatch becomes 10.2.6. No unrelated direct dependency changes were found. Expo/npm installer logs support the generated manifest/lockfile changes; the initial timeout and subsequent failed attempt are disclosed, followed by successful sequential installer retry (EXIT 0).

CFG-01 raw compatibility check reports “Dependencies are up to date,” EXIT 0. Expo Doctor reports 21/21 passed, EXIT 0. These support approval of SDK 57 patch alignment.

CFG-02 parent metadata shows blob-util 0.24.13 and fingerprint 0.20.16 remove their glob dependency. The final full audit still exits 1 with three moderate findings: minimatch and its fingerprint/Expo parent chain. The recorded advisory GHSA-g3hv-75wg-m249 covers minimatch >=7 <11.0.1, while the compatible fingerprint 0.20.16 requires ^10.2.6. The recorded compatible parent line ends at 0.20.16; npm's suggested Expo 52.0.49 remedy is outside the authorized SDK 57 scope. Therefore complete CFG-02 clearance is blocked pending a compatible upstream parent release or separately authorized dependency strategy. Doctor/compatibility success does not clear this advisory; zero vulnerabilities must not be claimed.

Commit isolation is a separate unresolved constraint: these checkpoint deltas start from pre-existing dirty package files. This approval does not authorize committing that prior content. The orchestrator must preserve the baseline and block a dependency commit if the approved delta cannot be separated safely.
