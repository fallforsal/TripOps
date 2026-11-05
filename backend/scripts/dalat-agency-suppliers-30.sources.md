# Danh bạ 30 nhà cung cấp Đà Lạt cho Agency

Tra cứu ngày **02/11/2026**: 15 khách sạn và 15 nhà hàng. Dùng cho Agency `agency@tripops.test` (TripOps Travel), có thể thay `@AgencyEmail` trong script cho máy khác.

Script: [seed-dalat-agency-suppliers-30.sql](seed-dalat-agency-suppliers-30.sql).

- Tên, địa chỉ và số điện thoại lấy từ website cơ sở/đơn vị quản lý, cơ sở dữ liệu ngành du lịch hoặc cổng du lịch Đà Lạt. Một số trang không mở trực tiếp được; dữ liệu được đối chiếu qua kết quả tìm kiếm đã lập chỉ mục.
- Chỉ giữ số nhà/tên đường/khu vực Đà Lạt; không suy đoán tên phường sau sắp xếp hành chính. `area = Lâm Đồng`. Memory công bố cả số 24B cũ và 24/7 mới; giữ cả hai.
- Du Parc: cổng Đà Lạt có bản ghi số 7 Trần Phú; bộ này dùng **15 Trần Phú**, đối chiếu cơ sở dữ liệu Tổng cục Du lịch và Travelfish.
- `reference_price` là **giá mẫu giả lập do người dùng yêu cầu để kiểm thử**, không lấy từ các nguồn bên dưới và không phải báo giá của cơ sở. Khách sạn dùng VNĐ/người/đêm (200.000–1.800.000); nhà hàng dùng VNĐ/người/bữa (150.000–280.000). Mỗi mục có nhãn `[GIÁ MẪU KIỂM THỬ]` trong ghi chú. Cần thay bằng báo giá xác nhận khi sử dụng thực tế; không quy đổi tự động giá phòng thành giá người.
- `contact_name` là nhãn đầu mối chung (“Đặt phòng / Lễ tân” hoặc “Đặt bàn”), không phải tên nhân viên đã xác nhận. Không liên hệ trực tiếp các cơ sở trong quá trình nhập.
- Chỉ lưu email khi nguồn công khai có địa chỉ liên hệ phù hợp; bỏ qua email tự sinh dạng `@dalatcity.org`. Chỉ điền sao khi nguồn đã đọc nêu rõ: Colline 4, LADALAT 5, Sammy 4; các mục khác để NULL.
- `conditions` là lưu ý cần xác nhận của Agency, không phải chính sách do cơ sở cam kết. Đây là danh bạ tham khảo, không xác nhận các cơ sở là đối tác của TripOps Travel.
- `status = ACTIVE` để chọn trong danh bạ. Cần gọi xác nhận tình trạng cung cấp trước khi dùng thực tế.
- Script có transaction và chống trùng theo Agency + loại + tên. Chạy lại chỉ bổ sung giá còn NULL cho mục ACTIVE mang mã bộ dữ liệu này; giữ giá đã có, mục ARCHIVED và các dữ liệu khác. Không cần migration.

