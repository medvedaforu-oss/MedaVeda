# Offline content setup and verification

Offline support is already integrated. Install locked dependencies with `npm ci`
inside `mobile-app`; do not copy old replacement modules into the source tree.

The implementation uses SQLite (`src/config/database.ts`),
`src/utils/downloadManager.ts`, foreground sync and network listeners. Paid Notes
require server-authorized URLs, account ownership and a valid entitlement check.
Seven-day grace, clock-rollback denial and logout cleanup need device acceptance;
encrypted PDF/license storage remains an open
[release requirement](../docs/RELEASE_GATES.md#unresolved-offline-pdf-encryption-requirement).
Videos are free and online; free quiz downloads must contain no answers.

`docs/legacy-sql/push_tokens.sql` is historical context for original push-token
setup. Timestamped migrations supersede it; follow the
[deployment runbook](../supabase/DEPLOY_ORDER.md) and inspect hosted history before
any schema operation. Never replay loose historical SQL as current setup.

Complete download/resume, airplane-mode open, upgrade, expiry/revocation,
account-switch and storage-full cases in the
[device checklist](../REAL_DEVICE_RELEASE_TEST_CHECKLIST.md). Focused offline
selftests live in `mobile-app/scripts/`; local scripts do not establish native
filesystem or hosted acceptance.
