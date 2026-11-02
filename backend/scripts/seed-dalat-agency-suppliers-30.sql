-- Da Lat Agency directory: 15 hotels + 15 restaurants.
-- Researched 2026-11-02. Sources: dalat-agency-suppliers-30.sources.md.
-- Public directory data, not proof of an Agency contract or a confirmed quotation.
-- reference_price contains explicitly fictional test prices, NOT official quotations.
-- Units: VND/person/night (HOTEL), VND/person/meal (RESTAURANT).
-- Re-running preserves existing and ARCHIVED entries, without creating duplicates.
-- Run from repository root:
-- sqlcmd -S '.\SQLEXPRESS' -E -C -b -f 65001 -d TripOps -i backend/scripts/seed-dalat-agency-suppliers-30.sql

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @AgencyEmail nvarchar(191) = N'agency@tripops.test';
DECLARE @AgencyId nvarchar(36);
IF (SELECT COUNT(*) FROM dbo.users WHERE email = @AgencyEmail AND role = N'TravelAgency') <> 1
    THROW 51000, 'Expected exactly one Agency matching the configured email.', 1;
SELECT @AgencyId = id FROM dbo.users WHERE email = @AgencyEmail AND role = N'TravelAgency';

DECLARE @Seed TABLE (
    sequence_no int NOT NULL PRIMARY KEY,
    supplier_type nvarchar(20) NOT NULL,
    name nvarchar(255) NOT NULL,
    address nvarchar(500) NOT NULL,
    contact_phone nvarchar(30) NOT NULL,
    contact_email nvarchar(191) NULL,
    star_rating int NULL,
    source_url nvarchar(1000) NOT NULL,
    UNIQUE (supplier_type, name)
);
INSERT INTO @Seed (sequence_no, supplier_type, name, address, contact_phone, contact_email, star_rating, source_url)
VALUES
(1, N'HOTEL', N'Dalat Palace Heritage', N'02 Trần Phú, Đà Lạt, Lâm Đồng', N'02633825444', N'palace.reservations@royaldl.com', NULL, N'https://www.dalatpalacehotel.com/en/reservation-2/'),
(2, N'HOTEL', N'Hôtel Colline Đà Lạt', N'10 Phan Bội Châu, Đà Lạt, Lâm Đồng', N'02633665588', N'info@hotelcolline.com', 4, N'https://hotelcolline.com/contact-colline'),
(3, N'HOTEL', N'Du Parc Hotel Dalat', N'15 Trần Phú, Đà Lạt, Lâm Đồng', N'02633825777', NULL, NULL, N'https://vietnamtourism.vn/en/index.php/tourism/items/1415'),
(4, N'HOTEL', N'La Sapinette Hotel Dalat', N'01 Phan Chu Trinh, Đà Lạt, Lâm Đồng', N'02633550979', N'rsvn@lasapinette.com', NULL, N'https://lasapinette.com/en/chinh-sach-bao-mat/'),
(5, N'HOTEL', N'LADALAT Hotel', N'106A Mai Anh Đào, Đà Lạt, Lâm Đồng', N'02633565252', N'info@ladalathotel.com.vn', 5, N'https://ladalathotel.com.vn/vi'),
(6, N'HOTEL', N'Sammy Dalat Hotel', N'01 Lê Hồng Phong, Đà Lạt, Lâm Đồng', N'02633545454', NULL, 4, N'https://vietnamtourism.vn/en/index.php/tourism/items/1415'),
(7, N'HOTEL', N'Khách sạn Sài Gòn - Đà Lạt', N'02 Hoàng Văn Thụ, Đà Lạt, Lâm Đồng', N'02633556789', NULL, NULL, N'https://vietnamtourism.vn/en/index.php/tourism/items/1415'),
(8, N'HOTEL', N'TTC Hotel - Ngọc Lan', N'42 Nguyễn Chí Thanh, Đà Lạt, Lâm Đồng', N'02633838838', NULL, NULL, N'https://ttchospitality.vn/gioi-thieu'),
(9, N'HOTEL', N'TTC Hotel - Đà Lạt', N'04 Nguyễn Thị Minh Khai, Đà Lạt, Lâm Đồng', N'02633826042', N'sales.dalat@ttchotels.com', NULL, N'https://csdl.vietnamtourism.gov.vn/cslt/?item=2960'),
(10, N'HOTEL', N'Mường Thanh Holiday Đà Lạt', N'42 Phan Bội Châu, Đà Lạt, Lâm Đồng', N'02633578888', N'salesgroup@dalat.muongthanh.vn', NULL, N'https://booking.muongthanh.com/dieu-khoan-chung-c2'),
(11, N'HOTEL', N'MerPerle Dalat Hotel', N'01 Hùng Vương, Đà Lạt, Lâm Đồng', N'02633553789', N'sales@merperle.vn', NULL, N'https://merperledalat.vn/dat-phong/'),
(12, N'HOTEL', N'Bàn Là Boutique Hotel', N'47 Nguyễn Đình Chiểu, Đà Lạt, Lâm Đồng', N'02633633777', N'sales@banlaboutiquehotel.com', NULL, N'https://dalat.vn/vi/banlahotel'),
(13, N'HOTEL', N'VF Hotel Dalat', N'Lô F2, khu quy hoạch Hoàng Diệu, Đà Lạt, Lâm Đồng', N'02633515179', NULL, NULL, N'https://dalat.vn/vi/vfhotel'),
(14, N'HOTEL', N'TAMY Hotel Dalat', N'56 Phan Như Thạch, Đà Lạt, Lâm Đồng', N'02633826989', NULL, NULL, N'https://dalat.vn/vi/tamyhoteldalat'),
(15, N'HOTEL', N'Vanila Hotel Đà Lạt', N'01 bis Nhà Chung, Đà Lạt, Lâm Đồng', N'02633586999', NULL, NULL, N'https://dalat.vn/vi/vanilahotel'),
(16, N'RESTAURANT', N'Nhà hàng Memory Đà Lạt', N'24B Hùng Vương (số mới: 24/7 Hùng Vương), Đà Lạt, Lâm Đồng', N'0898931155', NULL, NULL, N'https://nhahangdalat.info/do-uong-huong-vi-da-lat/'),
(17, N'RESTAURANT', N'Nhà hàng Brick House Đà Lạt', N'50 Pasteur, Đà Lạt, Lâm Đồng', N'02633540789', N'info@brickhousedalat.com', NULL, N'https://brickhousedalat.com/contact/'),
(18, N'RESTAURANT', N'Léguda - Buffet Rau Đà Lạt', N'Lầu 1, nhà ga Cáp treo Đà Lạt, đồi Robin, Đà Lạt, Lâm Đồng', N'0981166088', N'info@dalattourist.com.vn', NULL, N'https://dalat.vn/vi/leguda'),
(19, N'RESTAURANT', N'Cơm Niêu Như Ngọc', N'01/18 Hồ Tùng Mậu, Đà Lạt, Lâm Đồng', N'02633833777', N'info@comnieunhungoc.com', NULL, N'https://comnieunhungoc.com/vn/contact-us'),
(20, N'RESTAURANT', N'Nhà hàng Đà Lạt House', N'34 Nguyễn Du, Đà Lạt, Lâm Đồng', N'02633811577', N'dalathouserestaurant@gmail.com', NULL, N'https://dalat.vn/vi/nhahangdalathouse'),
(21, N'RESTAURANT', N'Nhà hàng 21 Hồ Xuân Hương', N'Đường Trần Quốc Toản, Đà Lạt, Lâm Đồng', N'0918313331', N'nhahang21hoxuanhuong@gmail.com', NULL, N'https://dalat.vn/vi/nhahanghaimothoxuanhuong'),
(22, N'RESTAURANT', N'Nhà hàng Nhật Ly', N'88 Phan Đình Phùng, Đà Lạt, Lâm Đồng', N'02633821651', N'nhahangnhatly@gmail.com', NULL, N'https://dalat.vn/vi/nhahangnhatly'),
(23, N'RESTAURANT', N'Nhà hàng Kim Gia - Quang Trung', N'65/1 Quang Trung, Đà Lạt, Lâm Đồng', N'0903100107', N'nhahangkimgia@gmail.com', NULL, N'https://dalat.vn/vi/nhahangkimgia'),
(24, N'RESTAURANT', N'Nhà hàng Phố Núi', N'44 - 46 Nguyễn Chí Thanh, Đà Lạt, Lâm Đồng', N'02633778899', N'nhahangphonui@gmail.com', NULL, N'https://dalat.vn/vi/nhahangphonui'),
(25, N'RESTAURANT', N'Nhà hàng Món Ngon Đà Lạt', N'Khu phức hợp Cinestar, cạnh TTTM Big C (GO!), đường Hồ Tùng Mậu, Đà Lạt, Lâm Đồng', N'02633969999', N'monngondalat@gmail.com', NULL, N'https://dalat.vn/vi/nhahangmonngondalat'),
(26, N'RESTAURANT', N'Nhà hàng Tổng Liên đoàn Lao động Đà Lạt', N'01 Yersin (Thống Nhất cũ), Đà Lạt, Lâm Đồng', N'02633822173', N'nhakhachtongliendoandalat@gmail.com', NULL, N'https://dalat.vn/vi/nhahangtongliendoanlaodongdalat'),
(27, N'RESTAURANT', N'Nhà hàng Hùng Nhất Ly 2', N'95 Trạng Trình, Đà Lạt, Lâm Đồng', N'0984858939', N'hungnhatly2@gmail.com', NULL, N'https://dalat.vn/vi/nhahanghungnhatly2'),
(28, N'RESTAURANT', N'Nhà hàng Nam Sơn', N'54 khu Hòa Bình, Đà Lạt, Lâm Đồng', N'02633821147', N'nhahangnamsondalat@gmail.com', NULL, N'https://dalat.vn/vi/nhahangnamson'),
(29, N'RESTAURANT', N'Nhà hàng Phúc An', N'266B Mai Anh Đào, Đà Lạt, Lâm Đồng', N'0913560506', N'nhahangphucandalat@gmail.com', NULL, N'https://dalat.vn/vi/nhahangphucan'),
(30, N'RESTAURANT', N'Nhà hàng Mùa Thu - Korea Restaurant', N'276 Bùi Thị Xuân, Đà Lạt, Lâm Đồng', N'02633521888', N'muathuhotel@gmail.com', NULL, N'https://dalat.vn/vi/nhahangmuathu');

