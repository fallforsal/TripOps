# Quyết định Q1–Q11 đã chốt

Ngày 2026-10-21, cập nhật trước Task 1. **Q1–Q11 đều đã giải quyết, không còn câu hỏi mở trong tập này.** Nội dung dưới lưu đầy đủ quyết định người dùng để không phụ thuộc tệp đính kèm ngoài repository. Đây là quyết định nghiệp vụ/stack đã thống nhất; thiết kế cột/index chi tiết ở schema-proposal là ánh xạ kỹ thuật, chưa có entity hoặc migration.

ERD độc lập 27 bảng vẫn là baseline nguyên bản. Mọi phần mở rộng được gắn Q tương ứng, không trình bày như nội dung gốc. Không sửa phiếu đăng ký hoặc XML nguồn. Sửa lỗi sơ đồ và chuẩn hóa tên được ghi trong mapping triển khai; inventory vẫn phản ánh XML gốc.

## Q1 — TÀI KHOẢN DOANH NGHIỆP VÀ KHÓA NGOẠI

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- Trong phạm vi đồ án, mỗi Agency/Provider có một tài khoản quản trị doanh
  nghiệp. Chưa làm nhiều nhân viên/admin cho một doanh nghiệp.
- Một user có một role chính: ADMIN, TRAVEL_AGENCY, PROVIDER, CUSTOMER,
  TOUR_GUIDE. Một doanh nghiệp chưa đồng thời là Agency và Provider.
- business_profiles.user_id -> users.id, UNIQUE: mỗi tài khoản doanh nghiệp
  có tối đa một business profile.
- Giữ agency_id/provider_id -> users.id để nhất quán mô hình ERD hiện tại.
  Service layer phải kiểm tra user được tham chiếu có đúng role và trạng thái.
- business_profiles.id chỉ định danh hồ sơ doanh nghiệp.
- Không thêm Organizations hoặc OrganizationMembers trong phạm vi này.
- Với Customer doanh nghiệp, người đại diện đặt booking bằng tài khoản
  CUSTOMER; chưa làm hệ thống quản lý nhiều nhân viên của doanh nghiệp khách.

## Q2 — GUIDE VÀ QUYỀN QUẢN LÝ

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- Mỗi Guide thuộc một Agency tại một thời điểm.
- Bổ sung quan hệ quản lý Guide với Agency theo mô hình user đã chốt.
  Không suy ra Agency sở hữu Guide chỉ từ những booking từng được phân công.
- Agency tạo/kích hoạt/khóa Guide của mình; Admin có quyền quản lý toàn hệ thống.
  Guide không tự đăng ký công khai hoặc tự chuyển Agency.
- Khi chuyển Agency, giữ nguyên lịch sử phân công; xử lý các phân công tương
  lai đang xung đột trước khi chuyển.
- booking_assigned_guides.guide_id -> users.id, role TOUR_GUIDE.
- booking_participants.assigned_guide_id -> booking_assigned_guides.id.
  Assignment được tham chiếu phải thuộc cùng booking.
- checked_by/reported_by/created_by là user thực hiện thao tác.
- Bổ sung guide_profiles nếu cần để lưu chứng chỉ, hạn chứng chỉ, ngôn ngữ.
  Bằng chứng chứng chỉ lưu qua file storage; database lưu metadata/reference.
- Mỗi booking chỉ phân công Guide từ Agency có trong booking_agencies.
- Guide bị khóa không được thao tác tiếp; lịch sử vẫn giữ nguyên.

## Q3 — LỖI SƠ ĐỒ VÀ TRẠNG THÁI TOUR

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- visibility bị lặp là lỗi sơ đồ. Chỉ giữ một cột:
  PUBLIC hoặc PRIVATE.
- Tách khỏi status:
  DRAFT, PENDING_APPROVAL, PUBLISHED, HIDDEN, REJECTED.
- PRIVATE xác định ai được xem; không tự động bỏ qua quy trình duyệt.
- Sửa quan hệ booking_accommodations.booking_id -> bookings.id.
- Với các edge sai endpoint/source, đối chiếu đúng cột trước khi sửa; ghi
  lại thay đổi trong tài liệu, không sửa chỉ theo vị trí hình học.
