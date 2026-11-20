# Bộ dữ liệu giả lập miền Trung – miền Tây

Đã tạo theo yêu cầu cho môi trường Development của TripOps. Dữ liệu thêm mới có email miền `regional-demo.tripops.test`, mã tour/booking bắt đầu `REG26-`, tên hoặc mô tả ghi rõ dữ liệu mẫu. Không xóa hay chuyển quyền các bản ghi có sẵn.

## Phạm vi

19 tỉnh/thành hiện hành: Thanh Hóa, Nghệ An, Hà Tĩnh, Quảng Trị, Huế, Đà Nẵng, Quảng Ngãi, Gia Lai, Đắk Lắk, Khánh Hòa, Lâm Đồng, Đồng Nai, Hồ Chí Minh, Tây Ninh, Đồng Tháp, Vĩnh Long, Cần Thơ, An Giang, Cà Mau.

Mỗi địa bàn có một Agency **trong bộ mẫu mới**, hai tour nội tỉnh, ba Provider mô phỏng (lưu trú, ăn uống, trải nghiệm/xe), hai HDV, ba Customer, năm bài dịch vụ và bốn mục danh bạ riêng. Agency cũ vẫn giữ nguyên; quy tắc một Agency/tỉnh không chuyển quyền hay xóa lịch sử có sẵn.

Tổng: 172 tài khoản mới (1 Admin, 19 Agency, 57 Provider, 38 HDV, 57 Customer), 38 tour công khai, 95 bài dịch vụ Provider, 76 nhà cung cấp riêng, 228 booking và 38 yêu cầu thiết kế. Trong 228 booking có 141 hoàn thành, còn lại chia các trạng thái hủy, chờ xử lý, xác nhận, đặt cọc, đang diễn ra và trả đủ. Có 113 đánh giá giả lập với điểm/số lượng khác nhau.

Tour thứ nhất dùng khách sạn/nhà hàng từ Provider; tour thứ hai dùng danh bạ riêng. Booking có người lớn, trẻ em, em bé, SĐT giả lập hoặc trống cho trẻ, ghi chú ăn chay/xếp phòng, Agency phụ trách, HDV, lịch trình, thời gian lưu trú, báo giá và các đợt thu.

## Thông tin tham khảo và thông tin giả lập