IF (SELECT COUNT(*) FROM @Seed WHERE supplier_type = N'HOTEL') <> 15
    OR (SELECT COUNT(*) FROM @Seed WHERE supplier_type = N'RESTAURANT') <> 15
    THROW 51001, 'Seed must contain exactly 15 hotels and 15 restaurants.', 1;

DECLARE @Inserted TABLE (id int, supplier_type nvarchar(20));
DECLARE @PriceUpdated TABLE (id int, supplier_type nvarchar(20));
DECLARE @DemoPrices TABLE (
    sequence_no int NOT NULL PRIMARY KEY,
    reference_price decimal(12,2) NOT NULL CHECK (reference_price > 0)
);
INSERT INTO @DemoPrices (sequence_no, reference_price) VALUES
(1, 1800000), (2, 650000), (3, 450000), (4, 600000), (5, 750000),
(6, 450000), (7, 550000), (8, 600000), (9, 400000), (10, 500000),
(11, 950000), (12, 450000), (13, 250000), (14, 300000), (15, 200000),
(16, 250000), (17, 220000), (18, 150000), (19, 180000), (20, 200000),
(21, 280000), (22, 160000), (23, 220000), (24, 200000), (25, 180000),
(26, 200000), (27, 180000), (28, 150000), (29, 170000), (30, 190000);
IF (SELECT COUNT(*) FROM @DemoPrices) <> 30
    OR EXISTS (SELECT 1 FROM @Seed s WHERE NOT EXISTS (SELECT 1 FROM @DemoPrices p WHERE p.sequence_no=s.sequence_no))
    THROW 51003, 'Every seed entry must have a positive test price.', 1;

