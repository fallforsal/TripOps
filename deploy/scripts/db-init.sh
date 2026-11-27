#!/usr/bin/env bash
# Tạo database TRỐNG từ database.sql (46 bảng, idempotent). Dùng khi KHÔNG restore từ .bak.
#   bash deploy/scripts/db-init.sh
. "$(dirname "$0")/_common.sh"
sql -Q "IF DB_ID(N'$DB_NAME') IS NULL CREATE DATABASE [$DB_NAME];"
"${COMPOSE[@]}" cp "$REPO_DIR/database.sql" sqlserver:/tmp/database.sql
sql -d "$DB_NAME" -f 65001 -i /tmp/database.sql
sql -d "$DB_NAME" -h -1 -Q "SET NOCOUNT ON; SELECT COUNT(*) AS Tables FROM sys.tables;"
echo "Xong: database $DB_NAME đã được tạo/cập nhật."
