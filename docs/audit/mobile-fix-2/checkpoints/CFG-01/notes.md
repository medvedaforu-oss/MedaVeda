# CFG-01

FIXED. Online baseline reproduced four incompatible SDK 57 patch versions (before/CFG-01-online.log, EXIT 1). Expo installer updated expo to ~57.0.33, expo-constants to ~57.0.24, expo-sqlite to ~57.0.5 and expo-updates to ~57.0.28. Existing dirty package content was preserved.

Final command: env -u EXPO_OFFLINE npm_config_fetch_retries=0 npm_config_fetch_timeout=15000 timeout 60s npx expo install --check. Raw result after/CFG-01.log: Dependencies are up to date, EXIT 0. Final expo-doctor: 21/21 checks passed, EXIT 0 (after/expo-doctor.log).

Installer logs preserve an initial 60-second timeout during Expo's automatic second install and a subsequent ENOTEMPTY failure; final sequential retry succeeded (after/CFG-01-install-retry.log, EXIT 0). No lockfile was hand edited. Checkpoint diffs compare pre-task dirty files to final files and include the shared CFG-02 compatible parent update.