- tours 1:N tour_versions, UNIQUE(tour_id, version).
- tours.version là số phiên bản hiện tại; tour_versions giữ snapshot lịch sử.
- Restore tạo một version mới, không ghi đè hoặc xóa version cũ.
- Chuẩn hóa các tên như baseprice/diemnoibat theo naming convention và ghi
  bảng ánh xạ tên ERD -> tên triển khai.

## Q4 — CO-HOSTING

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- Hỗ trợ cả tour thường và tour theo yêu cầu.
- Mỗi tour/booking hợp tác có đúng một Agency host và có thể có nhiều partner.
- Host chịu trách nhiệm làm việc với Customer và tổng hợp lịch trình.
- Mỗi segment xác định:
  Agency phụ trách, thứ tự chặng, ngày bắt đầu/kết thúc trong lịch trình,
  địa bàn, phạm vi dịch vụ, điểm/thời gian bàn giao và Guide phụ trách.
- Hai cách báo giá segment:
  PER_GUEST: giá thỏa thuận × số khách tính phí đã snapshot.
  LUMP_SUM: tổng cố định cho segment.
- Mặc định số khách tính phí segment gồm adult + child; infant không tính.
  Nếu thỏa thuận khác, phải cấu hình và snapshot rõ.
- Báo giá phải được hai Agency chấp nhận; sửa giá/phạm vi sau khi chấp nhận
  tạo revision cần chấp nhận lại.
- suggested_budget chỉ là ngân sách đề xuất, không phải thỏa thuận đã chốt.
- Partner nhận khoản net đã thỏa thuận. Phí nền tảng được trừ vào phần host.
  Host nhận phần doanh thu còn lại sau partner net và platform fee.
- Tỷ lệ chia là giá trị suy ra để hiển thị từ các khoản đã chốt, không là một
  công thức tính tiền thứ hai.
- Nếu phần host bị âm, chặn chốt thỏa thuận và yêu cầu sửa giá/thỏa thuận.
- Bổ sung cấu trúc invitation/agreement/segment cần thiết; không nhét quan
  hệ và tiền vào communication_notes.
- booking_agencies lưu kết quả phân bổ của từng Agency cho booking thực tế.

## Q5 — TÙY CHỈNH DỊCH VỤ VÀ CƠ SỞ TÍNH GIÁ

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- Customer chỉ chọn các phương án Agency cấu hình và cho phép.
- Không cho Customer chọn tùy ý mọi service Approved trên nền tảng.
- Ngoài các lựa chọn sẵn có, Customer gửi yêu cầu để Agency báo lại giá.
- Lựa chọn có source service reference khi dùng dịch vụ trên nền tảng,
  đồng thời giữ snapshot thông tin/giá cho booking.
- Quy ước chênh lệch giá trong MVP:
  + Meal: VND/khách tính phí cho một bữa.
  + Accommodation: VND/khách tính phí/đêm.
  + Attraction: VND/khách tính phí cho một lượt trong lịch trình.
- Khách tính phí mặc định là adult + child; infant không chịu phụ thu.
  Nếu cần phụ thu khác theo nhóm tuổi, phải khai báo riêng.
- price_difference là phần chênh lệch so với option mặc định, có thể âm.
  Option mặc định có delta = 0.
- Tổng giá = giá tour theo các tier + tổng delta theo số lượng
  + adjustment đã được chấp nhận.
- Hotel không tính theo phòng trong MVP; chưa quản lý room allocation.
- Các đơn vị tính phải hiện rõ trên giao diện.
- Chưa làm tồn kho/reservation tự động với Provider.
  Agency xác nhận khả năng cung ứng trước khi duyệt booking.
- capacity trên service là thông tin công bố, không đồng nghĩa tồn kho realtime.

## Q6 — BOOKING VÀ HỢP ĐỒNG

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- Tạo booking ban đầu ở PENDING_APPROVAL.
- Sau Agency approval:
  AWAITING_CONTRACT -> AWAITING_DEPOSIT -> CONFIRMED.
- Chỉ CONFIRMED khi:
  Agency đã duyệt, Customer đã chấp nhận đúng revision hợp đồng,
  và tiền cọc yêu cầu đã được xác nhận thực nhận.
- Không xác nhận booking chỉ vì Customer gửi ảnh chuyển khoản.
- Hợp đồng dùng xác nhận online trong phạm vi đồ án:
  lưu người xác nhận, thời điểm và snapshot/version nội dung.
  Chưa tích hợp nhà cung cấp chữ ký số.
