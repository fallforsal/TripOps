# Tiến độ TripOps

## 2026-10-21 — Task 0 đối chiếu tài liệu và thiết kế

Trạng thái: **Hoàn tất bộ tài liệu đề xuất của Task 0, chưa phê duyệt schema/API.** Dừng tại Task 0; chưa scaffold hoặc chạy task kế tiếp.

Đầu task đã kiểm tra README, git status, toàn bộ file repository và tìm AGENTS.md trong repo/các thư mục cha có liên quan: không có AGENTS.md áp dụng. Ban đầu chỉ có README/.gitignore được theo dõi; `docs/` là dữ liệu chưa commit của người dùng. Không có schema SQL/API contract/decisions/code cũ để tái sử dụng. Giữ nguyên toàn bộ `docs/source`, không đổi ERD, không stage/commit/reset thay đổi người dùng.

Đã đọc 10 file nguồn bằng XML/OOXML, toàn bộ 11 trang UseCase và nội dung phiếu đăng ký; tạo evidence hash tại source-review. Chỉ ERD độc lập làm baseline, không lấy thiết kế khác trong UseCase/Page-8. Không thiếu file nguồn được yêu cầu. Đã trích đủ 27 bảng, 330 dòng cột (329 cặp bảng/cột phân biệt), 29 edge; truy vết 155 nhãn màn hình (gồm 5 tiêu đề) và 146 navigation edge theo geometry của năm flow.

File đầu ra/thay đổi:

- `README.md`: trạng thái thực tế, nguồn chuẩn, liên kết tài liệu và lệnh kiểm tra.
- `docs/architecture/erd-inventory.md`: toàn bộ bảng/cột với cell ID và edge thật; tách FK suy luận.
- `docs/architecture/schema-proposal.md`: từng cột SQL Server type/NULL/FK/PK, UNIQUE/index/CHECK, history/delete và bổ sung chờ duyệt.
- `docs/architecture/gaps.md`: nguồn đủ/thiếu, từng yêu cầu chức năng/phi chức năng và từng màn hình, gap IDs.
- `docs/api/endpoints-proposal.md`: method/route/role/ownership/request/response/lỗi và phân loại S/P/B; chưa phải contract chính thức.
- `docs/architecture/state-machines.md`: status/transition/actor/guards/side effects và thiếu audit persistence.
- `docs/architecture/decisions.md`: đề xuất, ảnh hưởng, Q1–Q11 cần chốt; .NET8 EOL 10/11/2026 so với đồ án kết thúc 03/2027.
- `docs/architecture/source-review.md`: hash và evidence trang/package/navigation.
- `docs/tools/source_audit.py`, `generate_baseline.py`, `generate_traceability.py`: công cụ kiểm tra/sinh tài liệu bằng Python standard library; không phải code nghiệp vụ, không ghi nguồn hoặc database.
- `docs/progress.md`: nhật ký này.

Phát hiện chính: visibility lặp, accommodation edge thiếu source, hai edge source nhầm bookings.customer_id, cardinality version/transaction cần duyệt; agency/provider/guide/business membership chưa rõ; thiếu service source links, co-host agreement/segment/handover, contract, refund/ledger/payout history, token lifecycle, GPS/timing và wrap-up. Inventory giữ lỗi gốc; proposal không được coi đã phê duyệt. API S chỉ đủ dữ liệu cốt lõi, vẫn chờ auth/constraint/ownership; API P/B còn thiếu persistence nên không được trả thành công giả.

Kiểm tra thực tế:

| Lệnh | Kết quả |
|---|---|
| `python docs/tools/generate_baseline.py` | PASS: sinh inventory/schema cho 27 bảng, 330 dòng cột, 29 edge |
| `python docs/tools/generate_traceability.py` | PASS: evidence 10 file nguồn và 155 screen labels |
| `python docs/tools/source_audit.py --check` | PASS: đối chiếu từng bảng/cột/edge, screen nodes/navigation, hash nguồn và local Markdown links |
| `git diff --check` | PASS: không lỗi whitespace trên thay đổi tracked; file mới được kiểm riêng bởi source_audit |

