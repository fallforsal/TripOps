# Phân tích dựng lại BE và thay FE bằng TripOps_FE_new

Ngày kiểm tra: 2026-11-01. Phạm vi: phân tích trước khi thay code.

## Kết luận

Có thể dùng toàn bộ mã giao diện trong `D:/SEP/TripOps_FE_new` để thay frontend hiện tại, rồi nối API từ BE dựng mới. Đây là thay nguồn giao diện và tích hợp dữ liệu theo từng luồng, không phải chỉ sửa BASE_URL. Giữ thiết kế UI không có nghĩa giữ nguyên các handler mock hoặc cho phép trình duyệt tự chốt giá, thanh toán và quyền thao tác.

Có thể giữ chức năng nghiệp vụ BE hiện có, chuyển các phần phù hợp sang nền mới và cập nhật ánh xạ schema. Không cần vứt bỏ thuật toán, quy tắc và test đã có chỉ vì thay entity/database.

Schema chuẩn cho lần dựng mới: `D:/SEP/database-revised.dbml`, 36 bảng. Không dùng bản `backend/database.md` cũ hoặc tài liệu DATABASE_SCHEMA.md đi kèm FE làm schema thay thế. Không thêm quản lý tồn phòng, không thêm bảng chặng, không thêm FK từ booking tới tour_versions.

## Hiện trạng đã đọc trực tiếp từ code

- FE mới: 188 file trong src; 97 file giống FE cũ, 68 file khác nội dung, 23 file mới. FE cũ có 7 file src không có trong FE mới, chủ yếu phục vụ tích hợp API thật.
- Cả hai FE dùng React 18, TypeScript, Vite 6 và Tailwind 4; có thể chuyển sang giao diện mới mà không phải đổi framework.
- FE mới App.tsx khởi tạo tours, bookings, users, services, yêu cầu thiết kế, yêu cầu Provider, hoàn tiền và khiếu nại từ mockdata. Nhiều thao tác chỉ gọi setState.
- authService mới vẫn kiểm tra tài khoản demo và sinh mock_jwt_token; chưa phải xác thực thật. Quên mật khẩu hiện chỉ đổi trạng thái hiển thị.
- FE mới thiếu AuthContext.tsx, usePartnerApplications.ts, lib/http.ts, bookingAdapter.ts, partnerService.ts, wf02Tours.ts và wf05Bookings.ts của FE cũ. Cần đưa logic phù hợp sang hoặc viết lớp thay thế.
- BE hiện có API tài khoản/hồ sơ doanh nghiệp/duyệt đối tác, quản lý và công khai tour, danh mục dịch vụ đọc, booking và vận hành HDV. Các entity khác không đồng nghĩa đã có API nghiệp vụ.
- BE hiện xác thực bằng cookie HttpOnly; FE mock nói tới JWT nhưng không bắt buộc chuyển BE sang JWT. Có thể giữ cookie và HTTP client credentials/include, cấu hình proxy/CORS phù hợp.

## Giữ chức năng nào, thay phần nào

| Nhóm | Hiện có ở BE | Hướng xử lý khi dựng mới |
|---|---|---|
| Tài khoản, đăng nhập, đăng xuất, phiên làm việc | Có | Chuyển lại xác thực thật, hash mật khẩu, phân quyền, lỗi và giới hạn đăng nhập; nối UI mới |
| Hồ sơ Agency/Provider và duyệt đối tác | Có | Giữ nghiệp vụ; ánh xạ lại các nhãn và thuộc tính UI |
| Tour: tạo/sửa, lịch trình, giá theo tuổi, lựa chọn ăn/ở, ảnh | Có | Giữ quy tắc phù hợp; viết mapping theo location, restaurant_name, description, is_default, address và schema mới |
| Clone, lịch sử và khôi phục tour | Có | Giữ; tour_versions là lịch sử, khách đặt qua tour_id |
| Tìm tour, xem chi tiết, lọc/phân trang | Có | Giữ API hoặc chuyển code; tích hợp màn hình mới |
| Duyệt tour Admin | Có xem và ẩn; chưa đủ approve/reject như FE mới | Cần thống nhất vòng đời rồi bổ sung API; không ánh xạ nút approve/reject vào API hide |
| Booking, tính giá, hành khách, hủy, Agency xác nhận/từ chối | Có luồng cơ bản | Giữ tính toán ở BE; cập nhật participant theo agency, các snapshot và dịch vụ tùy chỉnh |
| Yêu cầu thanh toán và giao dịch | Có ghi nhận thanh toán demo/ledger trong luồng booking | Giữ cách tính từ giao dịch hợp lệ, chống ghi trùng; viết API quản lý đợt thu và xác minh thanh toán riêng |
| Gán HDV, xem booking được giao, điểm danh khách, tạo sự cố | Có luồng cơ bản | Giữ kiểm tra quyền; thêm CRUD HDV, check-in điểm tham quan và xử lý sự cố theo UI nếu chưa có |
| Provider tạo/sửa dịch vụ, Admin duyệt dịch vụ | Chưa có API ghi tương ứng; catalogue hiện chỉ đọc | Viết API mới, kiểm tra chủ sở hữu và trạng thái duyệt |
| Provider nhận đoàn, xác nhận/báo tổng giá/từ chối | UI mới có mock | Viết API trên booking_hotels và booking_restaurants; Provider xác định qua service.provider_id, không quản lý tồn phòng |
| Yêu cầu thiết kế tour | UI mock; chưa có API đầy đủ | Viết module trên tour_design_requests và tour_design_request_agencies |
| Đồng tổ chức và chia tiền Agency | UI mock; chưa có API đầy đủ | Dùng các bảng agency tham gia request/booking, participant theo agency; làm rõ lời mời đồng tổ chức ở cấp tour thông thường |
| Hoàn tiền, quyết toán, cấu hình phí/tài khoản ngân hàng | UI mock; chưa có API đầy đủ | Viết mới với giao dịch DB, kiểm tra tổng tiền và quyền Admin |
| Khiếu nại, đánh giá, chat | UI/mock hoặc dữ liệu mẫu; chưa có API đầy đủ | Viết API riêng; phần lịch sử khiếu nại cần giải quyết khoảng trống schema |
| AI | Endpoint dự thảo hiện trả 503 khi chưa cấu hình tích hợp | Chưa phải tính năng AI thực hoạt động; cần tích hợp nhà cung cấp riêng |
| Wishlist, thông báo, ưu đãi, thẻ thanh toán, quên mật khẩu | Có màn hình nhưng chưa đủ dữ liệu/API | Không coi là tính năng thật chỉ vì có UI; cần xác định phạm vi và dữ liệu lưu |

