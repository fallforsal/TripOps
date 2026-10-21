# TripOps

TripOps là nền tảng B2B2C lập kế hoạch và điều hành du lịch đoàn. **Task 1 hiện có scaffold và kiểm tra kết nối, chưa có auth, entity, migration hoặc API nghiệp vụ.** Các quyết định Q1–Q11 đã được chốt, việc triển khai schema thuộc Task 2. Không có dữ liệu hành khách thật hoặc kết nối chuyển tiền thật.

## Cấu trúc và phiên bản

```text
backend/TripOps.sln
backend/src/TripOps.Api       Controllers, DI, ProblemDetails, health/OpenAPI
backend/src/TripOps.Service   Service và DTO conventions
backend/src/TripOps.Data      EF SQL Server context rỗng, chưa có DbSet
backend/tests/TripOps.Tests   Integration tests hạ tầng
frontend/                    Một React/TS web portal, chưa có business role UI
mobile/                      Flutter dành riêng Tour Guide, Android/iOS
infra/                       SQL Server + Mailpit local, run scripts/checks
docs/                        Thiết kế, nguồn và tiến độ
```

.NET SDK **10.0.302** pin chính xác trong global.json; ASP.NET Core/EF Core **10.0.10**; Microsoft.OpenApi2.7.5/Pkcs10.0.13 đã vá dependency; Swagger UI10.3.0. Node **24.6.0** (.nvmrc), npm11.5.1, React19.3.1/Vite8.3.5/TypeScript6.0.3/Tailwind4.3.3 (package.json và package-lock khóa bản thực). shadcn/ui source Button, Radix primitives, Lucide và React Router. Flutter **3.41.9 stable**, Dart3.11.5 (.fvmrc, pubspec.lock). Các thư viện bên thứ ba không ép major10.

Q10 thay .NET8 trong phiếu bằng .NET10; nhóm cần cập nhật thông tin stack khi hoàn thiện hồ sơ chính thức. Không sửa file phiếu nguồn. SDK trên máy không nhất thiết là SDK mới nhất; thay pin chỉ sau build/test đồng bộ. Phiên bản Docker image cố định trong compose.yaml; không dùng latest.

## Chuẩn bị trên Windows

Cài SDK .NET đúng global.json, Node đúng .nvmrc, Flutter đúng .fvmrc vào PATH; Docker Desktop với Linux containers/WSL2 cho SQL/Mailpit. Android cần Android SDK/emulator/JDK theo flutter doctor; iOS cần macOS/Xcode. FVM tùy chọn, không bắt buộc nếu SDK hệ thống trùng.

Chỉ cần cài công cụ cho phần mình làm: backend cần .NET; web cần Node/npm và API đang chạy; mobile cần Flutter cùng toolchain thiết bị. Docker không bắt buộc để chạy trang kiểm tra kết nối của scaffold, vì health không truy SQL và chưa gửi email.

**Python 3.10+ chỉ cần cho maintainer** chạy `docs/tools/source_audit.py` và `infra/verify-scaffold.py` (standard library, không cần pip); đã kiểm tra bằng Python 3.13.7. Python không phải điều kiện để khởi động backend/web/mobile.

Tại repository root trong PowerShell:

```powershell
dotnet --version
node --version
npm.cmd --version
flutter --version
docker version
# Chỉ maintainer cần kiểm tra thêm:
python --version
```

PowerShell có thể chặn npm.ps1; dùng **npm.cmd** thay vì đổi ExecutionPolicy toàn máy. Nếu chặn chạy script .ps1, dùng các lệnh dotnet trực tiếp bên dưới. Package restore cần truy cập NuGet/npm/pub.dev. .local caches và .env đều bị gitignore; lockfiles được giữ trong Git.

**Mỗi phần bên dưới bắt đầu bằng một terminal PowerShell mới tại repository root** (thư mục chứa README.md, global.json, backend/, frontend/, mobile/). Trong VS Code có thể mở terminal mới ở root; nếu đang ở thư mục khác, dùng `Set-Location '<đường-dẫn-repository-TripOps>'` trước khi chạy block. Biến `$env:...` chỉ có hiệu lực trong terminal đã đặt; không dùng lại terminal đang đứng ở frontend/ hoặc mobile/ để chạy các lệnh root.

## Thứ tự khởi động và port

| Thành phần | Địa chỉ local | Ghi chú |
|---|---|---|
| SQL Server | localhost:14330 | container1433, named volume, chưa tạo database/schema TripOps |
| Mailpit SMTP | localhost:1025 | email test local, API chưa gửi email |
| Mailpit inbox | http://localhost:8025 | chỉ loopback |
| Backend | http://localhost:5080 | Swagger /swagger, OpenAPI /openapi/v1.json chỉ Development |
| Web | http://localhost:5173 | strictPort, CORS Development allowlist |
| Android emulator→API | http://10.0.2.2:5080 | localhost của emulator không phải máy Windows |