Không chạy backend/frontend/mobile build hoặc business tests vì repo chưa có csproj/solution/package.json/pubspec.yaml và task cấm tạo code nghiệp vụ/migration. Kiểm tra tài liệu là kiểm tra phù hợp phạm vi; không tuyên bố đã kiểm chứng performance, giao dịch tài chính hay UX/Word layout. Không thêm API chạy thật hoặc migration. Không tích hợp email/AI/Maps/bank, không deploy/push/commit hoặc chuyển tiền.

## 2026-10-21 — Áp dụng Q1–Q11 và Task 1 scaffold repository

Trạng thái: **Đã hoàn thành scaffold và các kiểm tra có công cụ trên máy. Dừng sau Task 1.** Docker runtime và device/emulator build chưa được kiểm chứng, chi tiết bên dưới. Không bắt đầu entity/migration Task 2.

Đầu task đọc lại README, git status, schema/API/decisions/progress và tệp quyết định Q1–Q11 người dùng đính kèm; tìm AGENTS.md trong repo và các thư mục cha liên quan không thấy file áp dụng. Ban đầu README đã sửa, docs còn untracked từ task trước; giữ nguyên nguồn và không stage/commit/reset dữ liệu người dùng. Repo chưa có project backend/web/mobile để tái sử dụng nên chỉ scaffold các thư mục còn thiếu.

### Thiết kế đã cập nhật

`decisions.md` lưu đầy đủ quyết định người dùng và đánh dấu cả Q1–Q11 **đã giải quyết**, không hỏi lại. `schema-proposal.md` phân biệt 27 bảng gốc/329 cột triển khai sau bỏ visibility trùng với bảng/cột mở rộng theo từng Q; có naming mapping, FK, uniqueness/guards, contract/revision, co-host net/fee, refund reserve/ledger/attempts, token hash/rotation, GPS/attendance/report. Không nhập thiết kế UseCase/Page-8 và không sửa file nguồn.

`state-machines.md`, `gaps.md`, `endpoints-proposal.md` đã cập nhật nhất quán approval→contract→verified deposit, actor/ownership và policy đã chốt; Customer chỉ options Agency cho phép. Gaps giữ truy vết150 màn hình +5 tiêu đề. Subscription/chat user/OAuth loại khỏi MVP, SignalR notifications vẫn thiết kế tương lai. Schema business vẫn chưa được triển khai. Inventory nguyên bản giữ330 dòng XML, duplicate/edge lỗi được ghi mapping triển khai; source hashes giữ nguyên.

Các generator Task0 đã đóng băng để tránh ghi đè thiết kế sau quyết định. `source_audit.py` cập nhật kiểm329 cột thiết kế so với330 dòng gốc và toàn bộ traceability. `source-review.md`/inventory hướng dẫn kiểm tra hiện hành, không thay bằng chứng nguồn.

### Scaffold và file thay đổi

- Root: `global.json` pin .NET10.0.302 stable; `.env.example` không chứa password; `.gitignore` bổ sung cache/local env/build outputs; README Windows/ports/thứ tự chạy và phạm vi thật.
- Backend: `backend/TripOps.sln`, Directory.Build.props, Api/Service/Data/Tests csproj và4 packages.lock.json. API→Service→Data, DI qua extension, controllers/DTO conventions, safe ProblemDetails/exception handler, Development-only CORS/OpenAPI/Swagger UI. Empty EF SQL Server context không entity/DbSet, không EnsureCreated/Migrate. Xóa WeatherForecast và cập nhật .http request.
- Backend runtime: ASP.NET Core/EF Core10.0.10, SwaggerUI10.3.0, OpenApi2.7.5/Pkcs10.0.13 sau restore phát hiện dependency cũ có advisory; giữ TreatWarningsAsErrors/NuGet audit. Logging console tránh cần Windows EventLog quyền ghi. Tests kiểm health thật, scope readiness, Swagger/OpenAPI Dev-only, CORS allowlist, safe exception response.
- Frontend: React/TS/Vite/Tailwind4, shadcn/ui source Button/Radix + Lucide, Router/Layout, API client có timeout/response validation, trang `/connection` gọi health thật và trạng thái chưa kiểm tra/lỗi rõ ràng. Node24.6.0/.nvmrc, package.json exact versions, npm11.5.1, package-lock, .env.example API base URL.
- Mobile: Flutter3.41.9/Dart3.11.5, Android+iOS starter, .fvmrc/pubspec.lock, HTTP client và connection screen, tests có mock được gắn nhãn. API_BASE_URL dart-define cho emulator/thiết bị thật; Android Debug cleartext và iOS Debug-only Info-Debug.plist, Release cần HTTPS. Chưa auth hoặc Guide business flows.
- Infra: compose.yaml SQL Server Developer pin image+named volume+sqlcmd healthcheck, Mailpit pin image/local SMTP/inbox; ports loopback. run-api.ps1 helper và verify-scaffold.py kiểm cấu trúc. SQL password bắt buộc local .env, không tạo database/schema.
- Docs: năm tài liệu thiết kế được yêu cầu, `docs/api/scaffold-contract.md`, progress/source evidence/inventory/tooling và README từng phần. Danh sách field/bảng mới đầy đủ tại schema-proposal; chỉ thiết kế, chưa có migration.