- Mỗi thay đổi giá, dịch vụ chính, ngày đi hoặc điều khoản tạo revision
  cần Customer chấp nhận lại.
- Sửa lỗi liên hệ/chính tả không đổi nghĩa vụ thì ghi audit, không bắt
  chấp nhận lại toàn bộ hợp đồng.
- Thay đổi số khách/nhóm tuổi phải tính lại giá, kiểm tra điều kiện và
  tạo revision khi ảnh hưởng nghĩa vụ.
- Một custom request có thể nhận nhiều phương án/tour/báo giá.
  Customer chỉ chọn một phương án để tạo một booking còn hiệu lực.
  Giữ lịch sử phương án và booking đã hủy; không xóa để tạo lại.
- Bổ sung bảng hợp đồng/revision và các reference snapshot cần thiết.

## Q7 — VẬN HÀNH VÀ KẾT THÚC TOUR

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- Guide gửi wrap-up report; Agency host xác nhận hoàn thành booking.
- Partner có thể ghi nhận chặng của mình hoàn thành nhưng không tự kết thúc
  toàn bộ booking.
- Hoàn thành chuyến và hoàn tất tài chính là hai trạng thái riêng.
- Điểm danh hành khách một lần lúc khởi hành:
  Present, Late, Absent; chưa điểm danh là trạng thái riêng.
- Pickup window mặc định:
  mở 30 phút trước giờ tập trung, đóng 60 phút sau giờ tập trung.
  Lưu thành cấu hình; bổ sung giờ/địa điểm tập trung nếu schema chưa có.
- Agency có thể cho phép sửa ngoài cửa sổ với lý do và lịch sử thay đổi.
- Attraction check-in là Guide ghi nhận tiến độ điểm tham quan,
  không phải điểm danh lại từng hành khách.
- Thu ảnh, tọa độ, accuracy và thời gian nếu thiết bị cung cấp.
  Accuracy kém hơn 100m thì cảnh báo/cho thử lại; không dùng GPS như bằng
  chứng tuyệt đối hoặc chặn toàn bộ nghiệp vụ.
- Nếu không lấy được vị trí, cho gửi với lý do và trạng thái cần kiểm tra.
- Không triển khai offline synchronization phức tạp trong MVP.
  Có thể giữ draft; chỉ báo đã gửi khi backend xác nhận thành công.
- Emergency contacts lấy từ contact của booking và số điều hành Agency.
  Bổ sung số điều hành rõ ràng nếu dữ liệu hiện tại chưa đủ.

## Q8 — HỦY, HOÀN TIỀN, KHIẾU NẠI VÀ ĐÁNH GIÁ

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- Agency đề xuất phương án giải quyết; Admin quyết định cuối cùng phần tiền
  do nền tảng quản lý.
- Cancellation policy là dữ liệu có cấu trúc, được snapshot vào hợp đồng,
  không chỉ là một đoạn văn policies.
- Cấu hình demo ban đầu:
  + Hủy từ 14 ngày trước ngày đi: phí 10%.
  + Từ 7 đến dưới 14 ngày: phí 30%.
  + Từ 3 đến dưới 7 ngày: phí 50%.
  + Dưới 3 ngày: phí 100%.
  Đây là policy demo, có thể sửa cho từng tour trước khi ký hợp đồng.
- Phí tính trên giá trị hợp đồng hiệu lực.
- Hoàn tối đa = max(0, tiền đã nhận - phí hủy), đồng thời trừ các khoản
  đã hoàn hoặc đang giữ chỗ để hoàn.
- Nếu phí lớn hơn số đã nhận, không tự thu thêm; ghi nhận phần cần xử lý
  theo hợp đồng để Admin quyết định.
- Admin có thể miễn/giảm phí hoặc hoàn một phần vì sự cố, có lý do/audit.
- Cửa sổ khiếu nại tài chính sau tour mặc định 7 ngày; cấu hình được.
  Vụ việc đã mở trong cửa sổ vẫn được xử lý sau hạn.
- Không chi khoản đang có khiếu nại tài chính chưa xử lý.
- Một booking có thể có nhiều complaint.
- Một feedback cho mỗi bộ booking/customer/agency; Customer được cập nhật
  theo chính sách và giữ lịch sử nếu có moderation.
- Chỉ Customer của booking đủ điều kiện mới được đánh giá.

