#!/usr/bin/env bash
set -euo pipefail
cd /home/ganeshp8545/AyurPulse
export PGHOST=/tmp/medveda-fix4-socket PGPORT=55434 PGUSER=postgres
mkdir -p "$PGHOST"
if [ ! -f /tmp/medveda-fix4-final-pg/PG_VERSION ]; then
 /usr/lib/postgresql/17/bin/initdb -U postgres -D /tmp/medveda-fix4-final-pg -A trust --no-locale > docs/audit/fix-4/final-local-init.log 2>&1
fi
/usr/lib/postgresql/17/bin/pg_ctl -D /tmp/medveda-fix4-final-pg -l /tmp/medveda-fix4-final-pg.log -o "-k /tmp/medveda-fix4-socket -p 55434 -c listen_addresses=''" start
trap '/usr/lib/postgresql/17/bin/pg_ctl -D /tmp/medveda-fix4-final-pg stop -m fast >/dev/null 2>&1' EXIT
python3 docs/audit/fix-4/build-local.py fix4_before 20261114050000 > docs/audit/fix-4/before/final-sql-build.log 2>&1
python3 docs/audit/fix-4/build-local.py fix4_final > docs/audit/fix-4/final-sql-build.log 2>&1
python3 docs/audit/fix-4/run-final-findings.py > docs/audit/fix-4/final-sql-findings-progress.log 2>&1
set +e
bash supabase/tests/fix3-run-all.sh > docs/audit/fix-4/final-sql.log 2>&1
result=$?
printf '\nEXIT %s\n' "$result" >> docs/audit/fix-4/final-sql.log
exit "$result"