### API thực tế đã thêm

GET `/health` liveness text; GET `/api/v1/health` DTO đi qua API→Service→Data configuration, không truy SQL. Development GET `/openapi/v1.json` và `/swagger/index.html`. Tất cả API nghiệp vụ trong proposal vẫn planned; chưa có auth, token issuance hoặc bank transfer API. **Migration thêm: 0. Entity nghiệp vụ thêm: 0.**

### Kết quả kiểm tra thực tế

| Lệnh/kiểm tra | Kết quả |
|---|---|
| `dotnet restore backend/TripOps.sln --locked-mode --ignore-failed-sources` | PASS với cache đã restore;4 project lockfiles khớp. Restore online sau vá dependency cũng PASS |
| `dotnet build backend/TripOps.sln --no-restore` | PASS,0 warning/0 error |
| `dotnet test backend/TripOps.sln --no-build --no-restore` | PASS,8/8 tests |
| `npm.cmd --prefix frontend ci` | PASS từ package-lock, audit0 vulnerabilities tại thời điểm chạy |
| `npm.cmd --prefix frontend run build` | PASS TypeScript+Vite8.3.5 production build |
| `npm.cmd --prefix frontend run lint` | PASS oxlint |
| `dart format lib test` trong mobile | PASS,4 file format |
| `flutter pub get --enforce-lockfile` trong mobile | PASS Flutter3.41.9, lockfile khớp |
| `flutter analyze --no-pub` | PASS,No issues found |
| `flutter test --no-pub` | PASS,4/4 tests; HTTP mock chỉ trong test |
| Kestrel launch + HTTP `/api/v1/health` | PASS200, status ok/database not_configured/scope api_liveness_only; không khẳng định SQL ready |
| HTTP `/swagger/index.html` và `/openapi/v1.json` | PASS200, OpenAPI chỉ liệt kê route controller health thực tế |
| `python docs/tools/source_audit.py --check` | PASS hash nguồn,27 bảng/330 dòng gốc/329 cột thiết kế/29 ERD edges/155 screen labels/146 flow edges/local links |
| `python infra/verify-scaffold.py` | PASS .NET10/reference direction/lockfiles/no DbSet migration/Q1–Q11/Compose static guards/UTF-8 |
| `git diff --check` | PASS; file docs mới còn được kiểm whitespace qua source_audit |
| Docker Compose config/up/SQL health/Mailpit SMTP | **Chưa chạy: không có Docker CLI trong PATH và không thấy Docker Desktop binary ở vị trí chuẩn.** Static cấu hình không thay runtime validation |
| Android/iOS build và bấm UI trên emulator/điện thoại thật | Chưa chạy trong phạm vi kiểm tra này; analyze/test không chứng nhận device runtime; iOS cần macOS/Xcode |

Sandbox ban đầu chặn kết nối npm/NuGet; các lệnh restore/install cần thiết đã chạy lại bằng quyền công cụ và thành công. npm.ps1 bị ExecutionPolicy chặn nên dùng npm.cmd, không đổi policy hệ thống. Flutter SDK có sẵn, analyze/test đã thực hiện, không ghi nhầm là thiếu SDK.

Đã dừng API Kestrel sau smoke test. Không deploy, push, commit, thay firewall, tạo secrets tracked, gọi ngân hàng thật hoặc chạy Task2. Retention production vẫn hoãn theo Q11, không bật tự động xóa dữ liệu.

