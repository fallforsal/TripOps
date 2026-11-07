BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106025645_FixTourPendingChanges'
)
BEGIN
    ALTER TABLE [business_profiles] ADD [LogoUrl] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106025645_FixTourPendingChanges'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261106025645_FixTourPendingChanges', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106092443_AddUserBanFields'
)
BEGIN
    ALTER TABLE [users] ADD [BanReason] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106092443_AddUserBanFields'
)
BEGIN
    ALTER TABLE [users] ADD [BannedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106092443_AddUserBanFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261106092443_AddUserBanFields', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_versions] ADD [NumberOfGuests] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_versions] ADD [SharedToCustomer] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [AgreedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [AgreedTourId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [AgreedTourVersion] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [Revision] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [SourceSnapshotJson] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [SourceTourId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [payment_requests] ADD [QuotationId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [bookings] ADD [AcceptedQuotationId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD [AvailabilityConfirmed] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD [AvailableQuantity] decimal(19,2) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD [HoldUntil] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD [PriceConfirmed] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD [ReplyDeadline] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD [ResponseHistoryJson] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_quotations] ADD [NumberOfGuests] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_quotations] ADD [PaymentPolicy] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_quotations] ADD [PlanSnapshotJson] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    ALTER TABLE [booking_quotations] ADD [ValidUntil] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    CREATE TABLE [WorkflowNotifications] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(36) NOT NULL,
        [Message] nvarchar(1000) NOT NULL,
        [RequestId] int NULL,
        [BookingId] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReadAt] datetime2 NULL,
        CONSTRAINT [PK_WorkflowNotifications] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    CREATE INDEX [IX_WorkflowNotifications_UserId_CreatedAt] ON [WorkflowNotifications] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106183411_UnifiedDesignWorkflow'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261106183411_UnifiedDesignWorkflow', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [WorkflowNotifications] DROP CONSTRAINT [PK_WorkflowNotifications];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    EXEC sp_rename N'[WorkflowNotifications]', N'workflow_notifications', 'OBJECT';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    EXEC sp_rename N'[workflow_notifications].[IX_WorkflowNotifications_UserId_CreatedAt]', N'IX_workflow_notifications_UserId_CreatedAt', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [tourist_locations] ADD [CostUnit] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [tourist_locations] ADD [Quantity] decimal(19,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [tourist_locations] ADD [ServiceId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [tourist_locations] ADD [UnitCost] decimal(19,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [services] ADD [PriceUnit] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[booking_supplier_requests]') AND [c].[name] = N'service_date_to');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [booking_supplier_requests] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [booking_supplier_requests] ALTER COLUMN [service_date_to] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[booking_supplier_requests]') AND [c].[name] = N'service_date_from');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [booking_supplier_requests] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [booking_supplier_requests] ALTER COLUMN [service_date_from] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [booking_locations] ADD [CostUnit] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [booking_locations] ADD [Quantity] decimal(19,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [booking_locations] ADD [ServiceId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [booking_locations] ADD [UnitCost] decimal(19,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    ALTER TABLE [workflow_notifications] ADD CONSTRAINT [PK_workflow_notifications] PRIMARY KEY ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205811_DesignServiceCosting'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261106205811_DesignServiceCosting', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205933_InitialDesignChanges'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [InitialChangesJson] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205933_InitialDesignChanges'
)
BEGIN
    UPDATE booking_supplier_requests SET ResponseHistoryJson = '[]' WHERE ResponseHistoryJson = ''
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205933_InitialDesignChanges'
)
BEGIN
    UPDATE booking_quotations SET PlanSnapshotJson = '{}' WHERE PlanSnapshotJson = ''
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205933_InitialDesignChanges'
)
BEGIN
    UPDATE v SET SharedToCustomer = 1, NumberOfGuests = r.number_of_participants
                    FROM tour_versions v JOIN tours t ON t.id = v.tour_id
                    JOIN tour_design_requests r ON r.id = t.design_request_id
                    WHERE t.is_request = 1 AND ISJSON(v.tour_snapshot) = 1
                    AND JSON_VALUE(CASE WHEN ISJSON(v.tour_snapshot) = 1 THEN v.tour_snapshot ELSE '{}' END, '$.status') = 'completed'
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106205933_InitialDesignChanges'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261106205933_InitialDesignChanges', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107073904_RestoreTextOnlyAttractions'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tourist_locations]') AND [c].[name] = N'CostUnit');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [tourist_locations] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [tourist_locations] DROP COLUMN [CostUnit];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107073904_RestoreTextOnlyAttractions'
)
BEGIN
    DECLARE @var3 nvarchar(max);
    SELECT @var3 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tourist_locations]') AND [c].[name] = N'Quantity');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [tourist_locations] DROP CONSTRAINT ' + @var3 + ';');
    ALTER TABLE [tourist_locations] DROP COLUMN [Quantity];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107073904_RestoreTextOnlyAttractions'
)
BEGIN
    DECLARE @var4 nvarchar(max);
    SELECT @var4 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tourist_locations]') AND [c].[name] = N'ServiceId');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [tourist_locations] DROP CONSTRAINT ' + @var4 + ';');
    ALTER TABLE [tourist_locations] DROP COLUMN [ServiceId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107073904_RestoreTextOnlyAttractions'
)
BEGIN
    DECLARE @var5 nvarchar(max);
    SELECT @var5 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tourist_locations]') AND [c].[name] = N'UnitCost');
    IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [tourist_locations] DROP CONSTRAINT ' + @var5 + ';');
    ALTER TABLE [tourist_locations] DROP COLUMN [UnitCost];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107073904_RestoreTextOnlyAttractions'
)
BEGIN
    DECLARE @var6 nvarchar(max);
    SELECT @var6 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[booking_locations]') AND [c].[name] = N'CostUnit');
    IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [booking_locations] DROP CONSTRAINT ' + @var6 + ';');
    ALTER TABLE [booking_locations] DROP COLUMN [CostUnit];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107073904_RestoreTextOnlyAttractions'
)
BEGIN
    DECLARE @var7 nvarchar(max);
    SELECT @var7 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[booking_locations]') AND [c].[name] = N'Quantity');
    IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [booking_locations] DROP CONSTRAINT ' + @var7 + ';');
    ALTER TABLE [booking_locations] DROP COLUMN [Quantity];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107073904_RestoreTextOnlyAttractions'
)
BEGIN
    DECLARE @var8 nvarchar(max);
    SELECT @var8 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[booking_locations]') AND [c].[name] = N'ServiceId');
    IF @var8 IS NOT NULL EXEC(N'ALTER TABLE [booking_locations] DROP CONSTRAINT ' + @var8 + ';');
    ALTER TABLE [booking_locations] DROP COLUMN [ServiceId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107073904_RestoreTextOnlyAttractions'
)
BEGIN
    DECLARE @var9 nvarchar(max);
    SELECT @var9 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[booking_locations]') AND [c].[name] = N'UnitCost');
    IF @var9 IS NOT NULL EXEC(N'ALTER TABLE [booking_locations] DROP CONSTRAINT ' + @var9 + ';');
    ALTER TABLE [booking_locations] DROP COLUMN [UnitCost];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107073904_RestoreTextOnlyAttractions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261107073904_RestoreTextOnlyAttractions', N'10.0.10');
END;

COMMIT;
GO

