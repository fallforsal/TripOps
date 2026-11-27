#!/usr/bin/env bash
# Dùng chung: đọc deploy/.env và định nghĩa hàm sqlcmd chạy trong container.
set -euo pipefail
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
set -a; . "$DEPLOY_DIR/.env"; set +a
DB_NAME="${DB_NAME:-TripOps}"
COMPOSE=(docker compose -f "$DEPLOY_DIR/compose.prod.yaml" --env-file "$DEPLOY_DIR/.env")
sql() { "${COMPOSE[@]}" exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -C -b -S localhost -U sa -P "$MSSQL_SA_PASSWORD" "$@"; }
