#!/usr/bin/env bash
# Copy all dashboard data from Supabase Postgres to Neon. Read-only on Supabase.
#
#   SUPABASE_DB_URL="postgresql://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
#   NEON_DATABASE_URL="postgresql://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require" \
#   scripts/migrate-supabase-to-neon.sh
#
# Use the direct (non-pooled) Neon URL. Safe to re-run: Neon tables are
# emptied before the copy, Supabase is never written to.
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL}"
: "${NEON_DATABASE_URL:?Set NEON_DATABASE_URL}"

# Supabase runs Postgres 17; an older pg_dump refuses to dump it.
if [ "$(pg_dump --version | grep -oE '[0-9]+' | head -1)" -lt 17 ]; then
  echo "pg_dump 17 or newer is required (found: $(pg_dump --version))" >&2
  exit 1
fi

TABLES=(clients projects quotes studio_profiles)
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="$(mktemp -t supabase-data-XXXXXX.sql)"
trap 'rm -f "$DUMP"' EXIT

echo "1/4 Creating tables on Neon"
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$DIR/neon/schema.sql"

echo "2/4 Dumping data from Supabase"
pg_dump "$SUPABASE_DB_URL" --data-only --no-owner --no-acl \
  $(printf -- '-t public.%s ' "${TABLES[@]}") -f "$DUMP"

echo "3/4 Restoring into Neon"
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -q -1 \
  -c "TRUNCATE $(printf 'public.%s,' "${TABLES[@]}" | sed 's/,$//')" \
  -f "$DUMP" >/dev/null

echo "4/4 Verifying row counts"
status=0
for t in "${TABLES[@]}"; do
  src=$(psql "$SUPABASE_DB_URL" -At -c "SELECT count(*) FROM public.$t")
  dst=$(psql "$NEON_DATABASE_URL" -At -c "SELECT count(*) FROM public.$t")
  printf '  %-16s supabase=%-6s neon=%-6s %s\n' "$t" "$src" "$dst" "$([ "$src" = "$dst" ] && echo OK || echo MISMATCH)"
  [ "$src" = "$dst" ] || status=1
done
exit $status