Chạy từ thư mục gốc:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -C -b -f 65001 -d TripOps -i backend/scripts/seed-dalat-agency-suppliers-30.sql
```

| STT | Loại | Cơ sở | Địa chỉ tham khảo | Điện thoại công khai | Nguồn |
| --- | --- | --- | --- | --- | --- |
| 1 | Khách sạn | Dalat Palace Heritage | 02 Trần Phú, Đà Lạt, Lâm Đồng | 02633825444 | [Nguồn](https://www.dalatpalacehotel.com/en/reservation-2/) |
| 2 | Khách sạn | Hôtel Colline Đà Lạt | 10 Phan Bội Châu, Đà Lạt, Lâm Đồng | 02633665588 | [Nguồn](https://hotelcolline.com/contact-colline) · [Đối chiếu](https://hotelcolline.com/colline-dalat-featured-on-vnexpress-a-panoramic-stay-in-the-heart-of-dalat) |
| 3 | Khách sạn | Du Parc Hotel Dalat | 15 Trần Phú, Đà Lạt, Lâm Đồng | 02633825777 | [Nguồn](https://vietnamtourism.vn/en/index.php/tourism/items/1415) · [Đối chiếu](https://www.travelfish.org/accommodation_profile/vietnam/central_highlands/lam_dong/da_lat/all/3112) |
| 4 | Khách sạn | La Sapinette Hotel Dalat | 01 Phan Chu Trinh, Đà Lạt, Lâm Đồng | 02633550979 | [Nguồn](https://lasapinette.com/en/chinh-sach-bao-mat/) |
| 5 | Khách sạn | LADALAT Hotel | 106A Mai Anh Đào, Đà Lạt, Lâm Đồng | 02633565252 | [Nguồn](https://ladalathotel.com.vn/vi) |
| 6 | Khách sạn | Sammy Dalat Hotel | 01 Lê Hồng Phong, Đà Lạt, Lâm Đồng | 02633545454 | [Nguồn](https://vietnamtourism.vn/en/index.php/tourism/items/1415) · [Đối chiếu](https://dalat.vn/vi/sammydalat) |
| 7 | Khách sạn | Khách sạn Sài Gòn - Đà Lạt | 02 Hoàng Văn Thụ, Đà Lạt, Lâm Đồng | 02633556789 | [Nguồn](https://vietnamtourism.vn/en/index.php/tourism/items/1415) |
| 8 | Khách sạn | TTC Hotel - Ngọc Lan | 42 Nguyễn Chí Thanh, Đà Lạt, Lâm Đồng | 02633838838 | [Nguồn](https://ttchospitality.vn/gioi-thieu) |
| 9 | Khách sạn | TTC Hotel - Đà Lạt | 04 Nguyễn Thị Minh Khai, Đà Lạt, Lâm Đồng | 02633826042 | [Nguồn](https://csdl.vietnamtourism.gov.vn/cslt/?item=2960) |
| 10 | Khách sạn | Mường Thanh Holiday Đà Lạt | 42 Phan Bội Châu, Đà Lạt, Lâm Đồng | 02633578888 | [Nguồn](https://booking.muongthanh.com/dieu-khoan-chung-c2) · [Đối chiếu](https://muongthanh.com/tin-tuc-ve-muong-thanh/goi-qua-cua-yeu-thuong-tai-muong-thanh-holiday-da-lat-n785.html) |
| 11 | Khách sạn | MerPerle Dalat Hotel | 01 Hùng Vương, Đà Lạt, Lâm Đồng | 02633553789 | [Nguồn](https://merperledalat.vn/dat-phong/) |
| 12 | Khách sạn | Bàn Là Boutique Hotel | 47 Nguyễn Đình Chiểu, Đà Lạt, Lâm Đồng | 02633633777 | [Nguồn](https://dalat.vn/vi/banlahotel) |
| 13 | Khách sạn | VF Hotel Dalat | Lô F2, khu quy hoạch Hoàng Diệu, Đà Lạt, Lâm Đồng | 02633515179 | [Nguồn](https://dalat.vn/vi/vfhotel) |
| 14 | Khách sạn | TAMY Hotel Dalat | 56 Phan Như Thạch, Đà Lạt, Lâm Đồng | 02633826989 | [Nguồn](https://dalat.vn/vi/tamyhoteldalat) |
| 15 | Khách sạn | Vanila Hotel Đà Lạt | 01 bis Nhà Chung, Đà Lạt, Lâm Đồng | 02633586999 | [Nguồn](https://dalat.vn/vi/vanilahotel) |
| 16 | Nhà hàng | Nhà hàng Memory Đà Lạt | 24B Hùng Vương (số mới: 24/7 Hùng Vương), Đà Lạt, Lâm Đồng | 0898931155 | [Nguồn](https://nhahangdalat.info/do-uong-huong-vi-da-lat/) |
| 17 | Nhà hàng | Nhà hàng Brick House Đà Lạt | 50 Pasteur, Đà Lạt, Lâm Đồng | 02633540789 | [Nguồn](https://brickhousedalat.com/contact/) |
| 18 | Nhà hàng | Léguda - Buffet Rau Đà Lạt | Lầu 1, nhà ga Cáp treo Đà Lạt, đồi Robin, Đà Lạt, Lâm Đồng | 0981166088 | [Nguồn](https://dalat.vn/vi/leguda) |
| 19 | Nhà hàng | Cơm Niêu Như Ngọc | 01/18 Hồ Tùng Mậu, Đà Lạt, Lâm Đồng | 02633833777 | [Nguồn](https://comnieunhungoc.com/vn/contact-us) |
| 20 | Nhà hàng | Nhà hàng Đà Lạt House | 34 Nguyễn Du, Đà Lạt, Lâm Đồng | 02633811577 | [Nguồn](https://dalat.vn/vi/nhahangdalathouse) |
| 21 | Nhà hàng | Nhà hàng 21 Hồ Xuân Hương | Đường Trần Quốc Toản, Đà Lạt, Lâm Đồng | 0918313331 | [Nguồn](https://dalat.vn/vi/nhahanghaimothoxuanhuong) |
| 22 | Nhà hàng | Nhà hàng Nhật Ly | 88 Phan Đình Phùng, Đà Lạt, Lâm Đồng | 02633821651 | [Nguồn](https://dalat.vn/vi/nhahangnhatly) |
| 23 | Nhà hàng | Nhà hàng Kim Gia - Quang Trung | 65/1 Quang Trung, Đà Lạt, Lâm Đồng | 0903100107 | [Nguồn](https://dalat.vn/vi/nhahangkimgia) |
| 24 | Nhà hàng | Nhà hàng Phố Núi | 44 - 46 Nguyễn Chí Thanh, Đà Lạt, Lâm Đồng | 02633778899 | [Nguồn](https://dalat.vn/vi/nhahangphonui) |
| 25 | Nhà hàng | Nhà hàng Món Ngon Đà Lạt | Khu phức hợp Cinestar, cạnh TTTM Big C (GO!), đường Hồ Tùng Mậu, Đà Lạt, Lâm Đồng | 02633969999 | [Nguồn](https://dalat.vn/vi/nhahangmonngondalat) |
| 26 | Nhà hàng | Nhà hàng Tổng Liên đoàn Lao động Đà Lạt | 01 Yersin (Thống Nhất cũ), Đà Lạt, Lâm Đồng | 02633822173 | [Nguồn](https://dalat.vn/vi/nhahangtongliendoanlaodongdalat) |
| 27 | Nhà hàng | Nhà hàng Hùng Nhất Ly 2 | 95 Trạng Trình, Đà Lạt, Lâm Đồng | 0984858939 | [Nguồn](https://dalat.vn/vi/nhahanghungnhatly2) |
| 28 | Nhà hàng | Nhà hàng Nam Sơn | 54 khu Hòa Bình, Đà Lạt, Lâm Đồng | 02633821147 | [Nguồn](https://dalat.vn/vi/nhahangnamson) |
| 29 | Nhà hàng | Nhà hàng Phúc An | 266B Mai Anh Đào, Đà Lạt, Lâm Đồng | 0913560506 | [Nguồn](https://dalat.vn/vi/nhahangphucan) |
| 30 | Nhà hàng | Nhà hàng Mùa Thu - Korea Restaurant | 276 Bùi Thị Xuân, Đà Lạt, Lâm Đồng | 02633521888 | [Nguồn](https://dalat.vn/vi/nhahangmuathu) |

