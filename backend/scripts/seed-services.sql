-- TripOps: seed dữ liệu services hiện có để chia sẻ trong team.
-- Bộ dữ liệu: 5 dịch vụ. Chạy migrations trước khi chạy file này.
-- SSMS: chọn database TripOps của bạn rồi Execute toàn bộ file.
-- Chỉ INSERT bài chưa có; không UPDATE/DELETE dữ liệu hiện có.
-- ID dịch vụ tự sinh trên máy đích; không dùng IDENTITY_INSERT.
-- Provider được tìm theo email, không dùng GUID từ máy xuất dữ liệu.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.services', N'U') IS NULL
    THROW 51000, N'Chưa có bảng services. Hãy chạy dotnet ef database update trước.', 1;
IF COL_LENGTH(N'dbo.services', N'is_paused') IS NULL OR COL_LENGTH(N'dbo.services', N'sub_category') IS NULL
    THROW 51000, N'Database thiếu migration AddServiceMetadata/AddServiceAvailability.', 1;

-- Đổi email dưới đây nếu máy của bạn dùng tài khoản Provider khác.
DECLARE @ProviderEmail1 nvarchar(191) = N'provider@tripops.test';

DECLARE @Seed TABLE (
    [source_id] int NOT NULL PRIMARY KEY,
    [provider_email] nvarchar(191) NOT NULL,
    [category] nvarchar(50) NOT NULL,
    [name] nvarchar(255) NOT NULL,
    [description] nvarchar(max) NULL,
    [price] decimal(12,2) NOT NULL,
    [price_from] decimal(12,2) NULL,
    [price_to] decimal(12,2) NULL,
    [capacity] int NULL,
    [star_rating] int NULL,
    [amenities] nvarchar(max) NULL,
    [policies] nvarchar(max) NULL,
    [province] nvarchar(100) NOT NULL,
    [ward] nvarchar(100) NULL,
    [street] nvarchar(255) NULL,
    [latitude] decimal(10,8) NULL,
    [longitude] decimal(11,8) NULL,
    [thumbnail_url] nvarchar(max) NOT NULL,
    [images] nvarchar(max) NULL,
    [rating] decimal(3,2) NULL,
    [status] nvarchar(30) NULL,
    [rejection_reason] nvarchar(max) NULL,
    [created_at] datetime2(7) NULL,
    [updated_at] datetime2(7) NULL,
    [full_address] nvarchar(500) NULL,
    [hidden_reason] nvarchar(max) NULL,
    [operating_hours] nvarchar(100) NULL,
    [sub_category] nvarchar(100) NULL,
    [is_paused] bit NOT NULL
);

INSERT INTO @Seed (
    [source_id], [provider_email],
    [category], [name], [description], [price], [price_from], [price_to], [capacity], [star_rating], [amenities], [policies], [province], [ward], [street], [latitude], [longitude], [thumbnail_url], [images], [rating], [status], [rejection_reason], [created_at], [updated_at], [full_address], [hidden_reason], [operating_hours], [sub_category], [is_paused]
) VALUES
(4,
 @ProviderEmail1,
 N'Hotel',
 N'Khách sạn mẫu Đà Lạt',
 N'Dịch vụ lưu trú đối tác, báo giá đoàn khi có booking.',
 600000.00,
 500000.00,
 800000.00,
 0,
 4,
 NULL,
 NULL,
 N'Lâm Đồng',
 NULL,
 N'Trung tâm Đà Lạt',
 NULL,
 NULL,
 N'https://res.cloudinary.com/xqpmwcin/image/upload/v1793548503/Thiet-ke-khach-san-5-sao-tan-co-dien-phap-dep-kata-81065-04.jpg',
 N'["https://res.cloudinary.com/xqpmwcin/image/upload/v1793548018/tripops/services/de422b1a-9801-41a1-9142-5aea5eb62ead/869e67f1baf44f2facb47817a5245ebd.jpg"]',
 5.00,
 N'Approved',
 NULL,
 CONVERT(datetime2(7), N'2026-11-01T10:26:49.9465341', 126),
 CONVERT(datetime2(7), N'2026-11-01T10:26:50.0477662', 126),
 NULL,
 NULL,
 NULL,
 NULL,
 0),
