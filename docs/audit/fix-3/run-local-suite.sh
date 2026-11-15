#!/usr/bin/env bash
# LOCAL disposable cluster only. Never reads repository environment files.
set -euo pipefail
cd /home/ganeshp8545/AyurPulse
export PGHOST=/tmp/medveda-fix3-socket PGPORT=55433 PGUSER=postgres
mkdir -p "$PGHOST"
if [ ! -f /tmp/medveda-fix3-pg/PG_VERSION ]; then
 /usr/lib/postgresql/17/bin/initdb -U postgres -D /tmp/medveda-fix3-pg -A trust --no-locale > docs/audit/fix-3/local-postgres-init.log 2>&1
fi
if ! /usr/lib/postgresql/17/bin/pg_ctl -D /tmp/medveda-fix3-pg status >/dev/null 2>&1; then
 /usr/lib/postgresql/17/bin/pg_ctl -D /tmp/medveda-fix3-pg -l /tmp/medveda-fix3-pg.log -o "-k /tmp/medveda-fix3-socket -p 55433 -c listen_addresses=''" start
fi
set +e
bash supabase/tests/fix3-run-all.sh > docs/audit/fix-3/final-sql.log 2>&1
fix3_sql_exit=$?
printf '%s\n' "$fix3_sql_exit" > docs/audit/fix-3/final-sql.exit
exit "$fix3_sql_exit"
