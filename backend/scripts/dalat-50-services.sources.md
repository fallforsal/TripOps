# Bộ 50 dịch vụ demo Đà Lạt

Tra cứu ngày 01/11/2026: **22 lưu trú, 22 ẩm thực, 3 phương tiện, 3 điểm tham quan**. Script `seed-dalat-50-services.sql` thêm 50 bài vào Provider `provider@tripops.test`; thay email trong script nếu dùng tài khoản khác. Provider cần hoạt động và hồ sơ đã duyệt.

Tên, vị trí và mô tả ngắn được tham khảo từ các nguồn dưới đây. Đây là dữ liệu thử nghiệm, **không thể hiện quan hệ hợp tác hay quyền sở hữu của Provider demo đối với cơ sở thật**. Một số nguồn còn sử dụng địa chỉ/phường cũ; giữ số nhà/tên đường, để `ward = NULL` khi chưa xác minh được tên phường hiện hành. Riêng Langbiang sử dụng tên phường do website đơn vị quản lý công bố. Tình trạng hoạt động cần xác nhận lại trực tiếp.

**Toàn bộ giá và sức chứa là giá trị giả lập để test**, được ghi chú trong `description` và `policies`. Giá tính theo phòng/đêm (lưu trú), người/bữa (ẩm thực), xe/ngày (phương tiện), người/lượt (tham quan). Sức chứa lưu trú là số phòng mẫu, phương tiện là số chỗ theo loại xe, còn lại là số khách mẫu. Không dùng các số liệu này để báo giá thực tế. Giờ mở cửa chỉ điền khi nguồn có công bố; vẫn cần xác nhận lại. Chưa xác minh tọa độ, xếp hạng sao và điểm đánh giá nên để NULL; không tự tạo tiện ích.

`thumbnail_url` và toàn bộ JSON `images` được clone nguyên vẹn từ dịch vụ đầu tiên có ảnh của Provider (máy nguồn: ID 4). Ảnh không minh họa đúng từng cơ sở; người dùng sẽ thay sau. Các URL dùng chung tài sản Cloudinary hiện có, không upload bản sao. Script không ghi đè bài cũ; chạy lại bỏ qua bài trùng theo Provider + tên + danh mục.

## Chạy