(5,
 @ProviderEmail1,
 N'Hotel',
 N'Mac Valley DaLat Hotel',
 CAST(N'' AS nvarchar(max)) + N'Mac Valley DaLat Hotel ở Đà Lạt cung cấp chỗ nghỉ 3 sao có khu vườn, sân hiên và quầy bar. Chỗ nghỉ này cung cấp dịch vụ phòng và quầy lễ tân 24 giờ cho khách.' + NCHAR(10) + NCHAR(10) + N'Phòng khách được trang bị tủ lạnh, minibar, ấm đun nước, vòi sen, máy sấy tóc và bàn làm việc. Với phòng tắm riêng được trang bị vòi xịt/chậu rửa vệ sinh và đồ vệ sinh cá nhân miễn phí, các phòng tại khách sạn cũng có Wi-Fi miễn phí, trong đó một số phòng có view thành phố. Tại Mac Valley DaLat Hotel, mỗi phòng đều được thiết kế có ga trải giường và khăn tắm.' + NCHAR(10) + NCHAR(10) + N'Sân bay Liên Khương cách 26 km.',
 400000.00,
 400000.00,
 600000.00,
 45,
 3,
 N'["Wifi t\u1ED1c \u0111\u1ED9 cao mi\u1EC5n ph\u00ED","\u0110i\u1EC1u h\u00F2a 2 chi\u1EC1u","Smart TV 50 inch","B\u1ED3n t\u1EAFm n\u1EB1m cao c\u1EA5p","Ban c\u00F4ng ng\u1EAFm c\u1EA3nh ri\u00EAng","Thang m\u00E1y"]',
 N'["Nh\u1EADn ph\u00F2ng (Check-in) t\u1EEB 14:00 - Tr\u1EA3 ph\u00F2ng (Check-out) tr\u01B0\u1EDBc 12:00","Mi\u1EC5n ph\u00ED ph\u00F2ng ng\u1EE7 \u0026 buffet s\u00E1ng FOC cho HDV/Tr\u01B0\u1EDFng \u0111o\u00E0n (t\u1EF7 l\u1EC7 15 kh\u00E1ch tr\u1EA3 ph\u00ED/1 su\u1EA5t)","Mi\u1EC5n ph\u00ED cho t\u1ED1i \u0111a 01 tr\u1EBB em d\u01B0\u1EDBi 6 tu\u1ED5i ng\u1EE7 chung gi\u01B0\u1EDDng v\u1EDBi b\u1ED1 m\u1EB9","H\u1ED7 tr\u1EE3 nh\u1EADn ph\u00F2ng s\u1EDBm n\u1EBFu ph\u00F2ng \u0111\u00E3 s\u1EB5n s\u00E0ng v\u00E0 h\u1ED7 tr\u1EE3 g\u1EEDi h\u00E0nh l\u00FD mi\u1EC5n ph\u00ED","Ph\u1EE5 thu th\u00EAm ng\u01B0\u1EDDi (Extra bed): 250.000\u0111/\u0111\u00EAm bao g\u1ED3m b\u1EEFa s\u00E1ng"]',
 N'Lâm Đồng',
 N'Phường 3',
 N'57 An Bình',
 11.93371300,
 108.45943500,
 N'https://res.cloudinary.com/xqpmwcin/image/upload/v1793548019/tripops/services/de422b1a-9801-41a1-9142-5aea5eb62ead/64aebdf95e7b4a009561412148ab4314.jpg',
 N'["https://res.cloudinary.com/xqpmwcin/image/upload/v1793548018/tripops/services/de422b1a-9801-41a1-9142-5aea5eb62ead/869e67f1baf44f2facb47817a5245ebd.jpg"]',
 0.00,
 N'Approved',
 NULL,
 CONVERT(datetime2(7), N'2026-11-01T13:30:37.2769643', 126),
 CONVERT(datetime2(7), N'2026-11-01T13:31:20.6351234', 126),
 N'57 An Bình, Phường 3, Lâm Đồng',
 NULL,
 N'Nhận phòng: 14:00 - Trả phòng: 12:00',
 N'Khách sạn (Hotel)',
 0),
