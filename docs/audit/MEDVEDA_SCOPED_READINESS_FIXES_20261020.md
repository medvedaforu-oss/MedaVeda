# Scoped production readiness fixes — review only

Implemented SEC-02, MOB-01, ADM-01, API-01 and MOB-02. No deployment, migration application, database connection, provider request, price change or Play catalog edit was performed. SEC-01 and DB-01 remain untouched. Existing working-tree changes were preserved; the list below identifies files touched by this task, not the entire working-tree diff.

- SEC-02 removes the student direct-read policy and adds a restrictive SELECT guard, preserving admin reads and service-role signing. Students use get-note-url and its user_can_access_note checks, including blocking and free-preview authorization. Previously issued signed URLs retain their existing expiry.
- MOB-01 reads only the existing app_settings.maintenance_mode through a narrow public RPC. Launch waits up to six seconds for the first check; launch, foreground and Retry checks fail open on timeout/error/malformed data. The blocking screen replaces app navigation. Background purchase recovery remains running.
- ADM-01 keeps the existing two-write save and truthfully reports when app update settings saved but general settings, including Maintenance Mode, could not be confirmed. Zero-row updates and disconnected responses cannot show Saved. Reload before retrying an uncertain save.
- API-01 bounds authenticated Play HTTP requests and response-body reads at 15 seconds and aborts the request. Verification/recheck timeouts return recoverable pending; persisted attempts remain available, and successful restore clears them. Other billing behavior is unchanged by this task.
- MOB-02 corrects only exact stale Play package IDs for the store_url row; valid/custom URLs and unrelated keys remain unchanged. Runtime fallback also covers both stale IDs.

## Changed files

- [admin-panel/src/pages/Settings.tsx](/home/ganeshp8545/AyurPulse/admin-panel/src/pages/Settings.tsx)
- [admin-panel/src/services/settingsService.ts](/home/ganeshp8545/AyurPulse/admin-panel/src/services/settingsService.ts)
- [admin-panel/scripts/settings-save-selftest.cjs](/home/ganeshp8545/AyurPulse/admin-panel/scripts/settings-save-selftest.cjs)
- [mobile-app/App.tsx](/home/ganeshp8545/AyurPulse/mobile-app/App.tsx)
- [mobile-app/src/hooks/useMaintenanceMode.ts](/home/ganeshp8545/AyurPulse/mobile-app/src/hooks/useMaintenanceMode.ts)
- [mobile-app/src/screens/maintenance/MaintenanceScreen.tsx](/home/ganeshp8545/AyurPulse/mobile-app/src/screens/maintenance/MaintenanceScreen.tsx)
- [mobile-app/src/services/maintenanceService.ts](/home/ganeshp8545/AyurPulse/mobile-app/src/services/maintenanceService.ts)
- [mobile-app/src/services/appConfigService.ts](/home/ganeshp8545/AyurPulse/mobile-app/src/services/appConfigService.ts)
- [mobile-app/src/services/playBillingService.ts](/home/ganeshp8545/AyurPulse/mobile-app/src/services/playBillingService.ts)
- [mobile-app/scripts/readiness-selftest.cjs](/home/ganeshp8545/AyurPulse/mobile-app/scripts/readiness-selftest.cjs)
- [mobile-app/scripts/play-lifecycle-selftest.cjs](/home/ganeshp8545/AyurPulse/mobile-app/scripts/play-lifecycle-selftest.cjs)
- [mobile-app/scripts/play-restore-selftest.cjs](/home/ganeshp8545/AyurPulse/mobile-app/scripts/play-restore-selftest.cjs)
- [supabase/migrations/20261020100000_notes_service_reads.sql](/home/ganeshp8545/AyurPulse/supabase/migrations/20261020100000_notes_service_reads.sql)
- [supabase/migrations/20261020101000_maintenance_mode_read.sql](/home/ganeshp8545/AyurPulse/supabase/migrations/20261020101000_maintenance_mode_read.sql)
- [supabase/migrations/20261020102000_correct_stale_store_url.sql](/home/ganeshp8545/AyurPulse/supabase/migrations/20261020102000_correct_stale_store_url.sql)
- [supabase/tests/readiness-migrations-selftest.cjs](/home/ganeshp8545/AyurPulse/supabase/tests/readiness-migrations-selftest.cjs)
- [supabase/tests/readiness_validation.sql](/home/ganeshp8545/AyurPulse/supabase/tests/readiness_validation.sql)