Sau khi chạy migrations và có ít nhất một dịch vụ của Provider chứa thumbnail/gallery JSON:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -C -b -f 65001 -d TripOps -i backend/scripts/seed-dalat-50-services.sql
```

Không cần migration mới cho việc thêm dữ liệu này. File `seed-services.sql` bên cạnh là bộ 5 dịch vụ cũ, độc lập với bộ 50 bài bổ sung.

## Nguồn cho từng bài

| STT | Loại | Dịch vụ | Vị trí tham khảo | Nguồn |
| --- | --- | --- | --- | --- |
| 1 | Lưu trú | Dalat Palace Heritage | 02 Trần Phú | [Nguồn](https://www.dalatpalacehotel.com/gioithieu/) |
| 2 | Lưu trú | Dalat Du Parc | 07 Trần Phú | [Nguồn](https://dalat.vn/en/dalatduparc) |
| 3 | Lưu trú | Ana Mandara Villas Dalat Resort & Spa | 10 Lê Lai | [Nguồn](https://www.anamandara-resort.com/wp-content/uploads/sites/233/2025/11/MICE-BROCHURE.pdf) |
| 4 | Lưu trú | Dalat Edensee Lake Resort & Spa | Khu du lịch hồ Tuyền Lâm | [Nguồn](https://dalat.vn/vi/dalatedenseelake) |
| 5 | Lưu trú | Terracotta Hotel & Resort Dalat | Phân khu 7.9, Khu du lịch hồ Tuyền Lâm | [Nguồn](https://dalat.vn/vi/terracotta) |
| 6 | Lưu trú | Dalat Wonder Resort | 19 Hoa Hồng, hồ Tuyền Lâm | [Nguồn](https://dalatwonder.chiic-digital.website/) |
| 7 | Lưu trú | Swiss-Belresort Tuyền Lâm | Khu 7 và 8, Khu du lịch hồ Tuyền Lâm | [Nguồn](https://www.swiss-belhotel.com/hotels/Swiss-Belresort-Tuyen-Lam-Dalat) |
| 8 | Lưu trú | Grand Mercure Dalat | 03 Nguyễn Du | [Nguồn](https://all.accor.com/hotel/B8H0/index.en.shtml) |
| 9 | Lưu trú | MerPerle Dalat Hotel | 01 Hùng Vương | [Nguồn](https://www.merperle.vn/en/privacy) |
| 10 | Lưu trú | Hôtel Colline | 10 Phan Bội Châu | [Nguồn](https://hotelcolline.com/vi/colline-da-lat) |
| 11 | Lưu trú | TTC Hotel - Ngọc Lan | 42 Nguyễn Chí Thanh | [Nguồn](https://dalat.vn/vi/ttcngoclan) |
| 12 | Lưu trú | TTC Hotel - Đà Lạt | 04 Nguyễn Thị Minh Khai | [Nguồn](https://dalat.vn/en/khachsanttcpremi) |
| 13 | Lưu trú | Kings Hotel Dalat | 10 Bùi Thị Xuân | [Nguồn](https://nestahotel.com.vn/en/blog/bui-thi-xuan-street-hotel-da-lat/) |
| 14 | Lưu trú | Nesta Valley Dalat Hotel | 94 Bùi Thị Xuân | [Nguồn](https://nestahotel.com.vn/en/blog/golf-valley-hotel-rebranded/) |
| 15 | Lưu trú | La Sapinette Hotel Dalat | 01 Phan Chu Trinh | [Nguồn](https://lasapinette.com/en/lien-he/) |
| 16 | Lưu trú | LADALAT Hotel | 106A Mai Anh Đào | [Nguồn](https://dalat.vn/vi/ksladalat) |
| 17 | Lưu trú | Sammy Dalat Hotel | 01 Lê Hồng Phong | [Nguồn](https://dalat.vn/vi/sammyhotel) |
| 18 | Lưu trú | Mường Thanh Holiday Đà Lạt | 42 Phan Bội Châu | [Nguồn](https://muongthanh.com/tin-tuc-ve-muong-thanh/dia-chi-cac-khach-san-muong-thanh-n433.html) |
| 19 | Lưu trú | Thanh Thủy - Triệu Việt Vương | 03 Triệu Việt Vương | [Nguồn](https://dalat.vn/vi/thanhthuyhotel) |
| 20 | Lưu trú | The K'Rin Villa Hotel | Lô B48-50 Đinh Tiên Hoàng, khu biệt thự Golf Valley | [Nguồn](https://dalat.vn/vi/thekrinvillahotel) |
| 21 | Lưu trú | Dalat Park Hotel | 38/12 Trần Phú | [Nguồn](https://dalat.vn/vi/dalatpark) |
| 22 | Lưu trú | Thanh Thủy Hotel - Bùi Thị Xuân | 186 Bùi Thị Xuân | [Nguồn](https://dalat.vn/vi/thanhthuykhachsan) |
| 23 | Ẩm thực | Memory Đà Lạt | 24B Hùng Vương | [Nguồn](https://nhahangdalat.info/) |
| 24 | Ẩm thực | Dalat View Restaurant | 49 Khe Sanh | [Nguồn](https://dalatview.com/) |
| 25 | Ẩm thực | Nhà hàng Brick House Đà Lạt | 50 Pasteur | [Nguồn](https://brickhousedalat.com/nha-hang/) |
| 26 | Ẩm thực | Tasty Đà Lạt | Chợ Đà Lạt, Nguyễn Thị Minh Khai | [Nguồn](https://tastydalat.com.vn/) |
| 27 | Ẩm thực | Léguda - Buffet Rau Đà Lạt | Lầu 1 nhà ga cáp treo, đồi Robin | [Nguồn](https://visitlamdong.vn/vi/leguda) |
| 28 | Ẩm thực | Khu ẩm thực Hôtel Colline | 10 Phan Bội Châu | [Nguồn](https://dalat.vn/vi/khuamthuchotelcolline) |
| 29 | Ẩm thực | Nhà hàng Tâm Châu Đà Lạt | 02 Trần Nhân Tông | [Nguồn](https://dalat.vn/vi/nhahangtamchaudalat) |
| 30 | Ẩm thực | Nhà hàng Đà Lạt House | 34 Nguyễn Du | [Nguồn](https://dalat.vn/vi/nhahangdalathouse) |
| 31 | Ẩm thực | Nhà hàng Món Ngon Đà Lạt | Khu trung tâm thương mại Big C, Hồ Tùng Mậu | [Nguồn](https://dalat.vn/vi/nhahangmonngondalat) |
| 32 | Ẩm thực | Nhà hàng Tổng Liên đoàn Lao động Đà Lạt | 01 Yersin | [Nguồn](https://dalat.vn/vi/nhahangtongliendoanlaodongdalat) |
| 33 | Ẩm thực | Lẩu nướng Cung Đình Đà Lạt | 15 Hoàng Diệu | [Nguồn](https://dalat.vn/vi/nhahanglaunuongcungdinh) |
| 34 | Ẩm thực | Nhà hàng Tomato Đà Lạt | 22 Sương Nguyệt Ánh | [Nguồn](https://dalat.vn/vi/nhahangtomotodalat) |
| 35 | Ẩm thực | Nhà hàng Dã Quỳ | 49 Trương Công Định | [Nguồn](https://dalat.vn/vi/nhahangdaquy) |
| 36 | Ẩm thực | Nhà hàng Sơn Phát | 01 Trần Quốc Toản | [Nguồn](https://dalat.vn/vi/nhahangsonphat) |
| 37 | Ẩm thực | Nhà hàng Nhật Ly | 88 Phan Đình Phùng | [Nguồn](https://dalat.vn/vi/nhahangnhatly) |
| 38 | Ẩm thực | Nhà hàng Phố Núi | 44-46 Nguyễn Chí Thanh | [Nguồn](https://dalat.vn/vi/nhahangphonui) |
| 39 | Ẩm thực | Le Rabelais - Dalat Palace | 02 Trần Phú | [Nguồn](https://dalat.vn/vi/nhahanglerabelais) |
| 40 | Ẩm thực | Cơm niêu Như Ngọc | 19 Hồ Tùng Mậu | [Nguồn](https://dalat.vn/vi/comnieunhungoc) |
| 41 | Ẩm thực | Cơm niêu Hương Việt | 41 Sương Nguyệt Ánh | [Nguồn](https://dalat.vn/vi/comnieuhuongviet) |
| 42 | Ẩm thực | Nhà hàng Thanh Thủy | 02 Trần Quốc Toản | [Nguồn](https://dalat.vn/vi/nhahangthanhthuy) |
| 43 | Ẩm thực | TORII - Nhà hàng hấp thủy nhiệt | 114 Tô Hiến Thành | [Nguồn](https://dalat.vn/vi/hapthuynhiet/bookingres) |
| 44 | Ẩm thực | Nhà hàng Datanla | Khu du lịch thác Datanla, đèo Prenn | [Nguồn](https://dalat.vn/vi/datanlarestaurant) |
| 45 | Phương tiện | Dalat Trip - Thuê xe du lịch 7 chỗ | Văn phòng: 60/10 Nguyễn Trung Trực | [Nguồn](https://www.dalattrip.com/dulich/dich-vu-cho-thue-xe/) |
| 46 | Phương tiện | Dalat Trip - Thuê xe du lịch 16 chỗ | Văn phòng: 60/10 Nguyễn Trung Trực | [Nguồn](https://www.dalattrip.com/dulich/dich-vu-cho-thue-xe/) |
| 47 | Phương tiện | Dalat Trip - Thuê xe du lịch 29 chỗ | Văn phòng: 60/10 Nguyễn Trung Trực | [Nguồn](https://www.dalattrip.com/dulich/dich-vu-cho-thue-xe/) |
| 48 | Tham quan | Thác Datanla | Đèo Prenn | [Nguồn](https://dalat.vn/vi/thacdatanla) |
| 49 | Tham quan | Khu du lịch Langbiang | 305 Langbiang, phường Lang Biang - Đà Lạt | [Nguồn](https://dalattourist.com.vn/diem-den/khu-du-lich-langbiang) |
| 50 | Tham quan | Thung Lũng Tình Yêu | 07 Mai Anh Đào | [Nguồn](https://dalat.vn/vi/thunglungtinhyeu) |
