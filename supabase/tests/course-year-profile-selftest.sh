#!/usr/bin/env bash
# Focused, isolated test: reproduce the old zero-row RPC, apply its repair,
# then exercise signup/backfill, exact persistence, retry and RLS checks.
# Needs PostgreSQL binaries and the same extensions as tests/run-all.sh.
set -euo pipefail
task_root=$(cd "$(dirname "$0")/../.." && pwd)
task_pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
task_db_dir=$(mktemp -d /tmp/medveda-course-db.XXXXXX)
export PGHOST="$task_db_dir" PGPORT=55439 PGUSER=postgres PGDATABASE=postgres
trap '"$task_pg_bin/pg_ctl" -D "$task_db_dir/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$task_db_dir"' EXIT
"$task_pg_bin/initdb" -D "$task_db_dir/data" -U postgres -A trust >/dev/null
"$task_pg_bin/pg_ctl" -D "$task_db_dir/data" -l "$task_db_dir/server.log" \
  -o "-k $task_db_dir -h '' -p $PGPORT" start >/dev/null
task_sql=(psql -X -q -At -v ON_ERROR_STOP=1)
task_fix="$task_root/supabase/migrations/20261104110000_course_year_profile_confirmation.sql"
"${task_sql[@]}" -f "$task_root/supabase/tests/support/supabase_stub.sql" >"$task_db_dir/build.log" 2>&1
for task_migration in "$task_root"/supabase/migrations/[0-9]*.sql; do
  [[ "$task_migration" == "$task_fix" ]] && continue
  if ! "${task_sql[@]}" -f "$task_migration" >>"$task_db_dir/build.log" 2>&1; then
    tail -30 "$task_db_dir/build.log"
    exit 1
  fi
done

"${task_sql[@]}" <<'SQL'
begin;
insert into auth.users(id,email) values ('ce000000-0000-0000-0000-000000000001','course-zero-row@example.invalid');
delete from public.profiles where id='ce000000-0000-0000-0000-000000000001';
insert into public.years(id,title,course_id,active) values ('_cyc_before_y1','First Year','bams',true);
do $$ begin
 perform set_config('request.jwt.claim.sub','ce000000-0000-0000-0000-000000000001',true);
 perform set_config('request.jwt.claims','{"sub":"ce000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
end $$;
set local role authenticated;
do $$ begin
 perform public.set_my_course_year('bams','_cyc_before_y1');
 if exists(select 1 from public.profiles where id=auth.uid()) then
  raise exception 'Expected the original RPC to leave the profile absent';
 end if;
 raise notice 'REPRODUCED: original void RPC returned successfully while no profile was updated';
end $$;
rollback;
SQL

"${task_sql[@]}" -f "$task_fix"
"${task_sql[@]}" -f "$task_root/supabase/tests/course_year_profile_checks.sql"