## Q9 — VIETQR, PHÍ 8% VÀ QUYẾT TOÁN

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- MVP dùng VietQR và đối soát thủ công có audit.
- Thiết kế interface cho bank adapter tương lai, chưa tích hợp ngân hàng thật.
- Không xem ảnh chuyển khoản là bằng chứng đủ để tự đánh dấu SUCCESS.
- Commission mặc định 8%, được snapshot lúc chốt hợp đồng.
  Đổi cấu hình hệ thống không làm thay đổi booking đã chốt.
- Cơ sở tính phí là khoản doanh thu thực giữ lại của booking:
  tiền đã xác nhận nhận - tiền đã hoàn.
  Phần phí hủy được giữ lại cũng thuộc cơ sở này trong policy demo.
- Chỉ quyết toán cuối khi không còn refund đang xử lý, không còn nghĩa vụ
  chưa giải quyết và đã hết cửa sổ dispute hoặc có quyết định Admin.
- Tính tổng platform fee một lần cho booking.
  Partner nhận net đã thỏa thuận; host chịu platform fee và nhận phần còn lại
  như Q4. Không trừ thêm 8% từ partner lần nữa.
- Lưu tiền bằng decimal(19,2), thanh toán VND làm tròn đến đồng.
  Quy tắc làm tròn phải thống nhất; phần lệch phân bổ dồn về host.
- MVP một khoản payout cuối cho mỗi Agency trong một lần settlement.
  Chưa làm nhiều đợt partial payout tùy ý.
- Retry dùng cùng mã nghiệp vụ/idempotency key; mỗi attempt có lịch sử.
  Timeout/không rõ kết quả phải ở trạng thái cần đối soát, không tự retry mù.
- booking_agencies là dữ liệu phân bổ/tổng hợp; cần bản ghi giao dịch và
  lịch sử quyết toán riêng để chứng minh tiền đã thu/hoàn/chi.
- Bổ sung schema tài chính cần thiết. Không sửa số tiền của giao dịch đã chốt.
- Mọi thao tác ngân hàng trong bản demo là mock hoặc xác nhận thủ công,
  không gọi chuyển khoản thật.

## Q10 — PHIÊN BẢN .NET

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- Chọn .NET 10 LTS cho project mới.
- Dùng ASP.NET Core 10 và EF Core 10 tương thích.
- Chọn bản stable/patch có sẵn, kiểm tra tương thích thực tế và pin SDK.
  Không dùng preview.
- Các thư viện bên thứ ba chọn phiên bản tương thích, không ép số major = 10.
- Cập nhật README và tài liệu kỹ thuật để ghi quyết định thay .NET 8.
  Không tự sửa file phiếu đăng ký gốc.
- Trong decisions.md ghi rõ nhóm cần cập nhật thông tin stack trong hồ sơ
  đồ án khi hoàn thiện tài liệu chính thức.

## Q11 — PHẠM VI PHỤ, AUTH, EMAIL VÀ DỮ LIỆU CÁ NHÂN

**ĐÃ CHỐT theo xác nhận người dùng ngày 2026-10-21.**
- Subscription plans, chat realtime giữa người dùng và Google OAuth nằm
  ngoài MVP hiện tại.
- SignalR cho thông báo nghiệp vụ vẫn thuộc phạm vi.
- Login bằng email/password; BCrypt theo phiếu đăng ký.
- JWT access token mặc định 15 phút.
- Refresh token mặc định 7 ngày, có rotation và revoke.
- Lưu hash refresh/reset/verification token; bổ sung bảng token cần thiết.
- Logout thu hồi phiên refresh tương ứng.
  API vẫn phải kiểm tra trạng thái khóa tài khoản cho nghiệp vụ được bảo vệ.
- Email local dùng Mailpit hoặc SMTP test; cấu hình SMTP qua environment.
  Chưa chọn/mua dịch vụ email production.
- Không tự tạo toàn bộ bảng ASP.NET Identity nếu không dùng mô hình đó.
- Development/demo dùng dữ liệu hành khách giả.
- Thông tin định danh chỉ cho người có nhiệm vụ được phép xem;
  không trả toàn bộ PII trong mọi API danh sách hoặc ghi vào log.
