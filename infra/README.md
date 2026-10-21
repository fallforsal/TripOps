# Local infrastructure

Mở terminal infrastructure mới tại repository root. Nếu chưa có `.env`, copy `.env.example` thành `.env` (không ghi đè file local đã có), đặt MSSQL_SA_PASSWORD riêng đủ mạnh, rồi chạy `docker compose --env-file .env -f infra/compose.yaml config --quiet` và `docker compose --env-file .env -f infra/compose.yaml up -d --wait`. Dùng Docker Desktop Linux containers/WSL2, dành tối thiểu 2GB RAM cho SQL Server. SQL Server Developer chỉ dùng phát triển. Docker tùy chọn khi chỉ chạy scaffold health, vì API chưa truy SQL hoặc gửi email.

SQL Server ở localhost:14330; volume sqlserver-data giữ dữ liệu qua restart. Mailpit SMTP localhost:1025, inbox http://localhost:8025; email chưa được API gửi ở Task 1. Ports chỉ bind loopback. Không xóa volume để sửa lỗi cấu hình; không dùng down -v khi cần giữ dữ liệu.

`docker compose --env-file .env -f infra/compose.yaml ps`; `docker compose --env-file .env -f infra/compose.yaml logs sqlserver`; dừng bằng `docker compose --env-file .env -f infra/compose.yaml down` (giữ volume). Đổi mật khẩu env không đổi mật khẩu SA đã lưu trên volume.

Task 1 không tự tạo database TripOps hoặc schema nghiệp vụ. Health API chỉ liveness, không kiểm tra SQL. Image được pin tag ổn định theo [Microsoft registry](https://mcr.microsoft.com/en-us/artifact/mar/mssql/server/tag/2022-CU22-GDR1-ubuntu-22.04) và [Mailpit](https://mailpit.axllent.org/docs/install/docker/); chưa khẳng định đã pull/chạy khi Docker không có trên máy. Quy trình [sqlcmd chính thức](https://learn.microsoft.com/sql/linux/sql-server-linux-docker-container-deployment) dùng mssql-tools18 và -C cho local self-signed certificate.
