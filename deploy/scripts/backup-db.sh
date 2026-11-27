#!/usr/bin/env bash
# Sao lưu database + App_Data (hợp đồng PDF), giữ 7 bản gần nhất.
# Cron 2h sáng hằng ngày:
#   (crontab -l 2>/dev/null; echo "0 2 * * * /opt/tripops/deploy/scripts/backup-db.sh >> /var/log/tripops-backup.log 2>&1") | crontab -
. "$(dirname "$0")/_common.sh"
TS="$(date +%Y%m%d_%H%M)"
mkdir -p "$DEPLOY_DIR/backups"; chown 10001:0 "$DEPLOY_DIR/backups" 2>/dev/null || true
sql -Q "BACKUP DATABASE [$DB_NAME] TO DISK=N'/var/opt/mssql/backup/${DB_NAME}_$TS.bak' WITH INIT, CHECKSUM;"
"${COMPOSE[@]}" exec -T api tar czf - -C /app App_Data > "$DEPLOY_DIR/backups/appdata_$TS.tgz"
find "$DEPLOY_DIR/backups" -name "${DB_NAME}_*.bak" -mtime +7 -delete
find "$DEPLOY_DIR/backups" -name "appdata_*.tgz" -mtime +7 -delete
echo "$(date '+%F %T') backup OK: ${DB_NAME}_$TS.bak"