## Những chỗ UI mới chưa khớp schema

1. **ID và vai trò:** UI dùng company-1, provider-1, agency/guide/company_admin; schema dùng users UUID và role tương ứng. API phải trả định danh thật và ánh xạ agency từ users/business_profiles. Không suy ra quyền bằng ID hoặc vai trò người dùng gửi lên.
2. **Địa chỉ liên hệ và bản đồ khách sạn:** FE còn contactAddress và mapUrl. Không lưu contactAddress vào booking vì đã bỏ cột; bỏ trường nhập tương ứng. Bản đồ có thể sinh từ địa chỉ/tọa độ dịch vụ, không cần thêm lại tour_hotels.map_url.
3. **Khách và Agency:** giữ participant_index để nhận diện cùng người giữa agency; chỉ một is_primary cho mỗi booking/index; không đếm các dòng đối tác thành khách mới hoặc thu tổng giá hai lần.
4. **ProviderGroupReservationRequest:** tên tour, agency, khách, ngày và giá có thể ghép từ các bảng booking. Tuy nhiên status, provider_response và total_price chỉ đủ cho phản hồi cơ bản. UI còn có thời điểm phản hồi, lý do hủy, ghi chú yêu cầu, loại phản hồi và thông tin báo giá. Cần chỉ rõ trường nào suy ra được, trường nào được lưu; không nhét mọi metadata vào text mà không có hợp đồng dữ liệu. Duyệt yêu cầu trong FE hiện đặt confirmed ngay dù có trạng thái quoted: cần phân biệt gửi báo giá với Agency chấp nhận giá nếu quy trình có bước đó.
5. **Phạm vi khách Provider được xem:** không tự động trả toàn bộ đoàn của booking cho mọi Provider; phải xác định phần dịch vụ và agency phụ trách, hạn chế dữ liệu cá nhân theo nhu cầu xử lý.
6. **Khiếu nại:** complaints lưu nội dung/phản hồi/kết luận, chưa có quan hệ lịch sử nhiều ComplaintMessage như UI. Có thể làm phiên bản phản hồi cơ bản bằng các cột hiện có; để giữ toàn bộ lịch sử đối thoại cần thiết kế lưu riêng hoặc liên kết chat được xác định rõ.
7. **Hoàn tiền:** refund_requests chưa có bankTransactionCode riêng. refundPercentage có thể tính từ các số tiền khi mẫu số > 0; mã chứng từ và lịch sử chuyển hoàn không thể chỉ hiển thị rồi bỏ khi tải lại.
8. **Đồng tổ chức cấp tour:** UI có tour.coHosts ngay cả tour không bắt nguồn từ request, trong khi schema có agency theo design request và theo booking. tour_pricing_tiers.agency_id không đủ biểu diễn lời mời, trạng thái chấp nhận và trách nhiệm. Muốn giữ đầy đủ luồng này cần làm rõ nơi lưu, không tự thêm bảng trái schema đã chốt.
9. **Hợp đồng:** UI có đối tượng TourContract nhưng schema 36 bảng chưa có nơi lưu độc lập tương ứng. Chưa thể hứa giữ trọn quy trình hợp đồng/chữ ký chỉ bằng đổi API.
10. **Trạng thái:** FE mới dùng published/hidden/rejected cho tour; BE tách status và visibility. Tài liệu BOOKING_STATUS_MATRIX còn ghi trạng thái nhận/từ chối của phân công HDV trong khi schema không có cột đó. Cần bảng chuyển trạng thái duy nhất, phân biệt trạng thái tour, booking, thanh toán, kiểm duyệt và dịch vụ.
11. **Snapshot:** bỏ FK booking -> tour_versions không có nghĩa đọc tour hiện tại để dựng lại booking cũ. Các bảng booking_* phải giữ giá, lịch trình và dịch vụ đã chốt.