### 1. SQL Server và Mailpit

Terminal infrastructure mới tại repo root. Phần này tùy chọn với scaffold health; cần Docker Desktop khi kiểm tra SQL/Mailpit.

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Mở .env và đặt MSSQL_SA_PASSWORD riêng đủ mạnh trước khi chạy.
docker compose --env-file .env -f infra/compose.yaml config --quiet
docker compose --env-file .env -f infra/compose.yaml up -d --wait
docker compose --env-file .env -f infra/compose.yaml ps
```

Không commit .env hoặc secrets. Docker Compose đọc root .env khi được chỉ định; **dotnet và Flutter không tự đọc file này**. SQL Server có volume giữ dữ liệu; down giữ volume, không dùng down -v khi cần giữ dữ liệu. Task1 chưa tạo database TripOps, không startup migration/EnsureCreated. Xem [infra](infra/README.md). Có thể chạy health API/web mà chưa chạy SQL, nhưng không coi health success là SQL ready.

Hai file mẫu đang có: `.env.example` ở root cho Compose và SMTP dự kiến; `frontend/.env.example` cho Vite. Backend dùng environment/launch profile, Flutter dùng `--dart-define`; không cần tìm hoặc tự tạo thêm backend/mobile `.env.example` để chạy scaffold.

### 2. Backend

Terminal backend mới tại repo root; giữ terminal này chạy khi dùng web/mobile. Restore/build là bước cần thiết; test được tách sang mục kiểm tra trước PR.

```powershell
$env:DOTNET_CLI_HOME = Join-Path (Get-Location) '.local/dotnet'
$env:NUGET_PACKAGES = Join-Path (Get-Location) '.local/nuget'
dotnet restore backend/TripOps.sln --locked-mode
dotnet build backend/TripOps.sln --no-restore
dotnet run --project backend/src/TripOps.Api --launch-profile http --no-build --no-restore
```

Tại terminal kiểm tra mới ở root: `Invoke-RestMethod http://localhost:5080/api/v1/health`. `/health` chỉ liveness; DTO health trả database=not_configured hoặc configured_not_checked, không mở SQL connection. Swagger tại http://localhost:5080/swagger/index.html. Chưa có business auth/authorization, không dùng scaffold phục vụ dữ liệu thật. Dừng server bằng Ctrl+C.

Connection string mặc định rỗng. Nếu cần cấu hình trước Task2, đặt environment riêng trong terminal chạy API (thay placeholder bằng bí mật local của bạn, không ghi vào appsettings tracked):

```powershell
$env:ConnectionStrings__TripOps = 'Server=localhost,14330;Database=TripOps;User Id=sa;Password=<local-password>;Encrypt=True;TrustServerCertificate=True'
```

Đây chỉ đăng ký DbContext nếu có chuỗi kết nối; không tự tạo database. Local SQL dùng SA để dev, không là hướng dẫn production. SMTP mẫu ở .env.example dành task email tương lai, JWT/signing secrets chưa tạo. Logs/ProblemDetails không hiển thị body PII/token/connection string.

### 3. Frontend

Terminal frontend mới tại repo root, tách khỏi terminal backend; sau đó mới chuyển vào frontend/:

```powershell
Set-Location frontend
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd ci
npm.cmd run dev
```

`VITE_API_BASE_URL` mặc định http://localhost:5080, không thêm /api/v1 vào base. Mở `/connection`, bấm kiểm tra để gọi health thật; chưa bấm thì “Chưa kiểm tra”, không success mock. Vite config thay đổi env cần restart; VITE variables công khai nên không chứa secrets. Browser lỗi CORS: kiểm origin/port và ASPNETCORE_ENVIRONMENT=Development. Backend chỉ cho localhost:5173 và127.0.0.1:5173; thêm `Cors__AllowedOrigins__0` theo origin cụ thể nếu cần, không wildcard credentials.

### 4. Flutter Guide

Terminal mobile mới tại repo root; đặt PUB_CACHE **trước** khi chuyển vào mobile/. Backend vẫn chạy ở terminal riêng:

```powershell
$env:PUB_CACHE = Join-Path (Get-Location) '.local/pub-cache'
Set-Location mobile
flutter pub get --enforce-lockfile
flutter devices
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5080
```

