# Local verification evidence — 27 October 2026

These JSON summaries record the commands, exit status, revision and local-test inventory. They are not device, provider or production acceptance evidence.

- Full baseline and checks 01–05 passed earlier in the session; their temporary logs were lost during environment restart. No replacement results are fabricated.
- Check 06 was run directly from the working tree. From 07, checks used git-archive snapshots with shared installed dependencies.
- Check 07 initially hit a scanner EISDIR on dependency symlinks. Adding a snapshot-only node_modules ignore and repeating the same scan passed (1,136 files, zero matches). Its summary explicitly records that correction.
- Original Android exports 07–21 could follow Expo's shared AppEntry symlink to the working-tree App. The appended `android-export-exact-snapshot` results supersede them. The equivalent temporary entry imports the snapshot App and the same Expo registration function.
- `bundle-snapshot-sanity.json` records that the note-access message introduced in commit 14 is absent from bundles 12/13 and present in 14. This independently checks the snapshot-entry correction.
- The temporary entry is excluded from snapshot TypeScript discovery: directly importing Expo implementation source otherwise pulls dependency internals into tsc. Product source and compiler options remain unchanged. Initial attempts at the baseline repeat and check 22 stopped before retained summaries; the corrected full runs replace them.
- A later environment restart lost unfinished /tmp work. Concurrent cold builds then competed for memory; they were interrupted and restarted with bounded concurrency. Interrupted runs are not represented as passes. Full checks use two runner threads and two Metro workers; export corrections run one at a time.
- `verify-snapshots.py` reproduces the snapshot-only adjustments and writes command summaries here. Build outputs and verbose logs remain in /tmp. It never modifies the checked-out product source or deployment state.

The final report commit is checked directly against the working tree using the same full suite with bounded build concurrency. Its result is reported in the completion message; it is not recursively committed as another evidence change.
