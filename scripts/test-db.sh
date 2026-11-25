#!/usr/bin/env bash
# Applies the migrations and seed to a throwaway local Postgres database and
# runs the behaviour tests. Needs a local Postgres (psql) you can connect to.
set -euo pipefail
DB=${DB:-dreamer_test}
PSQL=${PSQL:-psql}
cd "$(dirname "$0")/.."
$PSQL -q -c "drop database if exists $DB" postgres
$PSQL -q -c "drop role if exists anon; drop role if exists authenticated; drop role if exists service_role;" postgres 2>/dev/null || true
$PSQL -q -c "create database $DB" postgres
$PSQL -q -v ON_ERROR_STOP=1 -d $DB -f supabase/tests/supabase-stub.sql
for f in supabase/migrations/*.sql; do $PSQL -q -v ON_ERROR_STOP=1 -d $DB -f "$f"; done
$PSQL -q -v ON_ERROR_STOP=1 -d $DB -f supabase/seed.sql
$PSQL -q -v ON_ERROR_STOP=1 -d $DB -f supabase/tests/rls_and_money.test.sql