This review document is also new: `docs/audit/MEDVEDA_SCOPED_READINESS_FIXES_20261020.md`.

## Migration SQL

The following are new forward migrations. No old migration was edited. Rollback notes are included in each file.

### 20261020100000_notes_service_reads.sql

```sql
-- SEC-02: students obtain paid and free-preview URLs only via get-note-url,
-- which calls user_can_access_note (including the blocked-account check).
-- Admin preview SELECT policies remain in place. Service-role signing bypasses RLS.
begin;
drop policy if exists notes_read_if_purchased on storage.objects;
-- Restrictive policy also prevents another permissive SELECT/ALL policy from
-- accidentally reopening the notes bucket to students.
create policy notes_service_reads_only on storage.objects as restrictive
  for select to public
  using (bucket_id <> 'notes' or public.am_i_admin());
commit;

-- Rollback: prefer a forward correction. To undo, drop notes_service_reads_only
-- and recreate notes_read_if_purchased from 20260930110000_low_grants_tightening.sql.
-- WARNING: that restores the blocked-account bypass; do not use as a routine rollback.
-- Existing signed URLs remain usable until their existing expiry.
```

### 20261020101000_maintenance_mode_read.sql

```sql
-- MOB-01: expose only the existing maintenance flag before login, never the
-- rest of app_settings (anon table SELECT was deliberately revoked).
begin;
create or replace function public.get_maintenance_mode()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select maintenance_mode from public.app_settings where id = 1), false);
$$;
revoke all on function public.get_maintenance_mode() from public;
grant execute on function public.get_maintenance_mode() to anon, authenticated;
commit;

-- Rollback: drop function public.get_maintenance_mode(); mobile fails open.
```

### 20261020102000_correct_stale_store_url.sql

```sql
-- MOB-02: preserve valid/custom URLs, missing rows and the current package.
-- Match the Play host/path and exact id parameter, including reordered params.
begin;
update public.app_config
set value = regexp_replace(value,
  '([?&]id=)com\.(medveda|ayurpulse)\.app(&|$)',
  '\1in.medveda.app\3')
where key = 'store_url'
  and value ~ '^https://play\.google\.com/store/apps/details\?'
  and value ~ '[?&]id=com\.(medveda|ayurpulse)\.app(&|$)';
commit;

-- Rollback: no automatic rollback to a broken package. If needed, restore only
-- the previously reviewed value from a pre-migration snapshot for this key.
```

## Test results

All executed checks passed (exit 0):

- Mobile: `cd mobile-app && ./node_modules/.bin/tsc --noEmit`
- Admin: `cd admin-panel && ./node_modules/.bin/tsc -b --pretty false`
- Lint: `cd tooling && npm run lint`
- Admin existing self-tests: `cd admin-panel && npm test` (PDF/video/quiz validation, upload errors, mutations, pagination, and mocked diagnostic tests)
- `node admin-panel/scripts/settings-save-selftest.cjs`: complete save, validation before writes, first-write failure, partial success, zero-row update, disconnect and UI error selection.
- `node mobile-app/scripts/readiness-selftest.cjs`: flag true/false, malformed/error/timeout fail-open, fresh retry, launch/resume cleanup, both stale IDs and custom/current URLs.
- `node mobile-app/scripts/play-lifecycle-selftest.cjs`: all existing lifecycle checks plus stalled HTTP fetch/body abort, pending verification/recheck, retained local attempt, successful later restore, create/attach deadlines and timer cleanup.
- `node mobile-app/scripts/play-restore-selftest.cjs`: recovery continues after receipt lookup failure.
- `node mobile-app/scripts/payment-provider-selftest.cjs`
- `node mobile-app/scripts/payment-routing-selftest.cjs`
- `node mobile-app/scripts/purchases-selftest.cjs`
- `node supabase/tests/readiness-migrations-selftest.cjs`: offline migration structure contracts and actual migration URL regex/replacement fixtures, including idempotency and nonmatching URLs.
- `git diff --check` for existing tracked files touched by this task.

Database limitation: migration self-tests validate source contracts/regex fixtures only. They do not establish PostgreSQL execution, deployed RLS behavior, or real account outcomes. `supabase/tests/readiness_validation.sql` is prepared for later authorized database validation and was NOT executed. It checks the installed restrictive policy, removal of the legacy policy, private bucket, maintenance flag/grants and absence of stale URL values, then inventories all Storage SELECT/ALL policies. Real anon/free/paid/blocked/refunded/wrong-account content requests still need isolated integration validation after reviewed migration application. No device UI test was performed.