(6,
 @ProviderEmail1,
 N'Hotel',
 N'Khách Sạn Heritage Đà Lạt111111',
 CAST(N'' AS nvarchar(max)) + N'Mac Valley DaLat Hotel ở Đà Lạt cung cấp chỗ nghỉ 3 sao có khu vườn, sân hiên và quầy bar. Chỗ nghỉ này cung cấp dịch vụ phòng và quầy lễ tân 24 giờ cho khách.' + NCHAR(10) + NCHAR(10) + N'Phòng khách được trang bị tủ lạnh, minibar, ấm đun nước, vòi sen, máy sấy tóc và bàn làm việc. Với phòng tắm riêng được trang bị vòi xịt/chậu rửa vệ sinh và đồ vệ sinh cá nhân miễn phí, các phòng tại khách sạn cũng có Wi-Fi miễn phí, trong đó một số phòng có view thành phố. Tại Mac Valley DaLat Hotel, mỗi phòng đều được thiết kế có ga trải giường và khăn tắm.' + NCHAR(10) + NCHAR(10) + N'Sân bay Liên Khương cách 26 km.',
 600000.00,
 600000.00,
 950000.00,
 45,
 3,
 N'["Wifi t\u1ED1c \u0111\u1ED9 cao mi\u1EC5n ph\u00ED"]',
 N'["Mi\u1EC5n ph\u00ED h\u1EE7y ho\u1EB7c gi\u1EA3m s\u1ED1 l\u01B0\u1EE3ng ph\u00F2ng tr\u01B0\u1EDBc 7 ng\u00E0y"]',
 N'Lâm Đồng',
 N'Phường 3',
 N'02 Trần Phú',
 11.94051800,
 108.44816900,
 N'https://res.cloudinary.com/xqpmwcin/image/upload/v1793548502/Tieu-chuan-thiet-ke-khach-san-dep-1.jpg',
 N'["https://res.cloudinary.com/xqpmwcin/image/upload/v1793548018/tripops/services/de422b1a-9801-41a1-9142-5aea5eb62ead/869e67f1baf44f2facb47817a5245ebd.jpg"]',
 0.00,
 N'Approved',
 NULL,
 CONVERT(datetime2(7), N'2026-11-01T13:34:19.6340250', 126),
 CONVERT(datetime2(7), N'2026-11-01T15:19:47.6972694', 126),
 N'02 Trần Phú, Phường 3, Lâm Đồng',
 NULL,
 N'Nhận phòng: 14:00 - Trả phòng: 12:00',
 N'Khách sạn (Hotel)',
 0),
(7,
 @ProviderEmail1,
 N'Fnb',
 N'Khách Sạn Heritage Đà Lạt22222',
 N'Phòng khách được trang bị tủ lạnh, minibar, ấm đun nước, vòi sen, máy sấy tóc và bàn làm việc. Với phòng tắm riêng được trang bị vòi xịt/chậu rửa vệ sinh và đồ vệ sinh cá nhân miễn phí, các phòng tại khách sạn cũng có Wi-Fi miễn phí, trong đó một số phòng có view thành phố. Tại Mac Valley DaLat Hotel, mỗi phòng đều được thiết kế có ga trải giường và khăn tắm.',
 500000.00,
 500000.00,
 1000000.00,
 50,
 NULL,
 N'["Wifi t\u1ED1c \u0111\u1ED9 cao mi\u1EC5n ph\u00ED","\u0110i\u1EC1u h\u00F2a 2 chi\u1EC1u","Smart TV 50 inch","B\u1ED3n t\u1EAFm n\u1EB1m cao c\u1EA5p"]',
 N'["Nh\u1EADn ph\u00F2ng (Check-in) t\u1EEB 14:00 - Tr\u1EA3 ph\u00F2ng (Check-out) tr\u01B0\u1EDBc 12:00","Mi\u1EC5n ph\u00ED ph\u00F2ng ng\u1EE7 \u0026 buffet s\u00E1ng FOC cho HDV/Tr\u01B0\u1EDFng \u0111o\u00E0n (t\u1EF7 l\u1EC7 15 kh\u00E1ch tr\u1EA3 ph\u00ED/1 su\u1EA5t)","Mi\u1EC5n ph\u00ED cho t\u1ED1i \u0111a 01 tr\u1EBB em d\u01B0\u1EDBi 6 tu\u1ED5i ng\u1EE7 chung gi\u01B0\u1EDDng v\u1EDBi b\u1ED1 m\u1EB9","H\u1ED7 tr\u1EE3 nh\u1EADn ph\u00F2ng s\u1EDBm n\u1EBFu ph\u00F2ng \u0111\u00E3 s\u1EB5n s\u00E0ng v\u00E0 h\u1ED7 tr\u1EE3 g\u1EEDi h\u00E0nh l\u00FD mi\u1EC5n ph\u00ED"]',
 N'Lâm Đồng',
 N'Phường 3',
 N'20 Nguyễn trường tộ',
 11.53667000,
 107.78622000,
 N'https://res.cloudinary.com/xqpmwcin/image/upload/v1793548502/images.jpg',
 N'["https://res.cloudinary.com/xqpmwcin/image/upload/v1793548018/tripops/services/de422b1a-9801-41a1-9142-5aea5eb62ead/869e67f1baf44f2facb47817a5245ebd.jpg"]',
 0.00,
 N'Approved',
 NULL,
 CONVERT(datetime2(7), N'2026-11-01T14:02:05.7110357', 126),
 CONVERT(datetime2(7), N'2026-11-01T15:56:01.6209922', 126),
 N'20 Nguyễn trường tộ, Phường 3, Lâm Đồng',
 NULL,
 N'Nhận Phòng 14:00 - Trả phòng 12:00',
 N'Khách sạn (Hotel)',
 0),
