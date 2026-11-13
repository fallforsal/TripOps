/*
  TripOps – Khôi phục hồ sơ doanh nghiệp (Agency/Provider) về trạng thái TRƯỚC khi sửa thử.
  KHÔNG restore đè database TripOps, KHÔNG xóa dữ liệu khác: chỉ sửa đúng 1 hồ sơ theo email.

  Cách chạy: mở trong SSMS, sửa biến ở PHẦN 0, chạy TỪNG PHẦN (bôi đen phần đó rồi F5).
*/

------------------------------------------------------------------------------------------
-- PHẦN 0. SỬA 2 BIẾN NÀY (phải khai báo lại ở đầu mỗi phần nếu chạy từng phần riêng)
------------------------------------------------------------------------------------------
DECLARE @Email      nvarchar(191) = N'agency@tripops.test';                       -- ← email tài khoản vừa sửa hồ sơ
DECLARE @BackupFile nvarchar(400) = N'D:\backup\TripOps_truoc_bank_profile.bak';  -- ← file backup có hồ sơ cũ (nếu có)

------------------------------------------------------------------------------------------
-- PHẦN 1. XEM HIỆN TRẠNG (chỉ đọc)
------------------------------------------------------------------------------------------
SELECT u.email, u.name, u.phone, bp.id AS profile_id, bp.business_name, bp.tax_code, bp.business_address,
       bp.status, bp.rejection_reason, bp.approved_at, bp.updated_at
FROM business_profiles bp JOIN users u ON u.id = bp.user_id
WHERE u.email = @Email;

------------------------------------------------------------------------------------------
-- PHẦN 2 (CÁCH A – không cần file backup): CHỈ DUYỆT LẠI, GIỮ THÔNG TIN ĐANG CÓ
--   Dùng khi thông tin mới sửa vẫn đúng, chỉ cần hồ sơ hoạt động lại.
------------------------------------------------------------------------------------------
BEGIN TRANSACTION;
UPDATE bp
SET status = N'Approved', rejection_reason = NULL,
    approved_at = COALESCE(bp.approved_at, SYSUTCDATETIME()), updated_at = SYSUTCDATETIME()
FROM business_profiles bp JOIN users u ON u.id = bp.user_id
WHERE u.email = @Email;
SELECT @@ROWCOUNT AS so_dong_da_sua;   -- phải = 1; khác 1 thì chạy ROLLBACK
COMMIT;  -- hoặc ROLLBACK;

------------------------------------------------------------------------------------------
-- PHẦN 3 (CÁCH B – có file backup): LẤY LẠI ĐÚNG THÔNG TIN CŨ
-- 3a. Restore file backup thành MỘT DATABASE KHÁC tên TripOps_Restore (database chính không bị đụng tới)
------------------------------------------------------------------------------------------
DECLARE @files TABLE (LogicalName nvarchar(128), PhysicalName nvarchar(260), [Type] char(1), FileGroupName nvarchar(128) NULL,
    Size numeric(20,0), MaxSize numeric(20,0), FileId bigint, CreateLSN numeric(25,0), DropLSN numeric(25,0) NULL,
    UniqueId uniqueidentifier, ReadOnlyLSN numeric(25,0) NULL, ReadWriteLSN numeric(25,0) NULL, BackupSizeInBytes bigint,
    SourceBlockSize int, FileGroupId int, LogGroupGUID uniqueidentifier NULL, DifferentialBaseLSN numeric(25,0) NULL,
    DifferentialBaseGUID uniqueidentifier NULL, IsReadOnly bit, IsPresent bit, TDEThumbprint varbinary(32) NULL, SnapshotUrl nvarchar(360) NULL);
INSERT INTO @files EXEC (N'RESTORE FILELISTONLY FROM DISK = N''' + @BackupFile + N'''');
DECLARE @dir nvarchar(400) = CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(400));
DECLARE @move nvarchar(max) = N'';
SELECT @move += N', MOVE N''' + LogicalName + N''' TO N''' + @dir + N'TripOps_Restore_' + CAST(FileId AS nvarchar(10))
               + CASE [Type] WHEN 'L' THEN N'.ldf' ELSE N'.mdf' END + N''''
FROM @files;
DECLARE @sql nvarchar(max) = N'RESTORE DATABASE TripOps_Restore FROM DISK = N''' + @BackupFile + N''' WITH RECOVERY' + @move;
PRINT @sql;
EXEC (@sql);

-- 3b. So sánh cũ (backup) và hiện tại
SELECT 'CU (backup)' AS ban, u.name, u.phone, o.business_name, o.tax_code, o.business_address, o.description, o.status
FROM TripOps_Restore.dbo.business_profiles o JOIN TripOps_Restore.dbo.users u ON u.id = o.user_id WHERE u.email = @Email
UNION ALL
SELECT 'HIEN TAI', u.name, u.phone, bp.business_name, bp.tax_code, bp.business_address, bp.description, bp.status
FROM business_profiles bp JOIN users u ON u.id = bp.user_id WHERE u.email = @Email;

-- 3c. Chép thông tin cũ về (chỉ hồ sơ doanh nghiệp + tên/SĐT người đại diện; GIỮ NGUYÊN STK nhận tiền hiện tại)
BEGIN TRANSACTION;
UPDATE bp
SET business_name = o.business_name, tax_code = o.tax_code, business_address = o.business_address,
    business_license_url = o.business_license_url, description = o.description, LogoUrl = o.LogoUrl,
    status = o.status, rejection_reason = o.rejection_reason, approved_at = o.approved_at, updated_at = SYSUTCDATETIME()
FROM business_profiles bp
JOIN users u ON u.id = bp.user_id
JOIN TripOps_Restore.dbo.business_profiles o ON o.user_id = bp.user_id
WHERE u.email = @Email;
SELECT @@ROWCOUNT AS ho_so_da_sua;     -- phải = 1

UPDATE u
SET name = o.name, phone = o.phone, updated_at = SYSUTCDATETIME()
FROM users u JOIN TripOps_Restore.dbo.users o ON o.id = u.id
WHERE u.email = @Email;
SELECT @@ROWCOUNT AS tai_khoan_da_sua; -- phải = 1
COMMIT;  -- kiểm tra 2 số trên = 1 rồi mới COMMIT; sai thì ROLLBACK;

-- 3d. Xong thì xóa database tạm (database chính TripOps không bị ảnh hưởng)
-- DROP DATABASE TripOps_Restore;
