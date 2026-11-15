#!/usr/bin/env bash
# Read-only inventory. Matches comments too: every match requires owner review.
# Prints migration filename, line number and matching source; never executes SQL.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
if grep -nHE 'cron[.]schedule|pg_cron|net[.]http_post' "$root"/supabase/migrations/*.sql; then
  exit 0
else
  result=$?
  # A clean inventory with no matches is successful; I/O errors must propagate.
  if [ "$result" -eq 1 ]; then exit 0; fi
  exit "$result"
fi