(9,
 @ProviderEmail1,
 N'Fnb',
 N'Nhà hàng 5 sao VIP',
 N'Nhà hàng 5 sao VIPNhà hàng 5 sao VIPNhà hàng 5 sao VIP',
 200000.00,
 200000.00,
 400000.00,
 40,
 NULL,
 N'["B\u00E3i \u0111\u1ED7 xe 45 ch\u1ED7 r\u1ED9ng r\u00E3i","C\u00F3 ph\u00F2ng VIP m\u00E1y l\u1EA1nh ri\u00EAng cho \u0111o\u00E0n","C\u00F3 s\u00E2n kh\u1EA5u \u0026 \u00C2m thanh Gala"]',
 N'["Set menu \u0111o\u00E0n 6 - 8 m\u00F3n ti\u00EAu chu\u1EA9n, \u0111\u1ECBnh l\u01B0\u1EE3ng \u0111\u1EA7y \u0111\u1EE7 cho 6-8 kh\u00E1ch/b\u00E0n","H\u1ED7 tr\u1EE3 \u0111\u1ED5i m\u00F3n chay ho\u1EB7c chu\u1EA9n b\u1ECB th\u1EF1c \u0111\u01A1n d\u1ECB \u1EE9ng/\u0103n ki\u00EAng khi b\u00E1o tr\u01B0\u1EDBc 12h","Linh ho\u1EA1t gi\u1EEF b\u00E0n t\u1ED1i \u0111a 45 ph\u00FAt khi \u0111o\u00E0n g\u1EB7p s\u1EF1 c\u1ED1 giao th\u00F4ng tr\u00EAn \u0111\u01B0\u1EDDng di chuy\u1EC3n"]',
 N'Lâm Đồng',
 N'Phường 1',
 N'20 Đinh tiên hoàng',
 11.55648800,
 107.80928700,
 N'https://res.cloudinary.com/xqpmwcin/image/upload/v1793548340/tripops/services/de422b1a-9801-41a1-9142-5aea5eb62ead/d12076f6639743ebb5802699ea663ea5.jpg',
 N'["https://res.cloudinary.com/xqpmwcin/image/upload/v1793548019/tripops/services/de422b1a-9801-41a1-9142-5aea5eb62ead/64aebdf95e7b4a009561412148ab4314.jpg","https://res.cloudinary.com/xqpmwcin/image/upload/v1793548018/tripops/services/de422b1a-9801-41a1-9142-5aea5eb62ead/869e67f1baf44f2facb47817a5245ebd.jpg"]',
 0.00,
 N'Approved',
 NULL,
 CONVERT(datetime2(7), N'2026-11-01T15:46:59.7743714', 126),
 CONVERT(datetime2(7), N'2026-11-01T15:52:35.9662383', 126),
 N'20 Đinh tiên hoàng, Phường 1, Lâm Đồng',
 NULL,
 N'07:30 - 22:30',
 N'Nhà hàng phục vụ đoàn tour lữ hành',
 0);

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM @Seed seed
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.users provider
            JOIN dbo.business_profiles profile ON profile.user_id = provider.id
            WHERE provider.email = seed.provider_email AND provider.role = N'Provider'
              AND provider.status = N'Active' AND profile.status = N'Approved'
        )
    )
        THROW 51001, N'Cần có tài khoản Provider hoạt động và hồ sơ doanh nghiệp đã duyệt theo email ở đầu file. Hãy tạo/duyệt tài khoản hoặc sửa email trước khi chạy lại.', 1;

    INSERT INTO [dbo].[services] (
        [provider_id], [category], [name], [description], [price], [price_from], [price_to], [capacity], [star_rating], [amenities], [policies], [province], [ward], [street], [latitude], [longitude], [thumbnail_url], [images], [rating], [status], [rejection_reason], [created_at], [updated_at], [full_address], [hidden_reason], [operating_hours], [sub_category], [is_paused]
    )
    SELECT provider.id, seed.[category], seed.[name], seed.[description], seed.[price], seed.[price_from], seed.[price_to], seed.[capacity], seed.[star_rating], seed.[amenities], seed.[policies], seed.[province], seed.[ward], seed.[street], seed.[latitude], seed.[longitude], seed.[thumbnail_url], seed.[images], seed.[rating], seed.[status], seed.[rejection_reason], seed.[created_at], seed.[updated_at], seed.[full_address], seed.[hidden_reason], seed.[operating_hours], seed.[sub_category], seed.[is_paused]
    FROM @Seed seed
    JOIN dbo.users provider ON provider.email = seed.provider_email
    WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[services] existing WITH (UPDLOCK, HOLDLOCK)
        WHERE existing.provider_id = provider.id
          AND existing.name = seed.name
          AND existing.category = seed.category
    );

    DECLARE @Inserted int = @@ROWCOUNT;
    COMMIT TRANSACTION;
    SELECT @Inserted AS inserted_count, (SELECT COUNT(*) FROM @Seed) - @Inserted AS skipped_existing_count;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
