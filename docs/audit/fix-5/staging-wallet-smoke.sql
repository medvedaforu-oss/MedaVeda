-- OWNER ONLY: isolated staging scratch database, synthetic accounts, no provider calls.
-- Never run this acceptance script on production. Verify connection identity first.
\set ON_ERROR_STOP on
\if :{?FIX5_STAGING_ACCEPTANCE}
\else
\echo Set FIX5_STAGING_ACCEPTANCE=1 only after verifying the isolated staging scratch connection.
\quit 2
\endif
\ir tests/BACK-11.sql
\ir tests/BACK-11-partial.sql
\ir tests/BACK-13.sql
\ir tests/WR-01.sql
\ir tests/WR-02.sql
\ir tests/WR-06.sql
\ir tests/WR-07.sql
\ir tests/FIFO.sql
\ir tests/refund-before-expiry.sql
\ir tests/refund-after-expiry.sql
\ir tests/no-expiry-and-deletion.sql
\ir tests/security-and-conservation.sql
\ir tests/expiry-security.sql
\ir tests/provider-clawback.sql
\ir tests/provider-clawback-reverse-tie.sql
\ir tests/provider-zero-replay.sql
\ir tests/expiry-boundaries.sql
\ir tests/get-wallet-expiry.sql
\ir tests/DB-NULL.sql
\echo EXPECTED: every included test prints PASS and rolls back; psql exit 0.