BEGIN TRY
    BEGIN TRANSACTION;
    INSERT INTO dbo.agency_suppliers (
        agency_id, supplier_type, name, address, area, contact_name, contact_phone,
        contact_email, star_rating, reference_price, conditions, notes, status, created_at, updated_at
    )
    OUTPUT inserted.id, inserted.supplier_type INTO @Inserted
    SELECT @AgencyId, s.supplier_type, s.name, s.address, N'Lâm Đồng',
        CASE WHEN s.supplier_type = N'HOTEL' THEN N'Đặt phòng / Lễ tân' ELSE N'Đặt bàn' END,
        s.contact_phone, s.contact_email, s.star_rating, p.reference_price,
        CASE WHEN s.supplier_type = N'HOTEL'
            THEN N'Lưu ý của Agency: cần xác nhận loại phòng, số khách/phòng, giá theo người/đêm, bữa sáng và điều kiện hủy với cơ sở.'
            ELSE N'Lưu ý của Agency: cần xác nhận thực đơn, giá theo người/bữa, số chỗ, suất ăn đặc biệt và điều kiện hủy với cơ sở.' END,
        CONCAT(N'[DALAT_AGENCY_30_20261102] [GIÁ MẪU KIỂM THỬ] Giá giả lập để test, không phải báo giá của cơ sở. Đơn vị: ',
            CASE WHEN s.supplier_type=N'HOTEL' THEN N'VNĐ/người/đêm.' ELSE N'VNĐ/người/bữa.' END,
            N' Thông tin liên hệ tra cứu ngày 02/11/2026, chưa xác nhận quan hệ hợp tác. Nguồn: ', s.source_url),
        N'ACTIVE', SYSUTCDATETIME(), SYSUTCDATETIME()
    FROM @Seed s INNER JOIN @DemoPrices p ON p.sequence_no=s.sequence_no
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.agency_suppliers a WITH (UPDLOCK, HOLDLOCK)
        WHERE a.agency_id = @AgencyId AND a.supplier_type = s.supplier_type AND a.name = s.name
    );

    -- Fill only missing prices in this seed batch. Preserve manual prices and archived entries.
    UPDATE a
    SET reference_price=p.reference_price,
        notes=CONCAT(a.notes, N' [GIÁ MẪU KIỂM THỬ] Giá giả lập để test, không phải báo giá của cơ sở. Đơn vị: ',
            CASE WHEN a.supplier_type=N'HOTEL' THEN N'VNĐ/người/đêm.' ELSE N'VNĐ/người/bữa.' END),
        updated_at=SYSUTCDATETIME()
    OUTPUT inserted.id, inserted.supplier_type INTO @PriceUpdated
    FROM dbo.agency_suppliers a
    INNER JOIN @Seed s ON s.supplier_type=a.supplier_type AND s.name=a.name
    INNER JOIN @DemoPrices p ON p.sequence_no=s.sequence_no
    WHERE a.agency_id=@AgencyId AND a.status=N'ACTIVE' AND a.reference_price IS NULL
        AND a.notes LIKE N'%[[]DALAT_AGENCY_30_20261102]%';

    IF (SELECT COUNT(*) FROM @Seed s WHERE EXISTS (
        SELECT 1 FROM dbo.agency_suppliers a
        WHERE a.agency_id = @AgencyId AND a.supplier_type = s.supplier_type AND a.name = s.name
    )) <> 30
        THROW 51002, 'Seed verification failed; rolling back.', 1;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT COUNT(*) AS inserted_rows FROM @Inserted;
SELECT COUNT(*) AS price_updated_rows FROM @PriceUpdated;
SELECT supplier_type, COUNT(*) AS inserted_rows FROM @Inserted GROUP BY supplier_type;
SELECT supplier_type, status, COUNT(*) AS directory_rows
FROM dbo.agency_suppliers WHERE agency_id = @AgencyId
GROUP BY supplier_type, status ORDER BY supplier_type, status;

