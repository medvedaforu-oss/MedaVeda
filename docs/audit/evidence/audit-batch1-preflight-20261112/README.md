# Batch 1 migration preflight evidence

Production activity was read-only. Local PostgreSQL used an explicit /tmp Unix socket, synthetic fixtures and an environment with no hosted credentials. No production data was copied for tests.

Reproduce artifact comparisons:
`python3 docs/audit/evidence/audit-batch1-preflight-20261112/verify-artifacts.py`

With a disposable local PostgreSQL 17 instance:
`env -i PATH="$PATH" HOME="$HOME" PGHOST=/tmp/medveda-batch1-pg PGPORT=55447 PGUSER=postgres python3 docs/audit/evidence/audit-batch1-preflight-20261112/replay-rollback-concurrency.py`
`env -i PATH="$PATH" HOME="$HOME" PGHOST=/tmp/medveda-batch1-pg PGPORT=55447 PGUSER=postgres bash supabase/tests/run-all.sh`

Both final local commands exited 0. The additional preflight script reports 19 passing checks; the full suite reports ALL SUITES PASSED. The preflight runner also invokes legacy-handlers.cjs using exact frozen deployed source.

The two Management API scripts perform GET only. Backup script requests inventory without downloading data; alert script persists names-only presence booleans and discards values/hashes. They require the existing private management credential; do not print it or copy it into artifacts.

`monitor-readonly.sql` is a timeout-bounded read-only aggregate polling query, prepared as an operator input rather than an activated monitoring service. Log source counts are the explicit 24-hour interval recorded in log-source-counts.json and do not prove notification delivery.

Verify checksums from this directory: `sha256sum -c files.sha256`. The report is ../../MEDVEDA_BATCH1_MIGRATION_PREFLIGHT_2026-11-12.md.
