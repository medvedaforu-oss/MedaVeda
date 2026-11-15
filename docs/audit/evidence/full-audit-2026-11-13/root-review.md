# Build, dependency and verification review

Application code was not changed. Checks use installed dependencies, public registries, metadata-only production reads, synthetic local databases, and temporary native host builds. Source code findings below are proposals only.

### CFG-01 — Medium — Required Expo SDK patch compatibility check fails

**Status:** Confirmed. **Files:** `mobile-app/package.json:26`, `:30`, `:38`, `:41`, and the corresponding installed lockfile entries. Fresh online `expo-doctor` reports 20/21 passed, and `expo install --check` exits 1. This supersedes the initial offline compatibility check, which had passed using its cached manifest.

```json
"expo": "~57.0.32",
"expo-constants": "~57.0.19",
"expo-sqlite": "~57.0.4",
"expo-updates": "~57.0.27"
```

**Root cause:** Installed lockfile versions are behind the current SDK 57 compatibility manifest: Expo 57.0.32 versus expected ~57.0.33, Constants 57.0.23 versus ~57.0.24, SQLite 57.0.4 versus ~57.0.5, Updates 57.0.27 versus ~57.0.28. This demonstrates a failed required compatibility gate; it does not establish a specific crash in those releases.

**Failure scenario:** A release built from this lockfile fails the requested Expo compatibility check and omits current compatible SDK patch fixes. Native changes must be qualified in a new binary, not presumed repaired by OTA.

**Proposed diff:**

```diff
--- a/mobile-app/package.json
+++ b/mobile-app/package.json
-    "expo": "~57.0.32",
+    "expo": "~57.0.33",
-    "expo-constants": "~57.0.19",
+    "expo-constants": "~57.0.24",
-    "expo-sqlite": "~57.0.4",
+    "expo-sqlite": "~57.0.5",
-    "expo-updates": "~57.0.27",
+    "expo-updates": "~57.0.28",
```

Regenerate the mobile lockfile using Expo's compatible installer after Phase 2 approval, then repeat Doctor/type/lint/tests and native PDF/billing/update acceptance. Do not suppress Doctor's check to manufacture a pass.

### CFG-02 — Medium — Mobile and lint toolchains contain published dependency advisories

**Status:** Confirmed advisory matches; application exploitability not demonstrated. **Files:** `mobile-app/package.json:26,48`, `tooling/package.json:9,12`, their lockfiles, and raw `mobile-npm-audit.log` / `tooling-npm-audit.log`.

```json
"react-native-blob-util": "^0.24.10"
"eslint": "10.13.0"
"typescript-eslint": "8.59.4"
```

**Root cause:** The resolved dependency graphs include vulnerable glob/minimatch versions. Fresh npm audit finds mobile **4 moderate, 0 high, 0 critical**, tooling **9 moderate, 0 high, 0 critical**, and admin **0**. Counts include transitive affected packages, not 13 independent root vulnerabilities. Mobile paths include `@expo/fingerprint`, `glob`, `minimatch`, and `react-native-blob-util`; tooling paths include ESLint/typescript-eslint and minimatch.

**Failure scenario:** Untrusted/adversarial glob inputs can amplify filesystem/pattern work in affected tooling. This is not evidence that a remote app user can execute code or attack the shipped native PDF viewer. Advisory classification is kept distinct from reachability.

**Proposed diff:** Prefer upgrading the parent packages to versions that select fixed dependencies. A concrete fallback candidate uses already-present fixed versions (the mobile lockfile already resolves 14.0.4/11.0.5 under other Expo parents):

```diff
--- a/mobile-app/package.json
+++ b/mobile-app/package.json
   "overrides": {
+    "glob": "14.0.4",
+    "minimatch": "11.0.5",
     "image-size": "2.0.4",
--- a/tooling/package.json
+++ b/tooling/package.json
+  "overrides": { "minimatch": "11.0.5" },
   "devDependencies": {
```

Regenerate both lockfiles. This override crosses major dependency boundaries, so the proposed fallback is **not compatibility-approved**: review all import/API callers and run Doctor/build/lint/tests before choosing it in Phase 2. Use compatible upstream parent upgrades instead where available. Do not run `npm audit fix --force` blindly. No dependency was installed or changed during this audit. The advisories identify minimatch >=11.0.1 and glob >=14.0.2 as fixed: [minimatch amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249), [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).

### QA-01 — Low — Historical payment harnesses do not match current helper migration dependencies

**Status:** Confirmed test failure; no successful entitlement bypass. **Files:** `supabase/tests/run-mv003-local.py:28,39,46`, `supabase/tests/run-phase-b-local.py:78`, `supabase/tests/run-phase-c-local.py`, `supabase/tests/mv003-entitlement-selftest.cjs:108`, and `supabase/functions/_shared/settle.ts:52`.

```python
if m.name.split('_')[0] <= '20261104110000':
    psql('-f', str(m), ...)
run(['node', 'supabase/tests/mv003-entitlement-selftest.cjs'])
```

```ts
await supabaseAdmin.rpc("reverse_refunded_capture", { ... });
```

**Root cause:** The historical wrapper assembles an older SQL baseline plus selected forward migrations but imports today's settlement helper. The helper now calls `reverse_refunded_capture`, introduced by the November 12 refund migration. A full-refund test consequently observes fail-closed HTTP **500** where the harness expects **400**. The wrapper stops before its remaining assertions. Full-current-schema `supabase/tests/run-all.sh` passes; these failing wrappers must not be presented as passing or as proof of a production grant vulnerability.

**Proposed diff:** Keep historical compatibility tests on their frozen, reviewed source bundle and add an explicit full-current-schema helper run:

```diff
--- a/supabase/tests/run-mv003-local.py
+++ b/supabase/tests/run-mv003-local.py
+# Before exercising CURRENT helper, install its full forward SQL dependencies.
+for m in sorted((root / 'supabase/migrations').glob('*.sql')):
+    if m.name.split('_')[0] > '20261110100000':
+        psql('-f', str(m), stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
 run(['node', 'supabase/tests/mv003-entitlement-selftest.cjs'])
```

Preserve the earlier historical snapshot assertions before this upgrade step; do not blindly add the latest schema to a test whose purpose is pre-upgrade compatibility. Phase B/C wrappers need the same explicit fixture/source separation. The initial six direct Node harness invocations also lacked their required local DB environment; those prerequisite failures are separately recorded in raw evidence and not counted as application defects.