- Chưa bật xóa dữ liệu tự động bằng một thời hạn tùy ý.
  Chính sách retention production do chủ dự án xác nhận trước triển khai thật.
  Giữ riêng yêu cầu lưu chứng từ và nhu cầu xóa/ẩn PII.

## Ánh xạ kỹ thuật áp dụng tại Task 1

- API tham chiếu Service, Service tham chiếu Data; Data sở hữu EF Core DbContext rỗng. API composition root đăng ký DI qua Service. DTO tách model, controllers dùng /api/v1, ProblemDetails và exception handler. Không có entity/DbSet/migration nghiệp vụ.
- .NET SDK **10.0.302 stable** có trên máy được pin trong global.json, ASP.NET Core/EF Core **10.0.10**. Swagger UI **10.3.0** là thư viện độc lập, không ép số major; Microsoft.OpenApi **2.7.5** và Pkcs **10.0.13** được pin sau cảnh báo restore, không tắt NuGet audit. Lockfiles khóa dependency thực tế. Nhóm cần cập nhật stack từ .NET 8 sang .NET 10 trong hồ sơ đồ án chính thức; không sửa file phiếu gốc.
- Quy tắc làm tròn VND thống nhất cho thiết kế: decimal.Round(value, 0, MidpointRounding.AwayFromZero); fee tổng làm tròn một lần, phần lệch phân bổ dồn host. Đây là cách cụ thể hóa Q9, chưa có code tính tiền ở Task 1.
- Không Organizations/OrganizationMembers, multi-role, multi-admin, Google OAuth, subscription, chat giữa user, room allocation, automatic reservation hoặc offline sync phức tạp. SignalR notifications vẫn trong thiết kế tương lai.
- SMTP local Mailpit/SMTP test cấu hình environment. Task 1 chỉ có container Mailpit và cấu hình mẫu; chưa gửi email, chưa tạo token/auth/financial adapter. Ngân hàng thật không tích hợp; thao tác demo sau này mock có nhãn hoặc xác nhận thủ công có audit.
- Các mục kỹ thuật cụ thể hóa sau (entity constraints/migration tại Task 2) không mở lại Q1–Q11. Retention production được hoãn có chủ ý theo Q11, không đặt thời hạn xóa tự động.

## Truy vết quyết định

| Quyết định | Tác động đã cập nhật | Trạng thái |
|---|---|---|
| Q1 | FK tới users, role chính, profile UNIQUE user, không tenant membership | Đã giải quyết |
| Q2 | guide_profiles + lịch sử agency, assignment FK đúng booking, chuyển agency có kiểm tra | Đã giải quyết |
| Q3 | một visibility, năm tour status, version 1:N, tên triển khai và mapping edge | Đã giải quyết |
| Q4 | invitation/segment/agreement revisions + acceptance, net partner và host fee | Đã giải quyết |
| Q5 | options agency-only, delta units, adult+child, service source/snapshot, không inventory | Đã giải quyết |
| Q6 | AWAITING_CONTRACT→AWAITING_DEPOSIT→CONFIRMED, online revision acceptance | Đã giải quyết |
| Q7 | pickup window config, attendance audit, checkin GPS review, wrap-up host complete | Đã giải quyết |
| Q8 | structured cancellation demo, admin money decision, 7-day financial dispute, multi complaint | Đã giải quyết |
| Q9 | manual audited VietQR, fee snapshot8%, retained-revenue basis, final settlement/attempts | Đã giải quyết |
| Q10 | .NET10/ASP.NET10/EF10 stable, SDK pin/lockfiles | Đã giải quyết |
| Q11 | BCrypt/JWT15m/refresh7d rotation/revoke/hash, Mailpit, privacy, excluded features | Đã giải quyết |

Nguồn kỹ thuật đã kiểm tra: [ASP.NET Core OpenAPI](https://learn.microsoft.com/aspnet/core/fundamentals/openapi/aspnetcore-openapi?view=aspnetcore-10.0), [Swagger UI](https://github.com/dotnet/AspNetCore.Docs/blob/main/aspnetcore/fundamentals/openapi/using-openapi-documents.md), [OpenAPI patch advisory](https://github.com/advisories/GHSA-v5pm-xwqc-g5wc), [Pkcs patch advisory](https://github.com/advisories/GHSA-846f-f764-76mx). Phiên bản SDK/runtime có trên máy là bằng chứng chạy thực tế, không phải cam kết máy đã cài bản SDK mới nhất.