iOS simulator trên macOS dùng `--dart-define=API_BASE_URL=http://127.0.0.1:5080` nếu API chạy trên chính máy Mac; nếu API ở Windows thì dùng IP LAN Windows. Máy Android/iPhone thật cùng LAN dùng IP Windows, ví dụ `--dart-define=API_BASE_URL=http://192.168.1.20:5080` (thay IP thật). Khi cần LAN, dừng API hiện tại bằng Ctrl+C, rồi chạy tại **terminal backend ở repo root**, không phải terminal mobile/:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project backend/src/TripOps.Api --no-launch-profile --urls http://0.0.0.0:5080 --no-build --no-restore
```

Chỉ mở firewall Private Network port5080 khi cần thiết bị thật; không tự mở firewall trong scaffold. Điện thoại không dùng localhost/10.0.2.2 của Android emulator. Android Debug manifest và iOS Debug-only plist cho phép local HTTP; Release phải dùng HTTPS. Chưa chạy Android/iOS device build ở Task1; analyze/test không thay kiểm chứng thiết bị. Không complex offline sync, không báo success khi backend chưa xác nhận.

## Kiểm tra trước PR

Đây là kiểm tra chất lượng, **không phải toàn bộ bước bắt buộc mỗi lần chạy app**. Chạy lệnh cho phần mình thay đổi sau khi restore/install ở phần setup. Maintainer chạy đủ khi bàn giao scaffold. Bắt đầu ở terminal kiểm tra mới tại repo root; dừng API trước khi rebuild trên Windows nếu binary bị khóa.

```powershell
$env:DOTNET_CLI_HOME = Join-Path (Get-Location) '.local/dotnet'
$env:NUGET_PACKAGES = Join-Path (Get-Location) '.local/nuget'
$env:PUB_CACHE = Join-Path (Get-Location) '.local/pub-cache'
dotnet restore backend/TripOps.sln --locked-mode
dotnet build backend/TripOps.sln --no-restore
dotnet test backend/TripOps.sln --no-build --no-restore
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
Push-Location mobile
flutter analyze --no-pub
flutter test --no-pub
Pop-Location
git diff --check
```

Kiểm tra dành cho maintainer/tài liệu, cần Python (không cần khi chỉ khởi động app):

```powershell
python docs/tools/source_audit.py --check
python infra/verify-scaffold.py
```

Kết quả thực tế và bước không chạy được ghi tại [progress](docs/progress.md). Hai generator Task0 đã đóng băng sau Q1–Q11 để không ghi đè quyết định hiện hành; chỉ source_audit dùng kiểm tra nguồn/coverage. Không chạy Task2 tự động.

## Làm việc nhóm

- Tạo branch theo task từ nhánh chung đã cập nhật, ví dụ `task-1/setup-docs` hoặc `task-1/scaffold-fix`; gửi pull request, không push thẳng vào nhánh chung.
- PR ghi phạm vi, file chính, lệnh kiểm tra và kết quả thực tế; nêu rõ Docker/device build chưa chạy nếu chưa có môi trường. Chạy build/test/lint của phần thay đổi và `git diff --check`; thay tài liệu thì chạy thêm hai kiểm tra Python nếu có công cụ.
- Khi đổi dependency, cập nhật manifest và lockfile cùng PR; không ghi đè .env/secrets của thành viên khác. Các lệnh copy mẫu ở trên giữ nguyên file local đã có.
- Thay schema/API phải trao đổi trong issue/PR và cập nhật decisions/schema/API contract trước khi các phần khác phụ thuộc; Q1–Q11 là đầu vào hiện hành, ERD nguồn và phần bổ sung phải phân biệt. **Bàn giao này dừng Task1**: không đưa entity/migration/auth hoặc nghiệp vụ vào PR setup.

Mức bàn giao hiện tại: đủ để thành viên cài dependency, build và bắt đầu trên scaffold đã kiểm tra. Docker Compose/SQL/Mailpit và Flutter build/chạy trên thiết bị vẫn cần người có toolchain xác minh; không coi các bước đó là đã pass chỉ từ build web hoặc Flutter analyze/test.

## Tài liệu chuẩn

- [Quyết định Q1–Q11 đã chốt](docs/architecture/decisions.md)
- [ERD inventory nguyên bản27 bảng](docs/architecture/erd-inventory.md)
- [Schema mapping và bảng/cột bổ sung theo quyết định](docs/architecture/schema-proposal.md)
- [Gaps và từng màn hình](docs/architecture/gaps.md)
- [State machines](docs/architecture/state-machines.md)
- [Endpoints nghiệp vụ thiết kế](docs/api/endpoints-proposal.md)
- [Contract scaffold đang chạy](docs/api/scaffold-contract.md)
- [Source evidence](docs/architecture/source-review.md)

Nguồn ERD duy nhất docs/source/ERD.drawio.xml mới, không thiết kế25 bảng MySQL hoặc UseCase/Page-8. AI/Maps/storage/SignalR/email/bank business adapters chưa triển khai; Mailpit chỉ local SMTP container. Demo tương lai dùng passenger giả, mock hoặc manual finance có nhãn/audit. Không subscription/chat user/Google OAuth theo Q11. Không commit secrets, deploy, push hoặc chuyển tiền thật.
