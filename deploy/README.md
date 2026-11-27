# Triển khai TripOps lên VPS (Docker)

VPS: VPSTTT Plan 08 (4 vCPU / 6 GB / 40 GB, Ubuntu 24.04), IP `103.178.235.226`, SSH port `7180`.
Tên miền: `tripops.online` (iNET).

```
Internet ──443/80──► web (Caddy: HTTPS tự động + file React)
                        ├── /api/*, /hubs/*, /health ──► api (.NET 10, :8080)
                        │                                   └──► sqlserver (SQL Server 2022 Express)
```

| File | Vai trò |
|---|---|
| `backend/Dockerfile` | Build + chạy API (.NET 10, font cho PDF hợp đồng) |
| `frontend/Dockerfile` | Build React (Vite) rồi đóng gói vào Caddy |
| `deploy/Caddyfile` | HTTPS, proxy API/SignalR, cache file tĩnh |
| `deploy/compose.prod.yaml` | 3 dịch vụ + volume dữ liệu |
| `deploy/env.prod.example` | Mẫu biến môi trường (copy thành `deploy/.env`) |
| `deploy/scripts/*.sh` | Tạo DB, restore `.bak`, backup hằng đêm |

---

## 1. Trỏ tên miền (làm trước, DNS cần vài phút–vài giờ)

Vào iNET → Quản lý tên miền `tripops.online` → Bản ghi DNS:

| Loại | Tên | Giá trị |
|---|---|---|
| A | `@` | `103.178.235.226` |
| A | `www` | `103.178.235.226` |

Kiểm tra trên máy: `nslookup tripops.online` phải ra `103.178.235.226`.
> Giữ nguyên các bản ghi MX/TXT của OxMail (email `lienhe@tripops.online`).

## 2. Chuẩn bị VPS (một lần)

```bash
ssh -p 7180 root@103.178.235.226

# Cập nhật + giờ VN
apt update && apt -y upgrade
timedatectl set-timezone Asia/Ho_Chi_Minh

# Swap 2 GB (đỡ hết RAM khi build)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Tường lửa: CHỈ mở SSH 7180 + web. Mở 7180 TRƯỚC khi enable để không tự khoá mình.
ufw allow 7180/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw --force enable && ufw status

# Docker (script chính thức)
curl -fsSL https://get.docker.com | sh
docker version && docker compose version
```

> Lưu ý: Docker tự mở cổng publish, bỏ qua ufw. Vì vậy SQL Server chỉ được bind `127.0.0.1:1433`.

## 3. Lấy code + cấu hình

```bash
git clone <URL-repo-TripOps> /opt/tripops
cd /opt/tripops
cp deploy/env.prod.example deploy/.env
nano deploy/.env        # điền MSSQL_SA_PASSWORD, Cloudinary, payOS, DeepSeek...
chmod 600 deploy/.env
mkdir -p deploy/backups && chown 10001:0 deploy/backups
```

Repo private: dùng Personal Access Token hoặc deploy key khi clone.
**Không** gửi mật khẩu root / file `.env` qua chat, không commit `.env`.

## 4. Build & chạy

```bash
cd /opt/tripops
docker compose -f deploy/compose.prod.yaml --env-file deploy/.env up -d --build
docker compose -f deploy/compose.prod.yaml --env-file deploy/.env ps
```

Lần đầu build mất khoảng 5–10 phút. Đặt alias cho gọn:

```bash
echo "alias dc='docker compose -f /opt/tripops/deploy/compose.prod.yaml --env-file /opt/tripops/deploy/.env'" >> ~/.bashrc && . ~/.bashrc
dc logs -f api      # xem log API
dc logs -f web      # xem Caddy lấy chứng chỉ HTTPS
```

## 5. Dữ liệu

**Cách A – mang nguyên dữ liệu demo từ máy local (khuyên dùng):**

1. Trên máy Windows (SSMS): chuột phải `TripOps_Import` → Tasks → Back Up… → lưu `TripOps.bak`.
2. Đẩy lên VPS và restore:
   ```powershell
   scp -P 7180 TripOps.bak root@103.178.235.226:/opt/tripops/deploy/backups/
   ```
   ```bash
   bash /opt/tripops/deploy/scripts/restore-db.sh TripOps.bak
   ```
3. Hợp đồng PDF/upload local (`backend/src/TripOps.Api/App_Data`): nén thành `App_Data.tgz`, rồi:
   ```powershell
   tar -czf App_Data.tgz -C D:\fpt\SEP\TripOps\backend\src\TripOps.Api App_Data
   scp -P 7180 App_Data.tgz root@103.178.235.226:/tmp/
   ```
   ```bash
   dc exec -T api tar xzf - -C /app < /tmp/App_Data.tgz
   ```

**Cách B – database trống từ `database.sql`:**

```bash
bash /opt/tripops/deploy/scripts/db-init.sh
```

## 6. Kiểm tra

```bash
curl -fsS https://tripops.online/health      # -> Healthy
```

Mở `https://tripops.online`, đăng nhập các tài khoản demo, thử: tìm tour, đặt tour, chat (SignalR), xuất hợp đồng PDF (tiếng Việt có dấu), upload ảnh.

## 7. payOS

Trên my.payos.vn → kênh thanh toán → **Webhook URL**:
`https://tripops.online/api/v1/payments/payos/webhook`
(ReturnUrl/FrontendBaseUrl đã đặt trong `.env`.)
`Settlement__AutoPayoutEnabled=false` mặc định để không tự chuyển tiền thật.

## 8. Backup hằng đêm

```bash
chmod +x /opt/tripops/deploy/scripts/*.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/tripops/deploy/scripts/backup-db.sh >> /var/log/tripops-backup.log 2>&1") | crontab -
bash /opt/tripops/deploy/scripts/backup-db.sh    # chạy thử
```

Giữ 7 ngày trong `deploy/backups/`. Thỉnh thoảng tải bản mới nhất về máy:
`scp -P 7180 root@103.178.235.226:/opt/tripops/deploy/backups/TripOps_*.bak .`

## 9. Cập nhật code

```bash
cd /opt/tripops && git pull
dc up -d --build
docker image prune -f
```

Đổi schema: chạy lại `db-init.sh` (database.sql idempotent) sau khi pull.

## 10. Checklist ngày bảo vệ

- [ ] Đóng băng code 1–2 ngày trước, không `git pull` sát giờ.
- [ ] Backup DB + snapshot VPS tối hôm trước.
- [ ] UptimeRobot theo dõi `https://tripops.online/health`.
- [ ] VPS còn hạn (hết 27/12/2026, auto-renew đang tắt) — **không** bấm "Tạm ngưng".
- [ ] Phương án dự phòng: `run.bat` + DB local trên laptop, video demo quay sẵn.

## Sự cố thường gặp

| Hiện tượng | Xử lý |
|---|---|
| Caddy báo lỗi chứng chỉ | DNS chưa trỏ đúng / cổng 80 bị chặn. `dc logs web` |
| API restart liên tục | `dc logs api` — thường do sai connection string / thiếu biến `.env` |
| Đăng nhập xong bị văng / 403 Origin | `DOMAIN` sai, hoặc truy cập bằng IP thay vì tên miền |
| PDF lỗi font | Image API đã cài `fonts-liberation2`; rebuild `dc build --no-cache api` |
| SQL Server không lên | RAM thiếu → giảm `MSSQL_MEMORY_LIMIT_MB=2560`; mật khẩu SA quá yếu |
| Kết nối SSMS từ máy nhà | `ssh -p 7180 -L 14333:127.0.0.1:1433 root@103.178.235.226` rồi SSMS vào `localhost,14333` |