## Nền BE đề xuất

Giữ .NET 10, EF Core và SQL Server để chuyển lại những phần đang hoạt động. Tổ chức API -> Service theo nghiệp vụ -> Data/EF Core; DTO độc lập entity. Các module: Accounts, BusinessProfiles, Services, Tours, TourDesignRequests, Bookings, Providers, Guides/Operations, Payments, Refunds/Settlements, Feedbacks/Complaints và Chat.

Nền chung gồm DI, cấu hình, cookie auth, chính sách quyền/kiểm tra chủ sở hữu, validation, xử lý lỗi tập trung, phân trang, OpenAPI, upload, transaction và seed dữ liệu demo. Viết mapping rõ ràng giữa DB/DTO và UI; không trả trực tiếp EF entity hoặc nhận giá/trạng thái tài chính do trình duyệt tự quyết định.

## Trình tự thay thế

1. Lưu bản sao đầy đủ code hiện tại, gồm các file chưa commit. Giữ lịch sử Git và sao lưu database trước mọi bước thay thế; không coi Git HEAD là bản sao của toàn bộ thay đổi đang có.
2. Đưa schema đã chốt vào BE mới, mapping entity/FK/index theo SQL Server. Dùng database phát triển mới để chạy migration nền; không xóa DB hiện tại hoặc lịch sử migration đã áp dụng chỉ vì dựng lại mã nguồn.
3. Dựng API nền và chuyển Accounts/Tours/Bookings trước; mang theo những test nghiệp vụ còn đúng và sửa test theo schema mới.
4. Thay nội dung frontend bằng UI mới cùng assets/styles; giữ bản nguồn TripOps_FE_new để đối chiếu. Không giữ hai bộ FE hoạt động cạnh tranh trong cấu hình chạy chính.
5. Thay mock theo từng module qua HTTP client và hooks; bỏ hardcoded company/provider IDs, thêm trạng thái tải/lỗi/không có dữ liệu. Những màn hình chưa có API phải báo rõ hoặc chưa mở chức năng, không báo thành công bằng setState.
6. Viết các module mới theo thứ tự Provider -> thiết kế/đồng tổ chức -> tài chính/hoàn tiền -> khiếu nại/đánh giá/chat. Giải quyết các khoảng trống lưu trữ trước khi tuyên bố hoàn tất toàn bộ UI.
7. Kiểm tra luồng xuyên vai trò: đăng ký/duyệt đối tác -> Agency tạo/clone tour -> khách đặt -> Agency gửi dịch vụ -> Provider phản hồi -> chốt giá/thanh toán -> gán HDV -> vận hành -> hoàn tất/hoàn tiền. Tải lại trình duyệt phải giữ dữ liệu đã lưu và người dùng khác phải thấy trạng thái cập nhật đúng quyền.

## Trạng thái thực hiện

Lượt này chưa xóa/thay code ứng dụng, chưa đổi schema hoặc chạy migration. Đã đọc và đối chiếu nguồn, cài dependencies cho FE mới để kiểm tra khả năng build; giữ nguyên package.json và package-lock.json có sẵn.

Kết quả kiểm tra:

- `dotnet test backend/TripOps.sln --no-restore -p:UseAppHost=false --verbosity minimal`: đạt 93/93, không bỏ qua test. Đây là test của BE/schema hiện tại, không chứng minh BE đã khớp DBML mới.
- FE mới `npm run build`: thành công; có cảnh báo bundle JS khoảng 2.8 MB trước gzip. Build Vite không thay thế TypeScript typecheck.
- FE mới `npm run typecheck`: thất bại với 13 lỗi hiện có. AgencyTourManagement.tsx có 11 lỗi quanh meals có thể undefined và kiểu callback; TourDetailPage.tsx có 1 lỗi truy cập kiểu phần tử meals; UserBookingDetailPage.tsx có 1 lỗi so sánh category với food không thuộc union. Cần sửa khi đưa UI mới vào dự án.
- Chưa kiểm thử UI bằng trình duyệt hoặc luồng xuyên API mới; chưa có BE mới trong bước phân tích này.
