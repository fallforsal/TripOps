#!/usr/bin/env bash
# Restore database từ file .bak (sao lưu từ máy local TripOps_Import).
#   1) Copy file lên VPS:  scp -P 7180 TripOps.bak root@103.178.235.226:/opt/tripops/deploy/backups/
#   2) bash deploy/scripts/restore-db.sh TripOps.bak
. "$(dirname "$0")/_common.sh"
BAK="${1:?Cách dùng: restore-db.sh <tên-file.bak nằm trong deploy/backups>}"
BAK="$(basename "$BAK")"
[ -f "$DEPLOY_DIR/backups/$BAK" ] || { echo "Không thấy deploy/backups/$BAK"; exit 1; }
chown 10001:0 "$DEPLOY_DIR/backups/$BAK" 2>/dev/null || true
IN="/var/opt/mssql/backup/$BAK"

# Lấy tên logic của file data/log trong .bak
mapfile -t L < <(sql -h -1 -W -s '|' -Q "SET NOCOUNT ON; RESTORE FILELISTONLY FROM DISK=N'$IN';" | awk -F'|' 'NF>3{print $1"|"$3}')
MOVE=""
for row in "${L[@]}"; do
  name="${row%%|*}"; type="${row##*|}"
  if [ "$type" = "L" ]; then MOVE+="MOVE N'$name' TO N'/var/opt/mssql/data/${DB_NAME}_log.ldf', "
  else MOVE+="MOVE N'$name' TO N'/var/opt/mssql/data/${DB_NAME}.mdf', "; fi
done
[ -n "$MOVE" ] || { echo "Không đọc được danh sách file trong .bak"; exit 1; }

echo "Restore $BAK -> $DB_NAME ..."
"${COMPOSE[@]}" stop api || true
sql -Q "IF DB_ID(N'$DB_NAME') IS NOT NULL ALTER DATABASE [$DB_NAME] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE [$DB_NAME] FROM DISK=N'$IN' WITH $MOVE REPLACE, RECOVERY, STATS=10;
ALTER DATABASE [$DB_NAME] SET MULTI_USER;"
"${COMPOSE[@]}" start api
echo "Xong. Kiểm tra: curl -fsS https://$DOMAIN/health"