## 2026-10-21 — Rà soát setup để bàn giao nhóm, giữ phạm vi Task 1

Đã đọc lại git status, README các phần, SDK manifests/lockfiles, scripts, env examples và thiết kế/contract hiện hành; không thấy AGENTS.md áp dụng trong repo hoặc các thư mục cha liên quan. Giữ nguyên thay đổi chưa commit; không stage/reset/commit. Không bắt đầu Task2 hoặc sửa source nghiệp vụ.

Chỉ cập nhật5 file tài liệu: `README.md`, `frontend/README.md`, `mobile/README.md`, `infra/README.md`, `docs/progress.md`. Làm rõ từng phần mở terminal mới tại repo root, cache env phải đặt trong đúng terminal, backend chạy riêng và lệnh LAN không chạy từ mobile/. Sửa hướng dẫn iOS loopback: chỉ dùng127.0.0.1 nếu API cùng máy Mac. Copy env chỉ khi file chưa tồn tại để giữ cấu hình local. Thêm Python3.10+ cho maintainer (đã kiểm bằng3.13.7), tách bước chạy app khỏi kiểm tra trước PR, thêm branch/PR/checks và quy tắc phối hợp schema/API.

Đã đối chiếu đường dẫn solution/project/scripts, launch profile5080, Vite5173/CORS, SDK10.0.302, Node24.6.0/npm11.5.1, Flutter3.41.9/Dart3.11.5 và lockfiles. Hai env examples tồn tại, password mẫu rỗng và Vite base URL khớp API; không cần env example riêng backend/mobile. Kiểm manifest/lock frontend khớp từng version,4 NuGet lockfiles và pubspec.lock có đủ;22 local Markdown links trong README các phần/docs tồn tại. Không sửa SDK/dependency/lockfile hoặc env examples trong lần rà soát này.

| Lệnh/kiểm tra chạy lại | Kết quả thực tế |
|---|---|
| `dotnet restore backend/TripOps.sln --locked-mode --ignore-failed-sources` | PASS, các project up-to-date với cache hiện có |
| `dotnet build backend/TripOps.sln --no-restore` | PASS,0 warning/0 error |
| `dotnet test backend/TripOps.sln --no-build --no-restore` | PASS8/8, gồm health/Swagger/OpenAPI/CORS/ProblemDetails qua integration tests |
| `npm.cmd --prefix frontend run build` | PASS TypeScript+Vite8.3.5 |
| `npm.cmd --prefix frontend run lint` | PASS oxlint |
| `flutter pub get --offline --enforce-lockfile` trong mobile | PASS với cache, Flutter3.41.9/Dart3.11.5 |
| `flutter analyze --no-pub` | PASS,No issues found |
| `flutter test --no-pub` | PASS4/4 |
| `python docs/tools/source_audit.py --check` | PASS coverage/hash nguồn/local links/whitespace |
| `python infra/verify-scaffold.py` | PASS cấu trúc/reference direction/lockfiles/phạm vi scaffold |
| Đối chiếu setup/env/SDK/manifest-lock và22 local Markdown links bằng Python standard library | PASS |
| `git diff --check` | PASS |

Không chạy lại npm ci hoặc kiểm clean-machine download; lần này build dùng node_modules sẵn có, NuGet/Pub restore dùng cache. Test health trong lần này dùng integration host, không tuyên bố đã bấm kết nối web/mobile trên thiết bị. Docker CLI vẫn không có trong PATH, nên Compose config/up, SQL health và Mailpit SMTP **chưa kiểm chứng runtime**. Android/iOS device build và chạy trên emulator/điện thoại **chưa kiểm chứng**; iOS cần macOS/Xcode. Không bật firewall, cài Docker hoặc chạy chuyển tiền thật.

Mức bàn giao: **sẵn sàng để nhóm bắt đầu làm việc trên scaffold**, với source build/tests và hướng dẫn theo từng terminal đã kiểm tra trong môi trường hiện tại; chưa chứng nhận clean-machine setup, Docker runtime hoặc Flutter device build. API/migration/entity nghiệp vụ thêm trong lần này:0. Không thay API contract/hành vi runtime. Dừng tại Task1.
