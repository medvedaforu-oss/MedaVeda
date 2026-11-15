#!/usr/bin/env bash
# Disposable pre-fix schema ONLY; does not change canonical runner or its assertions.
set -euo pipefail
export PGHOST=/tmp/medveda-fix5-socket PGPORT=55435 PGUSER=postgres
p=(psql -X -q -At -v ON_ERROR_STOP=1)
"${p[@]}" -d postgres -c 'create database fix5_baseline'
"${p[@]}" -d fix5_baseline -f supabase/tests/support/supabase_stub.sql >/dev/null
for f in supabase/migrations/*.sql; do
 [[ $(basename "$f") > 20261114050400_fix4_identity_retention_schedule.sql ]] && continue
 "${p[@]}" -d fix5_baseline -f "$f" >/dev/null 2>>docs/audit/fix-5/before/baseline-build.log
done
"${p[@]}" -d fix5_baseline -f supabase/tests/support/seed.sql >/dev/null
for name in FIFO refund-before-expiry refund-after-expiry no-expiry-and-deletion security-and-conservation; do
 set +e
 "${p[@]}" -d fix5_baseline -f "docs/audit/fix-5/tests/$name.sql" > "docs/audit/fix-5/before/$name.log" 2>&1
 rc=$?
 set -e
 echo "$name exit=$rc"
done