- Tên địa điểm, tên cơ sở và ảnh tham khảo có nguồn trong [manifest](data/regional-demo-2026.json). Tên món/dịch vụ và lịch trình được viết lại để minh họa; không sao chép nhận xét khách trên web.
- Nguồn địa giới: [Nghị quyết 202/2025/QH15](https://congbao.chinhphu.vn/tai-ve-van-ban-so-202-2025-qh15-45050-56708?format=pdf). Đồng Nai hiển thị là thành phố theo [Nghị quyết 30/2026/QH16](https://chinhphu.vn/?classid=1&docid=218009&pageid=27160), hiệu lực 30/04/2026.
- Địa bàn tour mới dùng mã tỉnh mới. Danh mục chọn tour có 34 địa bàn; các mã cũ vẫn đọc được và được gộp khi tìm kiếm/thống kê. Không sửa chuỗi JSON của booking đã chốt.
- Tài khoản Agency/Provider là doanh nghiệp **hư cấu**, không phải tài khoản thật của khách sạn được tham khảo. Logo SVG là logo mẫu tự tạo; không giả mạo giấy phép, mã số thuế hay người đại diện thật.
- Giá tour, giá dịch vụ, sức chứa, lịch chạy, sao cấu hình trong kịch bản, hành khách, đánh giá, trạng thái duyệt và lịch sử thanh toán là dữ liệu thử nghiệm. Không dùng làm báo giá hay xác nhận xếp hạng của cơ sở thật. Địa chỉ danh bạ ở mức tên cơ sở + tỉnh hiện hành; xem website nguồn để biết địa chỉ chi tiết.
- Điện thoại giả dùng đầu `000`; không cấp số CCCD/hộ chiếu giả và không sao chép thông tin cá nhân trên web. Email dùng miền `.test`.
- Thanh toán có `payment_method = DEMO`, không có link cổng thanh toán. Quyết toán lịch sử có ghi chú giả lập và `auto_payout_at = NULL`; seeder không gọi payOS, gửi email hoặc nhắn tin ra ngoài.
- Các booking cũ mô phỏng dữ liệu lịch sử; không tạo file hợp đồng ký, chứng cứ thanh toán ngân hàng hay chuyến đi có thật.
- Ảnh được tham chiếu từ URL nguồn, không tải về hoặc tái cấp phép. Một số trang chặn HTTP thu thập metadata nhưng đã kiểm tra qua công cụ tìm kiếm; trường `verification`/`metadataFetchError` ghi rõ. Ảnh có thể thay đổi hoặc hết hạn theo website gốc.

## Đăng nhập

Đặt mật khẩu chung cho **tài khoản mới trong bộ mẫu** bằng cấu hình `RegionalDemo:Password` (ít nhất 12 ký tự). Mật khẩu không nằm trong Git. Chạy lại seeder không reset mật khẩu tài khoản đang có.

| Vai trò | Ví dụ email |
|---|---|
| Admin | `admin@regional-demo.tripops.test` |
| Agency | `agency.da-nang@regional-demo.tripops.test` |
| Provider khách sạn | `provider.hotel.da-nang@regional-demo.tripops.test` |
| Provider ăn uống | `provider.dining.da-nang@regional-demo.tripops.test` |
| Provider trải nghiệm/xe | `provider.local.da-nang@regional-demo.tripops.test` |
| HDV | `guide.1.da-nang@regional-demo.tripops.test` |
| Customer | `customer.1.da-nang@regional-demo.tripops.test` |

Thay `da-nang` bằng mã tỉnh viết thường, đổi `_` thành `-`, ví dụ `thanh-hoa`, `hue`, `tp-hcm`, `an-giang`. HDV đánh số 1–2, Customer 1–3. Danh sách đầy đủ được xuất sau khi chạy seed vào `regional-demo-2026.accounts.csv`.

## Chạy lại và kiểm tra

Sao lưu database trước khi chạy; áp dụng migration còn thiếu. Seeder chèn trong một transaction, bỏ qua tài khoản/tour/booking đã có theo khóa bộ mẫu và từ chối ghi đè khi vai trò/trạng thái/chủ sở hữu đã bị thay đổi. Chạy lại không reset tiến độ hay mật khẩu.

Từ thư mục gốc, sau khi dừng tiến trình BE đang khóa file build:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:RegionalDemo__Password = Read-Host 'Mật khẩu cho tài khoản regional demo mới'
$regionalManifest = (Resolve-Path backend/scripts/data/regional-demo-2026.json).Path
$regionalReport = Join-Path (Get-Location).Path 'tmp/regional-demo-result.json'
dotnet run --project backend/src/TripOps.Api -- --SeedRegionalDemo=true "--RegionalDemo:Manifest=$regionalManifest" "--RegionalDemo:Report=$regionalReport"
```

Nên truyền đường dẫn tuyệt đối cho `RegionalDemo:Manifest` và `RegionalDemo:Report` nếu chạy từ thư mục khác. Có thể build ra thư mục riêng rồi chạy `TripOps.Api.dll` với `--contentRoot` trỏ đến thư mục API để không khóa server đang chạy.

Kiểm tra chỉ đọc trên SQL Server:

```powershell
sqlcmd -S '.\SQLEXPRESS' -d TripOps -E -b -f 65001 -i backend/scripts/verify-regional-demo.sql
```

`prepare-regional-demo.py` chỉ thu thập lại metadata web, không chèn database. Manifest đã commit là đầu vào cố định; không cần truy cập mạng khi seed. Script chuẩn bị cần Python, `requests`, `beautifulsoup4`.
