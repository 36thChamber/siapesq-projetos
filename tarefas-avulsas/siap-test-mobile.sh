#!/bin/sh
# Cria um PostgreSQL temporário e roda migrações e testes das duas APIs.
set -e
set -eu
: "${PROJETOS_DIR:?Informe a pasta com api-siapreps e api-phytobloom}"
bin=$(pg_config --bindir)
temp=$(mktemp -d)
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')
export PGPASSWORD=$(openssl rand -hex 20)
export JWT_SECRET=$(openssl rand -hex 32)
printf '%s\n' "$PGPASSWORD" > "$temp/pass"
"$bin/initdb" -D "$temp/pg" -U runner -A scram-sha-256 --pwfile="$temp/pass" --no-locale --encoding=UTF8 >/dev/null
trap '"$bin/pg_ctl" -D "$temp/pg" -m fast -w stop >/dev/null 2>&1 || true; rm -rf "$temp"' EXIT
"$bin/pg_ctl" -D "$temp/pg" -l "$temp/server.log" -w -o "-p $port -c listen_addresses=127.0.0.1 -c unix_socket_directories=$temp" start >/dev/null
for spec in siapreps phytobloom; do
  "$bin/createdb" -U runner -h "$temp" -p "$port" "$spec"
  (
    cd "$PROJETOS_DIR/api-$spec"
    export DATABASE_URL="postgresql://runner:$PGPASSWORD@localhost:$port/$spec"
    export MIGRATION_DATABASE_URL="$DATABASE_URL" DAILY_RASTER_ENDPOINT="${DAILY_RASTER_ENDPOINT:-http://localhost:9000}" NODE_ENV=test
    npm run db:migrate && npm test -- --run
  )
done
