IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [subscription_plans] (
        [id] int NOT NULL IDENTITY,
        [name] nvarchar(100) NOT NULL,
        [slug] nvarchar(50) NOT NULL,
        [description] nvarchar(max) NULL,
        [price_monthly] decimal(12,2) NOT NULL,
        [price_yearly] decimal(12,2) NULL,
        [is_popular] bit NULL DEFAULT CAST(0 AS bit),
        [sort_order] int NULL DEFAULT 0,
        [status] nvarchar(20) NULL DEFAULT N'active',
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_subscription_plans] PRIMARY KEY ([id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [users] (
        [id] nvarchar(36) NOT NULL,
        [name] nvarchar(150) NOT NULL,
        [email] nvarchar(191) NOT NULL,
        [phone] nvarchar(30) NULL,
        [password_hash] nvarchar(255) NULL,
        [role] nvarchar(50) NOT NULL DEFAULT N'User',
        [avatar] nvarchar(500) NULL,
        [is_verified] bit NOT NULL DEFAULT CAST(1 AS bit),
        [agency_id] nvarchar(36) NULL,
        [status] nvarchar(30) NOT NULL DEFAULT N'Active',
        [created_at] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_users] PRIMARY KEY ([id]),
        CONSTRAINT [FK_users_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [agency_subscriptions] (
        [id] int NOT NULL IDENTITY,
        [agency_id] nvarchar(36) NOT NULL,
        [plan_id] int NOT NULL,
        [billing_cycle] nvarchar(20) NOT NULL DEFAULT N'monthly',
        [price] decimal(12,2) NOT NULL,
        [start_date] date NOT NULL,
        [end_date] date NOT NULL,
        [status] nvarchar(30) NOT NULL DEFAULT N'Active',
        [auto_renew] bit NULL DEFAULT CAST(1 AS bit),
        [cancelled_at] datetime2 NULL,
        [cancel_reason] nvarchar(max) NULL,
        [last_payment_date] datetime2 NULL,
        [next_payment_date] datetime2 NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_agency_subscriptions] PRIMARY KEY ([id]),
        CONSTRAINT [FK_agency_subscriptions_subscription_plans_plan_id] FOREIGN KEY ([plan_id]) REFERENCES [subscription_plans] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_agency_subscriptions_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [business_profiles] (
        [id] int NOT NULL IDENTITY,
        [user_id] nvarchar(36) NOT NULL,
        [business_name] nvarchar(255) NULL,
        [tax_code] nvarchar(50) NULL,
        [business_address] nvarchar(max) NULL,
        [business_license_url] nvarchar(max) NULL,
        [description] nvarchar(max) NULL,
        [status] nvarchar(50) NULL,
        [rejection_reason] nvarchar(max) NULL,
        [approved_at] datetime2 NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_business_profiles] PRIMARY KEY ([id]),
        CONSTRAINT [FK_business_profiles_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [chat_conversations] (
        [id] int NOT NULL IDENTITY,
        [user_one_id] nvarchar(36) NOT NULL,
        [user_two_id] nvarchar(36) NOT NULL,
        [last_message_content] nvarchar(max) NULL,
        [last_message_sender_id] nvarchar(36) NULL,
        [last_message_at] datetime2 NULL,
        [status] nvarchar(20) NOT NULL DEFAULT N'active',
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_chat_conversations] PRIMARY KEY ([id]),
        CONSTRAINT [FK_chat_conversations_users_last_message_sender_id] FOREIGN KEY ([last_message_sender_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_chat_conversations_users_user_one_id] FOREIGN KEY ([user_one_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_chat_conversations_users_user_two_id] FOREIGN KEY ([user_two_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [services] (
        [id] int NOT NULL IDENTITY,
        [provider_id] nvarchar(36) NOT NULL,
        [category] nvarchar(50) NOT NULL,
        [name] nvarchar(255) NOT NULL,
        [description] nvarchar(max) NULL,
        [price] decimal(12,2) NOT NULL DEFAULT 0.0,
        [price_from] decimal(12,2) NULL,
        [price_to] decimal(12,2) NULL,
        [capacity] int NULL DEFAULT 0,
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
        [rating] decimal(3,2) NULL DEFAULT 5.0,
        [status] nvarchar(30) NULL DEFAULT N'Pending',
        [rejection_reason] nvarchar(max) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_services] PRIMARY KEY ([id]),
        CONSTRAINT [FK_services_users_provider_id] FOREIGN KEY ([provider_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [system_bank_accounts] (
        [id] int NOT NULL IDENTITY,
        [bank_name] nvarchar(150) NOT NULL,
        [bank_code] nvarchar(30) NOT NULL,
        [account_number] nvarchar(50) NOT NULL,
        [account_holder] nvarchar(150) NOT NULL,
        [branch] nvarchar(150) NULL,
        [is_default] bit NULL DEFAULT CAST(1 AS bit),
        [status] nvarchar(20) NULL DEFAULT N'ACTIVE',
        [notes] nvarchar(max) NULL,
        [updated_by] nvarchar(36) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_system_bank_accounts] PRIMARY KEY ([id]),
        CONSTRAINT [FK_system_bank_accounts_users_updated_by] FOREIGN KEY ([updated_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [system_commission_configs] (
        [id] int NOT NULL IDENTITY,
        [commission_rate] decimal(5,2) NOT NULL,
        [note] nvarchar(max) NULL,
        [is_active] bit NULL DEFAULT CAST(1 AS bit),
        [applied_from] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [created_by] nvarchar(36) NOT NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_system_commission_configs] PRIMARY KEY ([id]),
        CONSTRAINT [FK_system_commission_configs_users_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [tour_design_requests] (
        [id] int NOT NULL IDENTITY,
        [user_id] nvarchar(36) NULL,
        [agency_id] nvarchar(36) NULL,
        [contact_name] nvarchar(150) NOT NULL,
        [contact_email] nvarchar(191) NOT NULL,
        [contact_phone] nvarchar(30) NOT NULL,
        [destination] nvarchar(255) NOT NULL,
        [departure_date] date NOT NULL,
        [return_date] date NULL,
        [number_of_participants] int NULL,
        [budget_per_person] decimal(12,2) NULL,
        [hotel_rating_requirement] nvarchar(50) NULL,
        [special_requirements] nvarchar(max) NULL,
        [status] nvarchar(50) NULL DEFAULT N'Pending',
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_tour_design_requests] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_design_requests_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_design_requests_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [subscription_payment_history] (
        [id] int NOT NULL IDENTITY,
        [subscription_id] int NOT NULL,
        [company_id] nvarchar(36) NOT NULL,
        [plan_id] int NOT NULL,
        [amount] decimal(12,2) NOT NULL,
        [payment_method] nvarchar(50) NOT NULL,
        [transaction_code] nvarchar(100) NULL,
        [status] nvarchar(30) NOT NULL DEFAULT N'PENDING',
        [billing_period_start] date NOT NULL,
        [billing_period_end] date NOT NULL,
        [paid_at] datetime2 NULL,
        [admin_note] nvarchar(max) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_subscription_payment_history] PRIMARY KEY ([id]),
        CONSTRAINT [FK_subscription_payment_history_agency_subscriptions_subscription_id] FOREIGN KEY ([subscription_id]) REFERENCES [agency_subscriptions] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_subscription_payment_history_subscription_plans_plan_id] FOREIGN KEY ([plan_id]) REFERENCES [subscription_plans] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_subscription_payment_history_users_company_id] FOREIGN KEY ([company_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [chat_messages] (
        [id] int NOT NULL IDENTITY,
        [conversation_id] int NOT NULL,
        [sender_id] nvarchar(36) NOT NULL,
        [content] nvarchar(max) NOT NULL,
        [content_type] nvarchar(20) NOT NULL DEFAULT N'text',
        [is_read] bit NULL DEFAULT CAST(0 AS bit),
        [read_at] datetime2 NULL,
        [reply_to_message_id] int NULL,
        [is_edited] bit NULL DEFAULT CAST(0 AS bit),
        [is_deleted] bit NULL DEFAULT CAST(0 AS bit),
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_chat_messages] PRIMARY KEY ([id]),
        CONSTRAINT [FK_chat_messages_chat_conversations_conversation_id] FOREIGN KEY ([conversation_id]) REFERENCES [chat_conversations] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_chat_messages_chat_messages_reply_to_message_id] FOREIGN KEY ([reply_to_message_id]) REFERENCES [chat_messages] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_chat_messages_users_sender_id] FOREIGN KEY ([sender_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [tour_design_request_agencies] (
        [id] int NOT NULL IDENTITY,
        [request_id] int NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [is_host] bit NULL DEFAULT CAST(0 AS bit),
        [stage_area] nvarchar(255) NULL,
        [suggested_budget] decimal(12,2) NULL,
        [communication_notes] nvarchar(max) NULL,
        [status] nvarchar(50) NULL DEFAULT N'PENDING',
        [assigned_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [responded_at] datetime2 NULL,
        CONSTRAINT [PK_tour_design_request_agencies] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_design_request_agencies_tour_design_requests_request_id] FOREIGN KEY ([request_id]) REFERENCES [tour_design_requests] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_design_request_agencies_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [tours] (
        [id] int NOT NULL IDENTITY,
        [agency_id] nvarchar(36) NOT NULL,
        [tour_code] nvarchar(50) NOT NULL,
        [name] nvarchar(255) NULL,
        [location] nvarchar(max) NULL,
        [departure_location] nvarchar(max) NULL,
        [duration_tour] nvarchar(max) NULL,
        [operation_period] nvarchar(255) NULL,
        [duration_days] int NULL,
        [duration_nights] int NULL,
        [baseprice] decimal(12,2) NULL,
        [min_participants] int NULL,
        [max_participants] int NULL,
        [highlights] nvarchar(max) NULL,
        [inclusions] nvarchar(max) NULL,
        [exclusions] nvarchar(max) NULL,
        [policies] nvarchar(max) NULL,
        [message] nvarchar(max) NULL,
        [thumbnail_urls] nvarchar(max) NULL,
        [image_urls] nvarchar(max) NULL,
        [status] nvarchar(50) NULL,
        [visibility] nvarchar(50) NULL,
        [is_request] bit NULL DEFAULT CAST(0 AS bit),
        [version] int NULL DEFAULT 1,
        [change_note] nvarchar(max) NULL,
        [design_request_id] int NULL,
        [is_shared_to_customer] bit NULL DEFAULT CAST(0 AS bit),
        [is_ai_generated] bit NULL DEFAULT CAST(0 AS bit),
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_tours] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tours_tour_design_requests_design_request_id] FOREIGN KEY ([design_request_id]) REFERENCES [tour_design_requests] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tours_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [chat_attachments] (
        [id] int NOT NULL IDENTITY,
        [message_id] int NOT NULL,
        [file_name] nvarchar(255) NOT NULL,
        [file_url] nvarchar(max) NOT NULL,
        [file_type] nvarchar(50) NULL,
        [file_size] int NULL,
        [thumbnail_url] nvarchar(max) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_chat_attachments] PRIMARY KEY ([id]),
        CONSTRAINT [FK_chat_attachments_chat_messages_message_id] FOREIGN KEY ([message_id]) REFERENCES [chat_messages] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [bookings] (
        [id] int NOT NULL IDENTITY,
        [booking_code] nvarchar(50) NOT NULL,
        [customer_id] nvarchar(36) NULL,
        [tour_id] int NULL,
        [design_request_id] int NULL,
        [departure_date] date NOT NULL,
        [contact_full_name] nvarchar(150) NOT NULL,
        [contact_phone] nvarchar(30) NOT NULL,
        [contact_email] nvarchar(191) NOT NULL,
        [contact_note] nvarchar(max) NULL,
        [payment_status] nvarchar(30) NULL DEFAULT N'Unpaid',
        [has_customization] bit NULL DEFAULT CAST(0 AS bit),
        [original_total_price] decimal(12,2) NULL,
        [total_price] decimal(12,2) NOT NULL,
        [status] nvarchar(20) NULL DEFAULT N'Pending',
        [cancel_reason] nvarchar(max) NULL,
        [cancelled_at] datetime2 NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_bookings] PRIMARY KEY ([id]),
        CONSTRAINT [FK_bookings_tour_design_requests_design_request_id] FOREIGN KEY ([design_request_id]) REFERENCES [tour_design_requests] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_bookings_tours_tour_id] FOREIGN KEY ([tour_id]) REFERENCES [tours] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_bookings_users_customer_id] FOREIGN KEY ([customer_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [tour_hotels] (
        [id] int NOT NULL IDENTITY,
        [tour_id] int NOT NULL,
        [service_id] int NULL,
        [destination_name] nvarchar(255) NOT NULL,
        [hotel_name] nvarchar(255) NOT NULL,
        [star_rating] int NULL DEFAULT 3,
        [nights_count] int NULL DEFAULT 1,
        [is_default] bit NULL DEFAULT CAST(0 AS bit),
        [price_difference] decimal(12,2) NULL DEFAULT 0.0,
        [address] nvarchar(max) NULL,
        [agency_id] nvarchar(36) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_tour_hotels] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_hotels_services_service_id] FOREIGN KEY ([service_id]) REFERENCES [services] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_hotels_tours_tour_id] FOREIGN KEY ([tour_id]) REFERENCES [tours] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_hotels_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [tour_pricing_tiers] (
        [id] int NOT NULL IDENTITY,
        [tour_id] int NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [tier_name] nvarchar(100) NULL,
        [min_age] int NULL,
        [max_age] int NULL,
        [price] decimal(12,2) NULL,
        [display_order] int NULL DEFAULT 0,
        CONSTRAINT [PK_tour_pricing_tiers] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_pricing_tiers_tours_tour_id] FOREIGN KEY ([tour_id]) REFERENCES [tours] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_pricing_tiers_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [tour_timeline] (
        [id] int NOT NULL IDENTITY,
        [tour_id] int NOT NULL,
        [day_number] int NOT NULL,
        [title] nvarchar(255) NULL,
        [description] nvarchar(max) NULL,
        CONSTRAINT [PK_tour_timeline] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_timeline_tours_tour_id] FOREIGN KEY ([tour_id]) REFERENCES [tours] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [tour_versions] (
        [id] int NOT NULL IDENTITY,
        [tour_id] int NOT NULL,
        [version] int NOT NULL,
        [change_note] nvarchar(max) NULL,
        [price] decimal(12,2) NULL,
        [tour_snapshot] nvarchar(max) NOT NULL,
        [created_by] nvarchar(36) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_tour_versions] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_versions_tours_tour_id] FOREIGN KEY ([tour_id]) REFERENCES [tours] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_versions_users_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_agencies] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [is_host] bit NULL DEFAULT CAST(0 AS bit),
        [original_amount] decimal(12,2) NULL DEFAULT 0.0,
        [final_amount] decimal(12,2) NOT NULL DEFAULT 0.0,
        [platform_fee] decimal(12,2) NULL DEFAULT 0.0,
        [net_payout] decimal(12,2) NULL DEFAULT 0.0,
        [settlement_status] nvarchar(30) NULL DEFAULT N'Unpaid',
        [payout_transferred_at] datetime2 NULL,
        [bank_reference_code] nvarchar(100) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_agencies] PRIMARY KEY ([id]),
        CONSTRAINT [AK_booking_agencies_booking_id_agency_id] UNIQUE ([booking_id], [agency_id]),
        CONSTRAINT [FK_booking_agencies_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_agencies_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_hotels] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [service_id] int NULL,
        [destination] nvarchar(100) NOT NULL,
        [date_from] datetime2 NULL,
        [date_to] datetime2 NULL,
        [original_hotel_name] nvarchar(255) NOT NULL,
        [original_stars] int NULL DEFAULT 5,
        [customized_hotel_name] nvarchar(255) NULL,
        [customized_stars] int NULL,
        [provider_response] nvarchar(max) NULL,
        [nights_count] int NULL DEFAULT 1,
        [price_difference] decimal(12,2) NULL DEFAULT 0.0,
        [is_customized] bit NULL DEFAULT CAST(0 AS bit),
        [status] nvarchar(30) NULL DEFAULT N'approved',
        [total_price] decimal(12,2) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_hotels] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_hotels_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_hotels_services_service_id] FOREIGN KEY ([service_id]) REFERENCES [services] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_timelines] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [day_number] int NOT NULL,
        [title] nvarchar(255) NOT NULL,
        [description] nvarchar(max) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_timelines] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_timelines_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [complaints] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [customer_id] nvarchar(36) NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [subject] nvarchar(255) NOT NULL,
        [description] nvarchar(max) NOT NULL,
        [evidence_urls] nvarchar(max) NULL,
        [agency_response] nvarchar(max) NULL,
        [agency_responded_at] datetime2 NULL,
        [admin_id] nvarchar(36) NULL,
        [admin_notes] nvarchar(max) NULL,
        [status] nvarchar(30) NULL DEFAULT N'Pending',
        [resolved_at] datetime2 NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [deleted_at] datetime2 NULL,
        CONSTRAINT [PK_complaints] PRIMARY KEY ([id]),
        CONSTRAINT [FK_complaints_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_complaints_users_admin_id] FOREIGN KEY ([admin_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_complaints_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_complaints_users_customer_id] FOREIGN KEY ([customer_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [feedbacks] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [customer_id] nvarchar(36) NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [overall_rating] int NOT NULL,
        [overall_comment] nvarchar(max) NULL,
        [agency_rating] int NOT NULL,
        [agency_comment] nvarchar(max) NULL,
        [images] nvarchar(max) NULL,
        [agency_reply] nvarchar(max) NULL,
        [replied_at] datetime2 NULL,
        [status] nvarchar(30) NULL DEFAULT N'Visible',
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_feedbacks] PRIMARY KEY ([id]),
        CONSTRAINT [FK_feedbacks_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_feedbacks_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_feedbacks_users_customer_id] FOREIGN KEY ([customer_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [payment_requests] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [description] nvarchar(255) NOT NULL,
        [amount] decimal(12,2) NOT NULL,
        [due_date] date NULL,
        [status] nvarchar(30) NULL DEFAULT N'Pending',
        [created_by] nvarchar(36) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [paid_at] datetime2 NULL,
        CONSTRAINT [PK_payment_requests] PRIMARY KEY ([id]),
        CONSTRAINT [AK_payment_requests_booking_id_id] UNIQUE ([booking_id], [id]),
        CONSTRAINT [FK_payment_requests_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_payment_requests_users_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [refund_requests] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [requested_by] nvarchar(36) NOT NULL,
        [reason] nvarchar(50) NOT NULL,
        [reason_detail] nvarchar(max) NOT NULL,
        [evidence_urls] nvarchar(max) NULL,
        [original_paid_amount] decimal(12,2) NOT NULL,
        [approved_refund_amount] decimal(12,2) NULL,
        [refund_fee] decimal(12,2) NULL DEFAULT 0.0,
        [refund_bank_name] nvarchar(100) NULL,
        [refund_account_number] nvarchar(50) NULL,
        [refund_account_holder] nvarchar(150) NULL,
        [status] nvarchar(30) NOT NULL DEFAULT N'Pending',
        [reviewed_by] nvarchar(36) NULL,
        [review_note] nvarchar(max) NULL,
        [rejection_reason] nvarchar(max) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [reviewed_at] datetime2 NULL,
        [completed_at] datetime2 NULL,
        CONSTRAINT [PK_refund_requests] PRIMARY KEY ([id]),
        CONSTRAINT [FK_refund_requests_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_refund_requests_users_requested_by] FOREIGN KEY ([requested_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_refund_requests_users_reviewed_by] FOREIGN KEY ([reviewed_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [tour_restaurants] (
        [id] int NOT NULL IDENTITY,
        [service_id] int NULL,
        [tour_timeline_id] int NOT NULL,
        [agency_id] nvarchar(36) NULL,
        [time] datetime2 NULL,
        [meal_type] nvarchar(20) NOT NULL,
        [restaurant_name] nvarchar(255) NOT NULL,
        [description] nvarchar(max) NULL,
        [is_default] bit NOT NULL DEFAULT CAST(0 AS bit),
        [price_difference] decimal(12,2) NOT NULL DEFAULT 0.0,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_tour_restaurants] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_restaurants_services_service_id] FOREIGN KEY ([service_id]) REFERENCES [services] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_restaurants_tour_timeline_tour_timeline_id] FOREIGN KEY ([tour_timeline_id]) REFERENCES [tour_timeline] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_restaurants_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [tourist_locations] (
        [id] int NOT NULL IDENTITY,
        [tour_timeline_id] int NOT NULL,
        [time] datetime2 NULL,
        [name_location] nvarchar(max) NULL,
        [agency_id] nvarchar(36) NULL,
        CONSTRAINT [PK_tourist_locations] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tourist_locations_tour_timeline_tour_timeline_id] FOREIGN KEY ([tour_timeline_id]) REFERENCES [tour_timeline] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tourist_locations_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_assigned_guides] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [guide_id] nvarchar(36) NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [role] nvarchar(50) NULL DEFAULT N'lead_guide',
        [notes] nvarchar(max) NULL,
        [assigned_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_assigned_guides] PRIMARY KEY ([id]),
        CONSTRAINT [AK_booking_assigned_guides_booking_id_agency_id_guide_id] UNIQUE ([booking_id], [agency_id], [guide_id]),
        CONSTRAINT [FK_booking_assigned_guides_booking_agencies_booking_id_agency_id] FOREIGN KEY ([booking_id], [agency_id]) REFERENCES [booking_agencies] ([booking_id], [agency_id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_assigned_guides_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_assigned_guides_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_assigned_guides_users_guide_id] FOREIGN KEY ([guide_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_incidents] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [reported_by] nvarchar(36) NOT NULL,
        [incident_type] nvarchar(50) NULL DEFAULT N'OTHER',
        [title] nvarchar(255) NOT NULL,
        [description] nvarchar(max) NOT NULL,
        [status] nvarchar(30) NULL DEFAULT N'Reported',
        [evidence_urls] nvarchar(max) NULL,
        [resolved_at] datetime2 NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_incidents] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_incidents_booking_agencies_booking_id_agency_id] FOREIGN KEY ([booking_id], [agency_id]) REFERENCES [booking_agencies] ([booking_id], [agency_id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_incidents_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_incidents_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_incidents_users_reported_by] FOREIGN KEY ([reported_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_price_adjustments] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [agency_id] nvarchar(36) NULL,
        [adjusted_by] nvarchar(36) NOT NULL,
        [previous_total_price] decimal(12,2) NOT NULL,
        [adjustment_amount] decimal(12,2) NOT NULL,
        [new_total_price] decimal(12,2) NOT NULL,
        [reason] nvarchar(max) NOT NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_price_adjustments] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_price_adjustments_booking_agencies_booking_id_agency_id] FOREIGN KEY ([booking_id], [agency_id]) REFERENCES [booking_agencies] ([booking_id], [agency_id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_price_adjustments_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_price_adjustments_users_adjusted_by] FOREIGN KEY ([adjusted_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_price_adjustments_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_locations] (
        [id] int NOT NULL IDENTITY,
        [booking_timeline_id] int NOT NULL,
        [time] datetime2 NULL,
        [agency_id] nvarchar(36) NULL,
        [original_location_name] nvarchar(255) NOT NULL,
        [customized_location_name] nvarchar(255) NULL,
        [is_customized] bit NULL DEFAULT CAST(0 AS bit),
        [customer_note] nvarchar(max) NULL,
        [price_difference] decimal(12,2) NULL DEFAULT 0.0,
        [status] nvarchar(30) NULL DEFAULT N'approved',
        [attendance_status] nvarchar(50) NULL,
        [guide_id] nvarchar(36) NULL,
        CONSTRAINT [PK_booking_locations] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_locations_booking_timelines_booking_timeline_id] FOREIGN KEY ([booking_timeline_id]) REFERENCES [booking_timelines] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_locations_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_locations_users_guide_id] FOREIGN KEY ([guide_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_restaurants] (
        [id] int NOT NULL IDENTITY,
        [service_id] int NULL,
        [booking_timeline_id] int NOT NULL,
        [date_service] date NULL,
        [time] datetime2 NULL,
        [meal_type] nvarchar(20) NOT NULL,
        [original_restaurant_name] nvarchar(255) NOT NULL,
        [customized_restaurant_name] nvarchar(255) NULL,
        [price_difference] decimal(12,2) NULL DEFAULT 0.0,
        [is_customized] bit NOT NULL DEFAULT CAST(0 AS bit),
        [total_price] decimal(12,2) NULL,
        [provider_response] nvarchar(max) NULL,
        [status] nvarchar(30) NULL DEFAULT N'approved',
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_restaurants] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_restaurants_booking_timelines_booking_timeline_id] FOREIGN KEY ([booking_timeline_id]) REFERENCES [booking_timelines] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_restaurants_services_service_id] FOREIGN KEY ([service_id]) REFERENCES [services] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [payment_transactions] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [payment_request_id] int NULL,
        [transaction_code] nvarchar(100) NOT NULL,
        [payment_method] nvarchar(50) NOT NULL,
        [amount] decimal(12,2) NOT NULL,
        [status] nvarchar(30) NULL DEFAULT N'Success',
        [payer_name] nvarchar(150) NULL,
        [payment_proof_url] nvarchar(max) NULL,
        [paid_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_payment_transactions] PRIMARY KEY ([id]),
        CONSTRAINT [FK_payment_transactions_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_payment_transactions_payment_requests_booking_id_payment_request_id] FOREIGN KEY ([booking_id], [payment_request_id]) REFERENCES [payment_requests] ([booking_id], [id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_payment_transactions_payment_requests_payment_request_id] FOREIGN KEY ([payment_request_id]) REFERENCES [payment_requests] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_participants] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [participant_index] int NOT NULL,
        [is_primary] bit NOT NULL DEFAULT CAST(1 AS bit),
        [full_name] nvarchar(150) NOT NULL,
        [date_of_birth] date NULL,
        [gender] nvarchar(20) NULL,
        [identity_card_number] nvarchar(50) NULL,
        [note] nvarchar(max) NULL,
        [tier_name] nvarchar(100) NULL,
        [price] decimal(12,2) NOT NULL DEFAULT 0.0,
        [assigned_guide_id] nvarchar(36) NULL,
        [attendance_status] nvarchar(50) NULL DEFAULT N'Pending',
        [checked_by] nvarchar(36) NULL,
        [checked_at] datetime2 NULL,
        [status] nvarchar(20) NULL DEFAULT N'ACTIVE',
        [status_note] nvarchar(max) NULL,
        [roommate_note] nvarchar(max) NULL,
        [restaurant_note] nvarchar(max) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_participants] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_participants_booking_agencies_booking_id_agency_id] FOREIGN KEY ([booking_id], [agency_id]) REFERENCES [booking_agencies] ([booking_id], [agency_id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_participants_booking_assigned_guides_booking_id_agency_id_assigned_guide_id] FOREIGN KEY ([booking_id], [agency_id], [assigned_guide_id]) REFERENCES [booking_assigned_guides] ([booking_id], [agency_id], [guide_id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_participants_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_participants_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_participants_users_assigned_guide_id] FOREIGN KEY ([assigned_guide_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_participants_users_checked_by] FOREIGN KEY ([checked_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE TABLE [booking_attraction_checkins] (
        [id] int NOT NULL IDENTITY,
        [booking_timeline_attraction_id] int NOT NULL,
        [guide_id] nvarchar(36) NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [attendance_status] nvarchar(30) NULL DEFAULT N'Pending',
        [checked_at] datetime2 NULL,
        [photo_proof_url] nvarchar(max) NULL,
        [notes] nvarchar(max) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_attraction_checkins] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_attraction_checkins_booking_locations_booking_timeline_attraction_id] FOREIGN KEY ([booking_timeline_attraction_id]) REFERENCES [booking_locations] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_attraction_checkins_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_attraction_checkins_users_guide_id] FOREIGN KEY ([guide_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_agency_subscriptions_agency_id] ON [agency_subscriptions] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_agency_subscriptions_plan_id] ON [agency_subscriptions] ([plan_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_agencies_agency_id] ON [booking_agencies] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_booking_agencies_booking_id] ON [booking_agencies] ([booking_id]) WHERE [is_host] = 1');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_agencies_booking_id_agency_id] ON [booking_agencies] ([booking_id], [agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_assigned_guides_agency_id] ON [booking_assigned_guides] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_assigned_guides_booking_id_agency_id_guide_id] ON [booking_assigned_guides] ([booking_id], [agency_id], [guide_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_assigned_guides_booking_id_guide_id] ON [booking_assigned_guides] ([booking_id], [guide_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_assigned_guides_guide_id] ON [booking_assigned_guides] ([guide_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_attraction_checkins_agency_id] ON [booking_attraction_checkins] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_attraction_checkins_booking_timeline_attraction_id_guide_id] ON [booking_attraction_checkins] ([booking_timeline_attraction_id], [guide_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_attraction_checkins_guide_id] ON [booking_attraction_checkins] ([guide_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_hotels_booking_id] ON [booking_hotels] ([booking_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_hotels_service_id] ON [booking_hotels] ([service_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_incidents_agency_id] ON [booking_incidents] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_incidents_booking_id_agency_id] ON [booking_incidents] ([booking_id], [agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_incidents_reported_by] ON [booking_incidents] ([reported_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_locations_agency_id] ON [booking_locations] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_locations_booking_timeline_id] ON [booking_locations] ([booking_timeline_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_locations_guide_id] ON [booking_locations] ([guide_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_participants_agency_id] ON [booking_participants] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_participants_assigned_guide_id] ON [booking_participants] ([assigned_guide_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_participants_booking_id_agency_id_assigned_guide_id] ON [booking_participants] ([booking_id], [agency_id], [assigned_guide_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_participants_booking_id_agency_id_participant_index] ON [booking_participants] ([booking_id], [agency_id], [participant_index]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_booking_participants_booking_id_participant_index] ON [booking_participants] ([booking_id], [participant_index]) WHERE [is_primary] = 1');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_participants_checked_by] ON [booking_participants] ([checked_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_price_adjustments_adjusted_by] ON [booking_price_adjustments] ([adjusted_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_price_adjustments_agency_id] ON [booking_price_adjustments] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_price_adjustments_booking_id_agency_id] ON [booking_price_adjustments] ([booking_id], [agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_restaurants_booking_timeline_id] ON [booking_restaurants] ([booking_timeline_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_booking_restaurants_service_id] ON [booking_restaurants] ([service_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_timelines_booking_id_day_number] ON [booking_timelines] ([booking_id], [day_number]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_bookings_booking_code] ON [bookings] ([booking_code]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_bookings_customer_id] ON [bookings] ([customer_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_bookings_design_request_id] ON [bookings] ([design_request_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_bookings_tour_id] ON [bookings] ([tour_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_business_profiles_user_id] ON [business_profiles] ([user_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_chat_attachments_message_id] ON [chat_attachments] ([message_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_chat_conversations_last_message_sender_id] ON [chat_conversations] ([last_message_sender_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_chat_conversations_user_one_id_user_two_id] ON [chat_conversations] ([user_one_id], [user_two_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_chat_conversations_user_two_id] ON [chat_conversations] ([user_two_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_chat_messages_conversation_id] ON [chat_messages] ([conversation_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_chat_messages_reply_to_message_id] ON [chat_messages] ([reply_to_message_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_chat_messages_sender_id] ON [chat_messages] ([sender_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_complaints_admin_id] ON [complaints] ([admin_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_complaints_agency_id] ON [complaints] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_complaints_booking_id] ON [complaints] ([booking_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_complaints_customer_id] ON [complaints] ([customer_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_feedbacks_agency_id] ON [feedbacks] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_feedbacks_booking_id] ON [feedbacks] ([booking_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_feedbacks_customer_id] ON [feedbacks] ([customer_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_payment_requests_booking_id_id] ON [payment_requests] ([booking_id], [id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_payment_requests_created_by] ON [payment_requests] ([created_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_payment_transactions_booking_id_payment_request_id] ON [payment_transactions] ([booking_id], [payment_request_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_payment_transactions_payment_request_id] ON [payment_transactions] ([payment_request_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_payment_transactions_transaction_code] ON [payment_transactions] ([transaction_code]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_refund_requests_booking_id] ON [refund_requests] ([booking_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_refund_requests_requested_by] ON [refund_requests] ([requested_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_refund_requests_reviewed_by] ON [refund_requests] ([reviewed_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_services_id_provider_id] ON [services] ([id], [provider_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_services_provider_id] ON [services] ([provider_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_subscription_payment_history_company_id] ON [subscription_payment_history] ([company_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_subscription_payment_history_plan_id] ON [subscription_payment_history] ([plan_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_subscription_payment_history_subscription_id] ON [subscription_payment_history] ([subscription_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_subscription_plans_slug] ON [subscription_plans] ([slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_system_bank_accounts_updated_by] ON [system_bank_accounts] ([updated_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_system_commission_configs_created_by] ON [system_commission_configs] ([created_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_design_request_agencies_agency_id] ON [tour_design_request_agencies] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_tour_design_request_agencies_request_id] ON [tour_design_request_agencies] ([request_id]) WHERE [is_host] = 1');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_tour_design_request_agencies_request_id_agency_id] ON [tour_design_request_agencies] ([request_id], [agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_design_requests_agency_id] ON [tour_design_requests] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_design_requests_user_id] ON [tour_design_requests] ([user_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_hotels_agency_id] ON [tour_hotels] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_hotels_service_id] ON [tour_hotels] ([service_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_hotels_tour_id] ON [tour_hotels] ([tour_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_pricing_tiers_agency_id] ON [tour_pricing_tiers] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_pricing_tiers_tour_id] ON [tour_pricing_tiers] ([tour_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_restaurants_agency_id] ON [tour_restaurants] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_restaurants_service_id] ON [tour_restaurants] ([service_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_restaurants_tour_timeline_id] ON [tour_restaurants] ([tour_timeline_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_tour_timeline_tour_id_day_number] ON [tour_timeline] ([tour_id], [day_number]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tour_versions_created_by] ON [tour_versions] ([created_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_tour_versions_tour_id_id] ON [tour_versions] ([tour_id], [id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_tour_versions_tour_id_version] ON [tour_versions] ([tour_id], [version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tourist_locations_agency_id] ON [tourist_locations] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tourist_locations_tour_timeline_id] ON [tourist_locations] ([tour_timeline_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tours_agency_id] ON [tours] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_tours_design_request_id] ON [tours] ([design_request_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_tours_tour_code] ON [tours] ([tour_code]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_users_agency_id] ON [users] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_users_email] ON [users] ([email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093221_InitialSchema'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101093221_InitialSchema', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101123604_AddServiceMetadata'
)
BEGIN
    ALTER TABLE [services] ADD [full_address] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101123604_AddServiceMetadata'
)
BEGIN
    ALTER TABLE [services] ADD [hidden_reason] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101123604_AddServiceMetadata'
)
BEGIN
    ALTER TABLE [services] ADD [operating_hours] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101123604_AddServiceMetadata'
)
BEGIN
    ALTER TABLE [services] ADD [sub_category] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101123604_AddServiceMetadata'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101123604_AddServiceMetadata', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101130000_AddTourProvinces'
)
BEGIN
    CREATE TABLE [tour_provinces] (
        [id] int NOT NULL IDENTITY,
        [tour_id] int NOT NULL,
        [province_code] nvarchar(32) NOT NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_tour_provinces] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_provinces_tours_tour_id] FOREIGN KEY ([tour_id]) REFERENCES [tours] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101130000_AddTourProvinces'
)
BEGIN
    CREATE INDEX [IX_tour_provinces_province_code_tour_id] ON [tour_provinces] ([province_code], [tour_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101130000_AddTourProvinces'
)
BEGIN
    CREATE UNIQUE INDEX [IX_tour_provinces_tour_id_province_code] ON [tour_provinces] ([tour_id], [province_code]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101130000_AddTourProvinces'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101130000_AddTourProvinces', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101143117_AddServiceAvailability'
)
BEGIN
    ALTER TABLE [services] ADD [is_paused] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101143117_AddServiceAvailability'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101143117_AddServiceAvailability', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101153014_AddBookingSnapshots'
)
BEGIN
    CREATE TABLE [booking_snapshots] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [version] int NOT NULL,
        [snapshot_type] nvarchar(30) NOT NULL,
        [snapshot_data] nvarchar(max) NOT NULL,
        [source_tour_version] int NULL,
        [created_at] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [created_by] nvarchar(36) NOT NULL,
        [accepted_at] datetime2 NULL,
        [accepted_by] nvarchar(36) NULL,
        CONSTRAINT [PK_booking_snapshots] PRIMARY KEY ([id]),
        CONSTRAINT [CK_booking_snapshots_accepted] CHECK (([snapshot_type] = 'agreed' AND [accepted_at] IS NOT NULL AND [accepted_by] IS NOT NULL) OR ([snapshot_type] IN ('initial_request', 'proposal') AND [accepted_at] IS NULL AND [accepted_by] IS NULL)),
        CONSTRAINT [CK_booking_snapshots_data_isjson] CHECK (ISJSON([snapshot_data]) = 1),
        CONSTRAINT [CK_booking_snapshots_type] CHECK ([snapshot_type] IN ('initial_request', 'proposal', 'agreed')),
        CONSTRAINT [CK_booking_snapshots_version] CHECK ([version] > 0),
        CONSTRAINT [FK_booking_snapshots_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_snapshots_users_accepted_by] FOREIGN KEY ([accepted_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_snapshots_users_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101153014_AddBookingSnapshots'
)
BEGIN
    CREATE INDEX [IX_booking_snapshots_accepted_by] ON [booking_snapshots] ([accepted_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101153014_AddBookingSnapshots'
)
BEGIN
    CREATE INDEX [IX_booking_snapshots_booking_id_snapshot_type_version] ON [booking_snapshots] ([booking_id], [snapshot_type], [version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101153014_AddBookingSnapshots'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_snapshots_booking_id_version] ON [booking_snapshots] ([booking_id], [version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101153014_AddBookingSnapshots'
)
BEGIN
    CREATE INDEX [IX_booking_snapshots_created_by] ON [booking_snapshots] ([created_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101153014_AddBookingSnapshots'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101153014_AddBookingSnapshots', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    ALTER TABLE [tour_restaurants] ADD [agency_supplier_id] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    ALTER TABLE [tour_restaurants] ADD [supplier_snapshot] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    ALTER TABLE [tour_restaurants] ADD [supplier_source] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    ALTER TABLE [tour_hotels] ADD [agency_supplier_id] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    ALTER TABLE [tour_hotels] ADD [supplier_snapshot] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    ALTER TABLE [tour_hotels] ADD [supplier_source] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    CREATE TABLE [agency_suppliers] (
        [id] int NOT NULL IDENTITY,
        [agency_id] nvarchar(36) NOT NULL,
        [supplier_type] nvarchar(20) NOT NULL,
        [name] nvarchar(255) NOT NULL,
        [address] nvarchar(500) NULL,
        [area] nvarchar(255) NULL,
        [contact_name] nvarchar(150) NULL,
        [contact_phone] nvarchar(30) NULL,
        [contact_email] nvarchar(191) NULL,
        [star_rating] int NULL,
        [reference_price] decimal(12,2) NULL,
        [conditions] nvarchar(2000) NULL,
        [notes] nvarchar(2000) NULL,
        [status] nvarchar(20) NOT NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        [updated_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_agency_suppliers] PRIMARY KEY ([id]),
        CONSTRAINT [FK_agency_suppliers_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    CREATE INDEX [IX_tour_restaurants_agency_supplier_id] ON [tour_restaurants] ([agency_supplier_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    CREATE INDEX [IX_tour_hotels_agency_supplier_id] ON [tour_hotels] ([agency_supplier_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    CREATE INDEX [IX_agency_suppliers_agency_id_supplier_type_name] ON [agency_suppliers] ([agency_id], [supplier_type], [name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    CREATE INDEX [IX_agency_suppliers_agency_id_supplier_type_status] ON [agency_suppliers] ([agency_id], [supplier_type], [status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    ALTER TABLE [tour_hotels] ADD CONSTRAINT [FK_tour_hotels_agency_suppliers_agency_supplier_id] FOREIGN KEY ([agency_supplier_id]) REFERENCES [agency_suppliers] ([id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    ALTER TABLE [tour_restaurants] ADD CONSTRAINT [FK_tour_restaurants_agency_suppliers_agency_supplier_id] FOREIGN KEY ([agency_supplier_id]) REFERENCES [agency_suppliers] ([id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    UPDATE tour_restaurants SET supplier_source = CASE WHEN service_id IS NULL THEN N'AGENCY_SUPPLIER' ELSE N'PLATFORM_PARTNER' END WHERE supplier_source IS NULL
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    UPDATE tour_hotels SET supplier_source = CASE WHEN service_id IS NULL THEN N'AGENCY_SUPPLIER' ELSE N'PLATFORM_PARTNER' END WHERE supplier_source IS NULL
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101170830_AddAgencySupplierDirectory'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101170830_AddAgencySupplierDirectory', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101184827_AddBookingProposalEvents'
)
BEGIN
    CREATE TABLE [booking_proposal_events] (
        [id] int NOT NULL IDENTITY,
        [snapshot_id] int NOT NULL,
        [actor_id] nvarchar(36) NOT NULL,
        [recipient_id] nvarchar(36) NOT NULL,
        [event_type] nvarchar(30) NOT NULL,
        [message] nvarchar(2000) NULL,
        [created_at] datetime2 NOT NULL,
        [read_at] datetime2 NULL,
        CONSTRAINT [PK_booking_proposal_events] PRIMARY KEY ([id]),
        CONSTRAINT [CK_booking_proposal_events_type] CHECK ([event_type] IN ('proposal_sent', 'proposal_accepted', 'changes_requested')),
        CONSTRAINT [FK_booking_proposal_events_booking_snapshots_snapshot_id] FOREIGN KEY ([snapshot_id]) REFERENCES [booking_snapshots] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_proposal_events_users_actor_id] FOREIGN KEY ([actor_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_proposal_events_users_recipient_id] FOREIGN KEY ([recipient_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101184827_AddBookingProposalEvents'
)
BEGIN
    CREATE INDEX [IX_booking_proposal_events_actor_id] ON [booking_proposal_events] ([actor_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101184827_AddBookingProposalEvents'
)
BEGIN
    CREATE INDEX [IX_booking_proposal_events_recipient_id_read_at_created_at] ON [booking_proposal_events] ([recipient_id], [read_at], [created_at]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101184827_AddBookingProposalEvents'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_proposal_events_snapshot_id_event_type_recipient_id] ON [booking_proposal_events] ([snapshot_id], [event_type], [recipient_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101184827_AddBookingProposalEvents'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101184827_AddBookingProposalEvents', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101195316_AddGuideProfiles'
)
BEGIN
    CREATE TABLE [guide_profiles] (
        [user_id] nvarchar(36) NOT NULL,
        [experience_years] smallint NOT NULL,
        [languages] nvarchar(max) NOT NULL,
        [routes] nvarchar(max) NOT NULL,
        [specialties] nvarchar(max) NOT NULL,
        [bio] nvarchar(max) NULL,
        [suspended_at] datetime2 NULL,
        [suspended_reason] nvarchar(2000) NULL,
        [created_at] datetime2 NOT NULL,
        [updated_at] datetime2 NOT NULL,
        CONSTRAINT [PK_guide_profiles] PRIMARY KEY ([user_id]),
        CONSTRAINT [CK_guide_profiles_experience] CHECK (experience_years BETWEEN 0 AND 50),
        CONSTRAINT [FK_guide_profiles_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101195316_AddGuideProfiles'
)
BEGIN

    INSERT INTO guide_profiles (user_id, experience_years, languages, routes, specialties, created_at, updated_at)
    SELECT id, 0, N'[]', N'[]', N'[]', SYSUTCDATETIME(), SYSUTCDATETIME()
    FROM users WHERE role = N'TourGuide';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101195316_AddGuideProfiles'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101195316_AddGuideProfiles', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102071648_AddDepositScheduleAndVnPay'
)
BEGIN
    ALTER TABLE [payment_transactions] ADD [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME());
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102071648_AddDepositScheduleAndVnPay'
)
BEGIN
    ALTER TABLE [payment_transactions] ADD [gateway_response_code] nvarchar(10) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102071648_AddDepositScheduleAndVnPay'
)
BEGIN
    ALTER TABLE [payment_transactions] ADD [gateway_transaction_no] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102071648_AddDepositScheduleAndVnPay'
)
BEGIN
    ALTER TABLE [payment_requests] ADD [stage] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102071648_AddDepositScheduleAndVnPay'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_payment_requests_active_stage] ON [payment_requests] ([booking_id], [stage]) WHERE [stage] IS NOT NULL AND [status] IN (''Pending'', ''Overdue'', ''Paid'')');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102071648_AddDepositScheduleAndVnPay'
)
BEGIN
    EXEC(N'ALTER TABLE [payment_requests] ADD CONSTRAINT [CK_payment_requests_stage] CHECK ([stage] IS NULL OR [stage] IN (''deposit'', ''balance''))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102071648_AddDepositScheduleAndVnPay'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261102071648_AddDepositScheduleAndVnPay', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102085451_RemoveBookingSnapshotsAndProposalEvents'
)
BEGIN
    DROP TABLE [booking_proposal_events];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102085451_RemoveBookingSnapshotsAndProposalEvents'
)
BEGIN
    DROP TABLE [booking_snapshots];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102085451_RemoveBookingSnapshotsAndProposalEvents'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261102085451_RemoveBookingSnapshotsAndProposalEvents', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102100204_AddPayOsAndDepositDeadline'
)
BEGIN
    ALTER TABLE [payment_transactions] ADD [checkout_url] nvarchar(1000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102100204_AddPayOsAndDepositDeadline'
)
BEGIN
    ALTER TABLE [payment_transactions] ADD [expires_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102100204_AddPayOsAndDepositDeadline'
)
BEGIN
    ALTER TABLE [payment_transactions] ADD [gateway_link_id] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102100204_AddPayOsAndDepositDeadline'
)
BEGIN
    ALTER TABLE [payment_transactions] ADD [review_note] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102100204_AddPayOsAndDepositDeadline'
)
BEGIN
    ALTER TABLE [payment_requests] ADD [due_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102100204_AddPayOsAndDepositDeadline'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261102100204_AddPayOsAndDepositDeadline', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103114537_AddBookingContracts'
)
BEGIN
    CREATE TABLE [booking_contracts] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [version] int NOT NULL,
        [contract_no] nvarchar(50) NOT NULL,
        [total_amount] decimal(12,2) NOT NULL,
        [status] nvarchar(30) NOT NULL,
        [signed_file_name] nvarchar(260) NULL,
        [signed_file_type] nvarchar(50) NULL,
        [signed_file_sha256] nvarchar(64) NULL,
        [signed_at] datetime2 NULL,
        [sign_method] nvarchar(20) NULL,
        [reviewed_by] nvarchar(36) NULL,
        [reviewed_at] datetime2 NULL,
        [review_note] nvarchar(1000) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_booking_contracts] PRIMARY KEY ([id]),
        CONSTRAINT [CK_booking_contracts_status] CHECK ([status] IN ('AwaitingSignature', 'Signed', 'Verified', 'ResignRequested', 'Superseded')),
        CONSTRAINT [FK_booking_contracts_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_contracts_users_reviewed_by] FOREIGN KEY ([reviewed_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103114537_AddBookingContracts'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_contracts_booking_id_version] ON [booking_contracts] ([booking_id], [version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103114537_AddBookingContracts'
)
BEGIN
    CREATE INDEX [IX_booking_contracts_reviewed_by] ON [booking_contracts] ([reviewed_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103114537_AddBookingContracts'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103114537_AddBookingContracts', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052847_AddCustomTourRequestBusinessAndUniqueTour'
)
BEGIN
    DROP INDEX [IX_tours_design_request_id] ON [tours];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052847_AddCustomTourRequestBusinessAndUniqueTour'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [business_email] nvarchar(191) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052847_AddCustomTourRequestBusinessAndUniqueTour'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [business_name] nvarchar(255) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052847_AddCustomTourRequestBusinessAndUniqueTour'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [business_phone] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052847_AddCustomTourRequestBusinessAndUniqueTour'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_tours_design_request_id] ON [tours] ([design_request_id]) WHERE [design_request_id] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052847_AddCustomTourRequestBusinessAndUniqueTour'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261104052847_AddCustomTourRequestBusinessAndUniqueTour', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    DROP INDEX [IX_tours_design_request_id] ON [tours];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    CREATE TABLE [booking_quotations] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [version] int NOT NULL,
        [tour_id] int NOT NULL,
        [tour_version] int NOT NULL,
        [status] nvarchar(30) NOT NULL,
        [estimated_sale] decimal(12,2) NOT NULL,
        [total_cost] decimal(12,2) NOT NULL,
        [agency_profit] decimal(12,2) NOT NULL,
        [sale_total] decimal(12,2) NOT NULL,
        [lines_json] nvarchar(max) NOT NULL,
        [reason] nvarchar(1000) NOT NULL,
        [created_at] datetime2 NOT NULL,
        [sent_at] datetime2 NULL,
        [accepted_at] datetime2 NULL,
        CONSTRAINT [PK_booking_quotations] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_quotations_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_quotations_tours_tour_id] FOREIGN KEY ([tour_id]) REFERENCES [tours] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    CREATE TABLE [booking_supplier_requests] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [service_id] int NOT NULL,
        [provider_id] nvarchar(36) NOT NULL,
        [slot_key] nvarchar(100) NOT NULL,
        [service_name] nvarchar(255) NOT NULL,
        [service_date_from] date NULL,
        [service_date_to] date NULL,
        [quantity] decimal(12,2) NOT NULL,
        [unit] nvarchar(30) NOT NULL,
        [estimated_cost] decimal(12,2) NOT NULL,
        [quoted_cost] decimal(12,2) NULL,
        [status] nvarchar(30) NOT NULL,
        [note] nvarchar(1000) NULL,
        [created_at] datetime2 NOT NULL,
        [responded_at] datetime2 NULL,
        CONSTRAINT [PK_booking_supplier_requests] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_supplier_requests_bookings_booking_id] FOREIGN KEY ([booking_id]) REFERENCES [bookings] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_supplier_requests_services_service_id] FOREIGN KEY ([service_id]) REFERENCES [services] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_supplier_requests_users_provider_id] FOREIGN KEY ([provider_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    CREATE INDEX [IX_tours_design_request_id] ON [tours] ([design_request_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_quotations_booking_id_version] ON [booking_quotations] ([booking_id], [version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    CREATE INDEX [IX_booking_quotations_tour_id] ON [booking_quotations] ([tour_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    CREATE INDEX [IX_booking_supplier_requests_booking_id_slot_key] ON [booking_supplier_requests] ([booking_id], [slot_key]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    CREATE INDEX [IX_booking_supplier_requests_provider_id_status] ON [booking_supplier_requests] ([provider_id], [status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    CREATE INDEX [IX_booking_supplier_requests_service_id] ON [booking_supplier_requests] ([service_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104083345_AddBookingQuotationsAndMultiplePlans'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261104083345_AddBookingQuotationsAndMultiplePlans', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104113305_AddTourPlanProposals'
)
BEGIN
    CREATE TABLE [tour_plan_proposals] (
        [id] int NOT NULL IDENTITY,
        [request_id] int NOT NULL,
        [tour_id] int NOT NULL,
        [customer_id] nvarchar(36) NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [base_tour_version] int NOT NULL,
        [proposal_json] nvarchar(max) NOT NULL,
        [message] nvarchar(2000) NOT NULL,
        [status] nvarchar(30) NOT NULL,
        [agency_reply] nvarchar(2000) NULL,
        [created_at] datetime2 NOT NULL,
        [responded_at] datetime2 NULL,
        CONSTRAINT [PK_tour_plan_proposals] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_plan_proposals_tour_design_requests_request_id] FOREIGN KEY ([request_id]) REFERENCES [tour_design_requests] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_plan_proposals_tours_tour_id] FOREIGN KEY ([tour_id]) REFERENCES [tours] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_plan_proposals_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_plan_proposals_users_customer_id] FOREIGN KEY ([customer_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104113305_AddTourPlanProposals'
)
BEGIN
    CREATE INDEX [IX_tour_plan_proposals_agency_id_status] ON [tour_plan_proposals] ([agency_id], [status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104113305_AddTourPlanProposals'
)
BEGIN
    CREATE INDEX [IX_tour_plan_proposals_customer_id] ON [tour_plan_proposals] ([customer_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104113305_AddTourPlanProposals'
)
BEGIN
    CREATE INDEX [IX_tour_plan_proposals_request_id_created_at] ON [tour_plan_proposals] ([request_id], [created_at]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104113305_AddTourPlanProposals'
)
BEGIN
    CREATE INDEX [IX_tour_plan_proposals_tour_id] ON [tour_plan_proposals] ([tour_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104113305_AddTourPlanProposals'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261104113305_AddTourPlanProposals', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104134648_AddContractSignSessions'
)
BEGIN
    CREATE TABLE [contract_sign_sessions] (
        [id] int NOT NULL IDENTITY,
        [contract_id] int NOT NULL,
        [token_hash] nvarchar(64) NOT NULL,
        [expires_at] datetime2 NOT NULL,
        [otp_hash] nvarchar(64) NULL,
        [otp_expires_at] datetime2 NULL,
        [otp_sent_at] datetime2 NULL,
        [otp_send_count] int NOT NULL,
        [otp_attempts] int NOT NULL,
        [completed_at] datetime2 NULL,
        [signer_ip] nvarchar(45) NULL,
        [signer_user_agent] nvarchar(300) NULL,
        [created_at] datetime2 NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_contract_sign_sessions] PRIMARY KEY ([id]),
        CONSTRAINT [FK_contract_sign_sessions_booking_contracts_contract_id] FOREIGN KEY ([contract_id]) REFERENCES [booking_contracts] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104134648_AddContractSignSessions'
)
BEGIN
    CREATE INDEX [IX_contract_sign_sessions_contract_id] ON [contract_sign_sessions] ([contract_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104134648_AddContractSignSessions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_contract_sign_sessions_token_hash] ON [contract_sign_sessions] ([token_hash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104134648_AddContractSignSessions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261104134648_AddContractSignSessions', N'10.0.10');
END;

COMMIT;
GO

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

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109114359_AllowBookingSurchargePaymentRequests'
)
BEGIN
    ALTER TABLE [payment_requests] DROP CONSTRAINT [CK_payment_requests_stage];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109114359_AllowBookingSurchargePaymentRequests'
)
BEGIN
    EXEC(N'ALTER TABLE [payment_requests] ADD CONSTRAINT [CK_payment_requests_stage] CHECK ([stage] IS NULL OR [stage] IN (''deposit'', ''balance'') OR [stage] LIKE ''fee:%'')');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109114359_AllowBookingSurchargePaymentRequests'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261109114359_AllowBookingSurchargePaymentRequests', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109122909_AddAgencyParticipantCreationKey'
)
BEGIN
    ALTER TABLE [booking_participants] ADD [creation_key] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109122909_AddAgencyParticipantCreationKey'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_booking_participants_booking_id_creation_key] ON [booking_participants] ([booking_id], [creation_key]) WHERE [creation_key] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109122909_AddAgencyParticipantCreationKey'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261109122909_AddAgencyParticipantCreationKey', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109133553_RenameBookingCustomizedColumnsToCurrent'
)
BEGIN
    EXEC sp_rename N'[booking_restaurants].[customized_restaurant_name]', N'current_restaurant_name', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109133553_RenameBookingCustomizedColumnsToCurrent'
)
BEGIN
    EXEC sp_rename N'[booking_locations].[customized_location_name]', N'current_location_name', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109133553_RenameBookingCustomizedColumnsToCurrent'
)
BEGIN
    EXEC sp_rename N'[booking_hotels].[customized_stars]', N'current_stars', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109133553_RenameBookingCustomizedColumnsToCurrent'
)
BEGIN
    EXEC sp_rename N'[booking_hotels].[customized_hotel_name]', N'current_hotel_name', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109133553_RenameBookingCustomizedColumnsToCurrent'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261109133553_RenameBookingCustomizedColumnsToCurrent', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109140022_PreserveBookedOriginalServiceNames'
)
BEGIN
    UPDATE dbo.booking_hotels SET current_hotel_name = original_hotel_name WHERE current_hotel_name IS NULL;
    UPDATE dbo.booking_hotels SET current_stars = original_stars WHERE current_stars IS NULL;
    UPDATE dbo.booking_restaurants SET current_restaurant_name = original_restaurant_name WHERE current_restaurant_name IS NULL;
    UPDATE dbo.booking_locations SET current_location_name = original_location_name WHERE current_location_name IS NULL;

    UPDATE h SET original_hotel_name = initial.name
    FROM dbo.booking_hotels h
    CROSS APPLY (SELECT TOP (1) q.lines_json FROM dbo.booking_quotations q
        WHERE q.booking_id = h.booking_id ORDER BY q.version, q.id) first_plan
    CROSS APPLY OPENJSON(CASE WHEN ISJSON(first_plan.lines_json) = 1 THEN first_plan.lines_json ELSE N'[]' END)
        WITH (slot_key nvarchar(100) '$.slotKey', name nvarchar(255) '$.name') initial
    WHERE initial.slot_key = CONCAT('hotel:', h.id) AND NULLIF(LTRIM(RTRIM(initial.name)), N'') IS NOT NULL;

    UPDATE m SET original_restaurant_name = initial.name
    FROM dbo.booking_restaurants m
    JOIN dbo.booking_timelines d ON d.id = m.booking_timeline_id
    CROSS APPLY (SELECT TOP (1) q.lines_json FROM dbo.booking_quotations q
        WHERE q.booking_id = d.booking_id ORDER BY q.version, q.id) first_plan
    CROSS APPLY OPENJSON(CASE WHEN ISJSON(first_plan.lines_json) = 1 THEN first_plan.lines_json ELSE N'[]' END)
        WITH (slot_key nvarchar(100) '$.slotKey', name nvarchar(255) '$.name') initial
    WHERE initial.slot_key = CONCAT('meal:', m.id) AND NULLIF(LTRIM(RTRIM(initial.name)), N'') IS NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109140022_PreserveBookedOriginalServiceNames'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261109140022_PreserveBookedOriginalServiceNames', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tours WHERE design_request_id IS NOT NULL GROUP BY design_request_id HAVING COUNT(*) > 1)
        THROW 51000, 'A request has multiple old tour plans. Export and consolidate these plans before applying SimplifyPrivateTourDesignWorkflow.', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    DROP INDEX [IX_tours_design_request_id] ON [tours];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [responded_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tours] ADD [cloned_from_tour_id] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tours] ADD [shared_version] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_versions] ADD [restored_from_version] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_versions] ADD [shared_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_versions] ADD [shared_by] nvarchar(36) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    DECLARE @var10 nvarchar(max);
    SELECT @var10 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_requests]') AND [c].[name] = N'status');
    IF @var10 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_requests] DROP CONSTRAINT ' + @var10 + ';');
    ALTER TABLE [tour_design_requests] ADD DEFAULT N'pending' FOR [status];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [rejection_reason] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [chat_messages] ADD [design_request_id] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [bookings] ADD [tour_version] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tour_versions] ADD CONSTRAINT [AK_tour_versions_tour_id_version] UNIQUE ([tour_id], [version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    CREATE INDEX [IX_tours_cloned_from_tour_id] ON [tours] ([cloned_from_tour_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_tours_design_request_id] ON [tours] ([design_request_id]) WHERE [design_request_id] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    CREATE INDEX [IX_tours_id_shared_version] ON [tours] ([id], [shared_version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    CREATE INDEX [IX_chat_messages_design_request_id_id] ON [chat_messages] ([design_request_id], [id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [chat_messages] ADD CONSTRAINT [FK_chat_messages_tour_design_requests_design_request_id] FOREIGN KEY ([design_request_id]) REFERENCES [tour_design_requests] ([id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tours] ADD CONSTRAINT [FK_tours_tour_versions_id_shared_version] FOREIGN KEY ([id], [shared_version]) REFERENCES [tour_versions] ([tour_id], [version]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    ALTER TABLE [tours] ADD CONSTRAINT [FK_tours_tours_cloned_from_tour_id] FOREIGN KEY ([cloned_from_tour_id]) REFERENCES [tours] ([id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    EXEC(N'UPDATE v SET shared_at = COALESCE(v.created_at, SYSUTCDATETIME()), shared_by = v.created_by
      FROM dbo.tour_versions v WHERE v.SharedToCustomer = 1;
    UPDATE t SET shared_version = t.version FROM dbo.tours t
      WHERE t.is_request = 1 AND t.is_shared_to_customer = 1
      AND EXISTS (SELECT 1 FROM dbo.tour_versions v WHERE v.tour_id=t.id AND v.version=t.version);
    UPDATE v SET shared_at = COALESCE(v.shared_at, SYSUTCDATETIME()), shared_by=COALESCE(v.shared_by,t.agency_id)
      FROM dbo.tour_versions v JOIN dbo.tours t ON v.tour_id=t.id AND v.version=t.shared_version;
    UPDATE dbo.tour_design_requests SET status=CASE UPPER(status)
      WHEN ''PENDING'' THEN ''pending'' WHEN ''CANCELLED'' THEN ''cancelled'' WHEN ''REJECTED'' THEN ''rejected'' ELSE ''in_progress'' END;
    UPDATE dbo.tour_design_requests SET responded_at=COALESCE(updated_at,created_at) WHERE status<>''pending'';
    UPDATE dbo.tour_design_requests SET rejection_reason=N''Yêu cầu đã bị từ chối trước khi bổ sung chức năng ghi lý do.'' WHERE status=''rejected'';
    UPDATE b SET tour_version=COALESCE((SELECT TOP(1) q.tour_version FROM dbo.booking_quotations q WHERE q.booking_id=b.id ORDER BY q.version),t.version,1)
      FROM dbo.bookings b LEFT JOIN dbo.tours t ON t.id=b.tour_id;

    CREATE TABLE #LegacyDesignMessages (request_id int, actor nvarchar(36), content nvarchar(max), sent_at datetime2);
    INSERT #LegacyDesignMessages
    SELECT r.id, CASE WHEN COALESCE(j.Actor,j.actor2) IN (r.user_id,r.agency_id) THEN COALESCE(j.Actor,j.actor2) ELSE r.agency_id END,
           COALESCE(j.Message,j.message2), COALESCE(TRY_CONVERT(datetime2,COALESCE(j.At,j.at2)),r.created_at,SYSUTCDATETIME())
      FROM dbo.tour_design_request_agencies a JOIN dbo.tour_design_requests r ON a.request_id=r.id
      CROSS APPLY OPENJSON(CASE WHEN ISJSON(a.communication_notes)=1 AND LEFT(LTRIM(a.communication_notes),1)=''['' THEN a.communication_notes ELSE N''[]'' END)
      WITH (Actor nvarchar(36) ''$.Actor'', actor2 nvarchar(36) ''$.actor'', Message nvarchar(max) ''$.Message'',message2 nvarchar(max) ''$.message'', At nvarchar(100) ''$.At'',at2 nvarchar(100) ''$.at'') j
     WHERE COALESCE(j.Message,j.message2) IS NOT NULL;
    INSERT #LegacyDesignMessages
    SELECT r.id,r.agency_id,a.communication_notes,COALESCE(a.assigned_at,r.created_at,SYSUTCDATETIME())
      FROM dbo.tour_design_request_agencies a JOIN dbo.tour_design_requests r ON a.request_id=r.id
     WHERE NULLIF(a.communication_notes,N'''') IS NOT NULL AND ISJSON(a.communication_notes)=0;
    INSERT #LegacyDesignMessages
    SELECT request_id,customer_id,N''[Đề xuất trước khi chuyển sang chat] ''+message+NCHAR(10)+proposal_json,created_at FROM dbo.tour_plan_proposals;
    INSERT #LegacyDesignMessages
    SELECT request_id,agency_id,N''[Phản hồi đề xuất cũ] ''+agency_reply,COALESCE(responded_at,created_at) FROM dbo.tour_plan_proposals WHERE NULLIF(agency_reply,N'''') IS NOT NULL;
    IF EXISTS(SELECT 1 FROM #LegacyDesignMessages m JOIN dbo.tour_design_requests r ON r.id=m.request_id WHERE r.user_id IS NULL OR r.agency_id IS NULL)
        THROW 51001, ''Legacy request messages have no customer/agency. Assign owners before migrating.'',1;
    INSERT dbo.chat_conversations(user_one_id,user_two_id,status,created_at,updated_at)
    SELECT DISTINCT CASE WHEN r.user_id COLLATE Latin1_General_100_BIN2 < r.agency_id COLLATE Latin1_General_100_BIN2 THEN r.user_id ELSE r.agency_id END,
      CASE WHEN r.user_id COLLATE Latin1_General_100_BIN2 < r.agency_id COLLATE Latin1_General_100_BIN2 THEN r.agency_id ELSE r.user_id END,''active'',SYSUTCDATETIME(),SYSUTCDATETIME()
      FROM dbo.tour_design_requests r WHERE EXISTS(SELECT 1 FROM #LegacyDesignMessages m WHERE m.request_id=r.id)
      AND NOT EXISTS(SELECT 1 FROM dbo.chat_conversations c WHERE (c.user_one_id=r.user_id AND c.user_two_id=r.agency_id) OR (c.user_one_id=r.agency_id AND c.user_two_id=r.user_id));
    INSERT dbo.chat_messages(conversation_id,sender_id,content,content_type,is_read,is_edited,is_deleted,created_at,updated_at,design_request_id)
    SELECT c.id,m.actor,m.content,''text'',0,0,0,m.sent_at,m.sent_at,m.request_id FROM #LegacyDesignMessages m
      JOIN dbo.tour_design_requests r ON r.id=m.request_id JOIN dbo.chat_conversations c ON
      (c.user_one_id=r.user_id AND c.user_two_id=r.agency_id) OR (c.user_one_id=r.agency_id AND c.user_two_id=r.user_id);
    UPDATE c SET last_message_content=m.content,last_message_sender_id=m.sender_id,last_message_at=m.created_at FROM dbo.chat_conversations c
      CROSS APPLY(SELECT TOP(1) content,sender_id,created_at FROM dbo.chat_messages WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC) m;
    DROP TABLE #LegacyDesignMessages;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    DROP TABLE [tour_design_request_agencies];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    DROP TABLE [tour_plan_proposals];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    DECLARE @var11 nvarchar(max);
    SELECT @var11 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tours]') AND [c].[name] = N'is_shared_to_customer');
    IF @var11 IS NOT NULL EXEC(N'ALTER TABLE [tours] DROP CONSTRAINT ' + @var11 + ';');
    ALTER TABLE [tours] DROP COLUMN [is_shared_to_customer];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    DECLARE @var12 nvarchar(max);
    SELECT @var12 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_versions]') AND [c].[name] = N'SharedToCustomer');
    IF @var12 IS NOT NULL EXEC(N'ALTER TABLE [tour_versions] DROP CONSTRAINT ' + @var12 + ';');
    ALTER TABLE [tour_versions] DROP COLUMN [SharedToCustomer];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    DECLARE @var13 nvarchar(max);
    SELECT @var13 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_requests]') AND [c].[name] = N'AgreedTourId');
    IF @var13 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_requests] DROP CONSTRAINT ' + @var13 + ';');
    ALTER TABLE [tour_design_requests] DROP COLUMN [AgreedTourId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    DECLARE @var14 nvarchar(max);
    SELECT @var14 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_requests]') AND [c].[name] = N'AgreedTourVersion');
    IF @var14 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_requests] DROP CONSTRAINT ' + @var14 + ';');
    ALTER TABLE [tour_design_requests] DROP COLUMN [AgreedTourVersion];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    DECLARE @var15 nvarchar(max);
    SELECT @var15 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_requests]') AND [c].[name] = N'AgreedAt');
    IF @var15 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_requests] DROP CONSTRAINT ' + @var15 + ';');
    ALTER TABLE [tour_design_requests] DROP COLUMN [AgreedAt];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261109192041_SimplifyPrivateTourDesignWorkflow'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261109192041_SimplifyPrivateTourDesignWorkflow', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110114121_RestoreDesignTourCoHosting'
)
BEGIN
    CREATE TABLE [tour_design_request_agencies] (
        [id] int NOT NULL IDENTITY,
        [tour_design_request_id] int NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [stage_area] nvarchar(255) NOT NULL,
        [assigned_days] nvarchar(max) NOT NULL,
        [suggested_budget] decimal(12,2) NULL,
        [communication_notes] nvarchar(2000) NULL,
        [status] varchar(20) NOT NULL,
        [rejection_reason] nvarchar(2000) NULL,
        [quote_adult] decimal(12,2) NULL,
        [quote_child] decimal(12,2) NULL,
        [quote_infant] decimal(12,2) NULL,
        [quote_note] nvarchar(2000) NULL,
        [quoted_at] datetime2 NULL,
        [assigned_at] datetime2 NOT NULL,
        [responded_at] datetime2 NULL,
        CONSTRAINT [PK_tour_design_request_agencies] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_design_request_agencies_tour_design_requests_tour_design_request_id] FOREIGN KEY ([tour_design_request_id]) REFERENCES [tour_design_requests] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_design_request_agencies_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110114121_RestoreDesignTourCoHosting'
)
BEGIN
    CREATE INDEX [IX_tour_design_request_agencies_agency_id] ON [tour_design_request_agencies] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110114121_RestoreDesignTourCoHosting'
)
BEGIN
    CREATE UNIQUE INDEX [IX_tour_design_request_agencies_tour_design_request_id_agency_id] ON [tour_design_request_agencies] ([tour_design_request_id], [agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110114121_RestoreDesignTourCoHosting'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261110114121_RestoreDesignTourCoHosting', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    DROP INDEX [IX_chat_messages_conversation_id] ON [chat_messages];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    DROP INDEX [IX_chat_conversations_user_two_id] ON [chat_conversations];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    ALTER TABLE [chat_messages] ADD [client_message_id] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    EXEC(N'ALTER TABLE [chat_conversations] ADD [pair_high] AS CASE WHEN user_one_id < user_two_id THEN user_two_id ELSE user_one_id END PERSISTED');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    EXEC(N'ALTER TABLE [chat_conversations] ADD [pair_low] AS CASE WHEN user_one_id < user_two_id THEN user_one_id ELSE user_two_id END PERSISTED');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    CREATE INDEX [IX_chat_messages_conversation_id_id] ON [chat_messages] ([conversation_id], [id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_chat_messages_conversation_id_sender_id_client_message_id] ON [chat_messages] ([conversation_id], [sender_id], [client_message_id]) WHERE [client_message_id] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    CREATE INDEX [IX_chat_messages_conversation_id_sender_id_is_read] ON [chat_messages] ([conversation_id], [sender_id], [is_read]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    CREATE UNIQUE INDEX [IX_chat_conversations_pair_low_pair_high] ON [chat_conversations] ([pair_low], [pair_high]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    CREATE INDEX [IX_chat_conversations_user_one_id_last_message_at] ON [chat_conversations] ([user_one_id], [last_message_at]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    CREATE INDEX [IX_chat_conversations_user_two_id_last_message_at] ON [chat_conversations] ([user_two_id], [last_message_at]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    EXEC(N'ALTER TABLE [chat_conversations] ADD CONSTRAINT [CK_chat_distinct_users] CHECK (user_one_id <> user_two_id)');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110121256_AddRealtimeDirectChat'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261110121256_AddRealtimeDirectChat', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    DECLARE @var16 nvarchar(max);
    SELECT @var16 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_request_agencies]') AND [c].[name] = N'communication_notes');
    IF @var16 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_request_agencies] DROP CONSTRAINT ' + @var16 + ';');
    ALTER TABLE [tour_design_request_agencies] ALTER COLUMN [communication_notes] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    UPDATE tour_design_request_agencies SET communication_notes=CONCAT(communication_notes,CHAR(10),N'Lý do từ chối: ',rejection_reason)
    WHERE rejection_reason IS NOT NULL;
    INSERT INTO tour_pricing_tiers(tour_id,agency_id,tier_name,min_age,max_age,price,display_order)
    SELECT t.id,a.agency_id,p.label,p.min_age,p.max_age,p.price,p.sort_order
    FROM tour_design_request_agencies a JOIN tours t ON t.design_request_id=a.tour_design_request_id
    CROSS APPLY (VALUES (N'Người lớn',12,CAST(NULL AS int),a.quote_adult,2),(N'Trẻ em',5,11,a.quote_child,1),(N'Em bé',0,4,a.quote_infant,0)) p(label,min_age,max_age,price,sort_order)
    WHERE a.status='accepted' AND p.price IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tour_pricing_tiers x WHERE x.tour_id=t.id AND x.agency_id=a.agency_id AND x.min_age=p.min_age);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    ALTER TABLE [tour_design_request_agencies] DROP CONSTRAINT [FK_tour_design_request_agencies_tour_design_requests_tour_design_request_id];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    DECLARE @var17 nvarchar(max);
    SELECT @var17 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_request_agencies]') AND [c].[name] = N'assigned_days');
    IF @var17 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_request_agencies] DROP CONSTRAINT ' + @var17 + ';');
    ALTER TABLE [tour_design_request_agencies] DROP COLUMN [assigned_days];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    DECLARE @var18 nvarchar(max);
    SELECT @var18 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_request_agencies]') AND [c].[name] = N'quote_adult');
    IF @var18 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_request_agencies] DROP CONSTRAINT ' + @var18 + ';');
    ALTER TABLE [tour_design_request_agencies] DROP COLUMN [quote_adult];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    DECLARE @var19 nvarchar(max);
    SELECT @var19 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_request_agencies]') AND [c].[name] = N'quote_child');
    IF @var19 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_request_agencies] DROP CONSTRAINT ' + @var19 + ';');
    ALTER TABLE [tour_design_request_agencies] DROP COLUMN [quote_child];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    DECLARE @var20 nvarchar(max);
    SELECT @var20 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_request_agencies]') AND [c].[name] = N'quote_infant');
    IF @var20 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_request_agencies] DROP CONSTRAINT ' + @var20 + ';');
    ALTER TABLE [tour_design_request_agencies] DROP COLUMN [quote_infant];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    DECLARE @var21 nvarchar(max);
    SELECT @var21 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_request_agencies]') AND [c].[name] = N'quote_note');
    IF @var21 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_request_agencies] DROP CONSTRAINT ' + @var21 + ';');
    ALTER TABLE [tour_design_request_agencies] DROP COLUMN [quote_note];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    DECLARE @var22 nvarchar(max);
    SELECT @var22 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_request_agencies]') AND [c].[name] = N'quoted_at');
    IF @var22 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_request_agencies] DROP CONSTRAINT ' + @var22 + ';');
    ALTER TABLE [tour_design_request_agencies] DROP COLUMN [quoted_at];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    DECLARE @var23 nvarchar(max);
    SELECT @var23 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_request_agencies]') AND [c].[name] = N'rejection_reason');
    IF @var23 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_request_agencies] DROP CONSTRAINT ' + @var23 + ';');
    ALTER TABLE [tour_design_request_agencies] DROP COLUMN [rejection_reason];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    EXEC sp_rename N'[tour_design_request_agencies].[tour_design_request_id]', N'request_id', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    EXEC sp_rename N'[tour_design_request_agencies].[IX_tour_design_request_agencies_tour_design_request_id_agency_id]', N'IX_tour_design_request_agencies_request_id_agency_id', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    ALTER TABLE [tour_design_request_agencies] ADD [is_host] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    ALTER TABLE [tour_design_request_agencies] ADD CONSTRAINT [FK_tour_design_request_agencies_tour_design_requests_request_id] FOREIGN KEY ([request_id]) REFERENCES [tour_design_requests] ([id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    EXEC(N'UPDATE a SET is_host=1 FROM tour_design_request_agencies a JOIN tour_design_requests r ON r.id=a.request_id AND r.agency_id=a.agency_id;
    INSERT INTO tour_design_request_agencies(request_id,agency_id,is_host,stage_area,status,assigned_at,responded_at)
    SELECT r.id,r.agency_id,1,N'''',CASE WHEN r.status=''in_progress'' THEN ''accepted'' ELSE COALESCE(r.status,''pending'') END,COALESCE(r.created_at,SYSUTCDATETIME()),r.responded_at
    FROM tour_design_requests r WHERE r.agency_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tour_design_request_agencies a WHERE a.request_id=r.id AND a.agency_id=r.agency_id);');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110123114_AlignCoHostInvitationAndAgencyOwnership'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261110123114_AlignCoHostInvitationAndAgencyOwnership', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    DROP INDEX [IX_booking_participants_booking_id_creation_key] ON [booking_participants];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    DROP INDEX [IX_booking_hotels_booking_id] ON [booking_hotels];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    ALTER TABLE [payment_requests] ADD [beneficiary_agency_id] nvarchar(36) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    ALTER TABLE [booking_restaurants] ADD [agency_id] nvarchar(36) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    ALTER TABLE [booking_hotels] ADD [agency_id] nvarchar(36) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    EXEC(N'
    UPDATE h SET agency_id=COALESCE((SELECT TOP(1) JSON_VALUE(x.value,''$.agencyId'') FROM tour_versions v
    CROSS APPLY OPENJSON(v.tour_snapshot,''$.configuration.timelines'') d CROSS APPLY OPENJSON(d.value,''$.accommodations'') x
    WHERE v.tour_id=b.tour_id AND v.version=b.tour_version AND JSON_VALUE(x.value,''$.hotelName'')=h.original_hotel_name),t.agency_id)
    FROM booking_hotels h JOIN bookings b ON b.id=h.booking_id JOIN tours t ON t.id=b.tour_id;
    UPDATE m SET agency_id=COALESCE((SELECT TOP(1) JSON_VALUE(x.value,''$.agencyId'') FROM tour_versions v
    CROSS APPLY OPENJSON(v.tour_snapshot,''$.configuration.timelines'') d CROSS APPLY OPENJSON(d.value,''$.meals'') x
    WHERE v.tour_id=b.tour_id AND v.version=b.tour_version AND TRY_CONVERT(int,JSON_VALUE(d.value,''$.dayNumber''))=bt.day_number
    AND JSON_VALUE(x.value,''$.mealType'')=m.meal_type AND JSON_VALUE(x.value,''$.restaurantName'')=m.original_restaurant_name),t.agency_id)
    FROM booking_restaurants m JOIN booking_timelines bt ON bt.id=m.booking_timeline_id JOIN bookings b ON b.id=bt.booking_id JOIN tours t ON t.id=b.tour_id;
    UPDATE p SET beneficiary_agency_id=COALESCE((SELECT TOP(1) a.agency_id FROM booking_agencies a WHERE a.booking_id=p.booking_id AND a.agency_id=p.created_by),t.agency_id)
    FROM payment_requests p JOIN bookings b ON b.id=p.booking_id JOIN tours t ON t.id=b.tour_id WHERE p.stage LIKE ''fee:%'';
    -- Convert legacy full-tour passenger rows only when the booked version has explicit Agency prices.
    SELECT p.id AS source_id,a.agency_id,CONVERT(decimal(12,2),JSON_VALUE(price.value,''$.pricePerGuest'')) AS stage_price
    INTO #stage_backfill FROM booking_participants p JOIN bookings b ON b.id=p.booking_id JOIN tours t ON t.id=b.tour_id
    JOIN booking_agencies a ON a.booking_id=b.id AND a.agency_id<>p.agency_id
    JOIN tour_versions v ON v.tour_id=b.tour_id AND v.version=b.tour_version
    CROSS APPLY OPENJSON(v.tour_snapshot,''$.configuration.agencyPricing'') ap CROSS APPLY OPENJSON(ap.value,''$.tiers'') price
    CROSS APPLY (SELECT DATEDIFF(year,p.date_of_birth,b.departure_date)-CASE WHEN DATEADD(year,DATEDIFF(year,p.date_of_birth,b.departure_date),p.date_of_birth)>b.departure_date THEN 1 ELSE 0 END AS age) ages
    WHERE p.is_primary=1 AND p.agency_id=t.agency_id AND JSON_VALUE(ap.value,''$.agencyId'')=a.agency_id
    AND ((p.date_of_birth IS NOT NULL AND ages.age>=COALESCE(TRY_CONVERT(int,JSON_VALUE(price.value,''$.minAge'')),0) AND ages.age<=COALESCE(TRY_CONVERT(int,JSON_VALUE(price.value,''$.maxAge'')),150))
    OR (p.date_of_birth IS NULL AND JSON_VALUE(price.value,''$.name'')=p.tier_name))
    AND NOT EXISTS(SELECT 1 FROM booking_participants old WHERE old.booking_id=b.id AND old.participant_index=p.participant_index AND old.agency_id=a.agency_id);
    IF EXISTS(SELECT 1 FROM #stage_backfill f JOIN booking_participants p ON p.id=f.source_id GROUP BY f.source_id,p.price HAVING SUM(f.stage_price)>p.price)
    THROW 51000, ''Legacy passenger price is below partner shares. Review allocation before migration.'',1;
    INSERT INTO booking_participants(booking_id,agency_id,participant_index,is_primary,creation_key,full_name,date_of_birth,gender,identity_card_number,note,tier_name,price,attendance_status,status,status_note,roommate_note,restaurant_note,created_at,updated_at)
    SELECT p.booking_id,f.agency_id,p.participant_index,0,p.creation_key,p.full_name,p.date_of_birth,p.gender,p.identity_card_number,p.note,p.tier_name,f.stage_price,''pending'',p.status,p.status_note,p.roommate_note,p.restaurant_note,p.created_at,p.updated_at
    FROM #stage_backfill f JOIN booking_participants p ON p.id=f.source_id;
    UPDATE p SET price=p.price-f.amount FROM booking_participants p JOIN (SELECT source_id,SUM(stage_price) AS amount FROM #stage_backfill GROUP BY source_id) f ON f.source_id=p.id;
    DROP TABLE #stage_backfill;
    ');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    CREATE INDEX [IX_payment_requests_booking_id_beneficiary_agency_id] ON [payment_requests] ([booking_id], [beneficiary_agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    CREATE INDEX [IX_booking_restaurants_agency_id] ON [booking_restaurants] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_booking_participants_booking_id_agency_id_creation_key] ON [booking_participants] ([booking_id], [agency_id], [creation_key]) WHERE [creation_key] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_participants_booking_id_participant_index_agency_id] ON [booking_participants] ([booking_id], [participant_index], [agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    CREATE INDEX [IX_booking_hotels_booking_id_agency_id] ON [booking_hotels] ([booking_id], [agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    ALTER TABLE [booking_hotels] ADD CONSTRAINT [FK_booking_hotels_booking_agencies_booking_id_agency_id] FOREIGN KEY ([booking_id], [agency_id]) REFERENCES [booking_agencies] ([booking_id], [agency_id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    ALTER TABLE [booking_restaurants] ADD CONSTRAINT [FK_booking_restaurants_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    ALTER TABLE [payment_requests] ADD CONSTRAINT [FK_payment_requests_booking_agencies_booking_id_beneficiary_agency_id] FOREIGN KEY ([booking_id], [beneficiary_agency_id]) REFERENCES [booking_agencies] ([booking_id], [agency_id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [business_profiles] ADD [bank_account_holder] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [business_profiles] ADD [bank_account_number] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [business_profiles] ADD [bank_account_updated_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [business_profiles] ADD [bank_name] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [auto_payout_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [fee_percent] decimal(5,2) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [payout_account_holder] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [payout_account_number] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [payout_attempts] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [payout_bank_name] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [payout_gateway_id] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [payout_method] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [payout_note] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [payout_reference] nvarchar(60) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [settled_by] nvarchar(36) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    ALTER TABLE [booking_agencies] ADD [tour_completed_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_booking_agencies_payout_reference] ON [booking_agencies] ([payout_reference]) WHERE [payout_reference] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110165015_AddAgencySettlementPayouts'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261110165015_AddAgencySettlementPayouts', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110194257_SeparateDesignDraftsFromTourVersions'
)
BEGIN
    ALTER TABLE [tours] ADD [configuration_data] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110194257_SeparateDesignDraftsFromTourVersions'
)
BEGIN
    ALTER TABLE [tours] ADD [has_draft_changes] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110194257_SeparateDesignDraftsFromTourVersions'
)
BEGIN
    ALTER TABLE [tours] ADD [revision] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110194257_SeparateDesignDraftsFromTourVersions'
)
BEGIN
    ALTER TABLE [bookings] ADD [tour_configuration_data] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110194257_SeparateDesignDraftsFromTourVersions'
)
BEGIN
    EXEC(N'UPDATE t SET revision = CASE WHEN ISNULL(t.version,1)>0 THEN ISNULL(t.version,1) ELSE 1 END,
      configuration_data = JSON_QUERY(v.tour_snapshot,''$.configuration'')
      FROM tours t OUTER APPLY (SELECT TOP 1 tour_snapshot FROM tour_versions v
        WHERE v.tour_id=t.id AND v.version=t.version ORDER BY v.id DESC) v;
    UPDATE b SET tour_configuration_data=JSON_QUERY(v.tour_snapshot,''$.configuration'')
      FROM bookings b JOIN tour_versions v ON v.tour_id=b.tour_id AND v.version=b.tour_version;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110194257_SeparateDesignDraftsFromTourVersions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261110194257_SeparateDesignDraftsFromTourVersions', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111115754_RemoveDesignRequestBusinessContacts'
)
BEGIN
    DECLARE @var24 nvarchar(max);
    SELECT @var24 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_requests]') AND [c].[name] = N'business_email');
    IF @var24 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_requests] DROP CONSTRAINT ' + @var24 + ';');
    ALTER TABLE [tour_design_requests] DROP COLUMN [business_email];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111115754_RemoveDesignRequestBusinessContacts'
)
BEGIN
    DECLARE @var25 nvarchar(max);
    SELECT @var25 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[tour_design_requests]') AND [c].[name] = N'business_phone');
    IF @var25 IS NOT NULL EXEC(N'ALTER TABLE [tour_design_requests] DROP CONSTRAINT ' + @var25 + ';');
    ALTER TABLE [tour_design_requests] DROP COLUMN [business_phone];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111115754_RemoveDesignRequestBusinessContacts'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261111115754_RemoveDesignRequestBusinessContacts', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111125921_VersionScopedAllianceAndDesignLifecycle'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [close_reason] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111125921_VersionScopedAllianceAndDesignLifecycle'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [closed_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111125921_VersionScopedAllianceAndDesignLifecycle'
)
BEGIN
    ALTER TABLE [tour_design_request_agencies] ADD [archived_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111125921_VersionScopedAllianceAndDesignLifecycle'
)
BEGIN
    CREATE TABLE [tour_version_agencies] (
        [id] int NOT NULL IDENTITY,
        [tour_version_id] int NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [is_host] bit NOT NULL,
        [status] varchar(20) NOT NULL,
        [stage_area] nvarchar(255) NOT NULL,
        [suggested_budget] decimal(12,2) NULL,
        [communication_notes] nvarchar(max) NULL,
        [assigned_at] datetime2 NOT NULL,
        [responded_at] datetime2 NULL,
        CONSTRAINT [PK_tour_version_agencies] PRIMARY KEY ([id]),
        CONSTRAINT [FK_tour_version_agencies_tour_versions_tour_version_id] FOREIGN KEY ([tour_version_id]) REFERENCES [tour_versions] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_tour_version_agencies_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111125921_VersionScopedAllianceAndDesignLifecycle'
)
BEGIN
    CREATE INDEX [IX_tour_version_agencies_agency_id] ON [tour_version_agencies] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111125921_VersionScopedAllianceAndDesignLifecycle'
)
BEGIN
    CREATE UNIQUE INDEX [IX_tour_version_agencies_tour_version_id_agency_id] ON [tour_version_agencies] ([tour_version_id], [agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111125921_VersionScopedAllianceAndDesignLifecycle'
)
BEGIN
    INSERT INTO tour_version_agencies
        (tour_version_id,agency_id,is_host,status,stage_area,assigned_at,responded_at)
    SELECT v.id,t.agency_id,1,'accepted',N'',COALESCE(v.created_at,SYSUTCDATETIME()),COALESCE(v.created_at,SYSUTCDATETIME())
    FROM tour_versions v JOIN tours t ON t.id=v.tour_id
    WHERE t.design_request_id IS NOT NULL AND t.agency_id IS NOT NULL;

    INSERT INTO tour_version_agencies
        (tour_version_id,agency_id,is_host,status,stage_area,suggested_budget,communication_notes,assigned_at,responded_at)
    SELECT v.id,j.company_id,0,COALESCE(j.status,'accepted'),COALESCE(j.segment,N''),j.budget,j.notes,
        COALESCE(TRY_CONVERT(datetime2,j.invited_at,127),v.created_at,SYSUTCDATETIME()),TRY_CONVERT(datetime2,j.responded_at,127)
    FROM tour_versions v JOIN tours t ON t.id=v.tour_id
    CROSS APPLY OPENJSON(CASE WHEN ISJSON(v.tour_snapshot)=1 THEN v.tour_snapshot ELSE N'{}' END,'$.configuration.coHosts')
    WITH (company_id nvarchar(36) '$.companyId',status varchar(20) '$.status',segment nvarchar(255) '$.assignedSegments',
        budget decimal(12,2) '$.estimatedBudgetPerGuest',notes nvarchar(max) '$.notes',invited_at nvarchar(50) '$.invitedAt',responded_at nvarchar(50) '$.respondedAt') j
    JOIN users u ON u.id=j.company_id
    WHERE t.design_request_id IS NOT NULL AND j.company_id<>t.agency_id
      AND NOT EXISTS (SELECT 1 FROM tour_version_agencies a WHERE a.tour_version_id=v.id AND a.agency_id=j.company_id);

    -- Pending invitations may not be in the saved JSON; attach them only to the current working version.
    INSERT INTO tour_version_agencies
        (tour_version_id,agency_id,is_host,status,stage_area,suggested_budget,communication_notes,assigned_at,responded_at)
    SELECT v.id,a.agency_id,a.is_host,a.status,a.stage_area,a.suggested_budget,a.communication_notes,a.assigned_at,a.responded_at
    FROM tours t JOIN tour_versions v ON v.tour_id=t.id AND v.version=t.version
    JOIN tour_design_request_agencies a ON a.request_id=t.design_request_id
    WHERE a.status<>'cancelled' AND NOT EXISTS
        (SELECT 1 FROM tour_version_agencies m WHERE m.tour_version_id=v.id AND m.agency_id=a.agency_id);

    UPDATE r SET status='booked' FROM tour_design_requests r
    WHERE r.status IN ('pending','in_progress') AND EXISTS (SELECT 1 FROM bookings b WHERE b.design_request_id=r.id);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111125921_VersionScopedAllianceAndDesignLifecycle'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261111125921_VersionScopedAllianceAndDesignLifecycle', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111155146_AddBookingFinancialChangesAndCredits'
)
BEGIN
    ALTER TABLE [payment_requests] ADD [credit_amount] decimal(19,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111155146_AddBookingFinancialChangesAndCredits'
)
BEGIN
    CREATE TABLE [booking_financial_changes] (
        [id] int NOT NULL IDENTITY,
        [booking_id] int NOT NULL,
        [agency_id] nvarchar(36) NOT NULL,
        [requested_by] nvarchar(36) NOT NULL,
        [request_key] uniqueidentifier NOT NULL,
        [amount] decimal(19,2) NOT NULL,
        [reason] nvarchar(240) NOT NULL,
        [status] nvarchar(20) NOT NULL,
        [created_at] datetime2 NOT NULL,
        [reviewed_by] nvarchar(36) NULL,
        [review_note] nvarchar(240) NULL,
        [reviewed_at] datetime2 NULL,
        [refund_request_id] int NULL,
        CONSTRAINT [PK_booking_financial_changes] PRIMARY KEY ([id]),
        CONSTRAINT [FK_booking_financial_changes_booking_agencies_booking_id_agency_id] FOREIGN KEY ([booking_id], [agency_id]) REFERENCES [booking_agencies] ([booking_id], [agency_id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_financial_changes_refund_requests_refund_request_id] FOREIGN KEY ([refund_request_id]) REFERENCES [refund_requests] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_booking_financial_changes_users_requested_by] FOREIGN KEY ([requested_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111155146_AddBookingFinancialChangesAndCredits'
)
BEGIN
    CREATE INDEX [IX_booking_financial_changes_booking_id_agency_id] ON [booking_financial_changes] ([booking_id], [agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111155146_AddBookingFinancialChangesAndCredits'
)
BEGIN
    CREATE UNIQUE INDEX [IX_booking_financial_changes_booking_id_request_key] ON [booking_financial_changes] ([booking_id], [request_key]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111155146_AddBookingFinancialChangesAndCredits'
)
BEGIN
    CREATE INDEX [IX_booking_financial_changes_refund_request_id] ON [booking_financial_changes] ([refund_request_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111155146_AddBookingFinancialChangesAndCredits'
)
BEGIN
    CREATE INDEX [IX_booking_financial_changes_requested_by] ON [booking_financial_changes] ([requested_by]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111155146_AddBookingFinancialChangesAndCredits'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261111155146_AddBookingFinancialChangesAndCredits', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111203546_AddChatBusinessContext'
)
BEGIN
    ALTER TABLE [chat_messages] ADD [context_data] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111203546_AddChatBusinessContext'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261111203546_AddChatBusinessContext', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112053115_AddBookingParticipantPhone'
)
BEGIN
    ALTER TABLE [booking_participants] ADD [phone_number] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112053115_AddBookingParticipantPhone'
)
BEGIN
    UPDATE p SET phone_number = phone.value
    FROM dbo.booking_participants AS p
    CROSS APPLY (SELECT REPLACE(COALESCE(p.note, N''), CHAR(13), N'') AS text) AS notes
    CROSS APPLY (SELECT CHARINDEX(NCHAR(10) + N'Điện thoại: ', NCHAR(10) + notes.text) AS position) AS marker
    CROSS APPLY (SELECT CASE WHEN marker.position > 0 THEN marker.position + LEN(N'Điện thoại: ') END AS start) AS part
    CROSS APPLY (SELECT LTRIM(RTRIM(SUBSTRING(notes.text, part.start,
        CHARINDEX(NCHAR(10), notes.text + NCHAR(10), part.start) - part.start))) AS value) AS phone
    WHERE p.phone_number IS NULL AND marker.position > 0 AND LEN(phone.value) BETWEEN 1 AND 30;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112053115_AddBookingParticipantPhone'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261112053115_AddBookingParticipantPhone', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084332_AddUserRefundBankAccount'
)
BEGIN
    ALTER TABLE [users] ADD [bank_account_holder] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084332_AddUserRefundBankAccount'
)
BEGIN
    ALTER TABLE [users] ADD [bank_account_number] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084332_AddUserRefundBankAccount'
)
BEGIN
    ALTER TABLE [users] ADD [bank_account_updated_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084332_AddUserRefundBankAccount'
)
BEGIN
    ALTER TABLE [users] ADD [bank_name] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084332_AddUserRefundBankAccount'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261112084332_AddUserRefundBankAccount', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084905_AddSupplementarySupplierRequests'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD [parent_request_id] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084905_AddSupplementarySupplierRequests'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD [participant_indices_json] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084905_AddSupplementarySupplierRequests'
)
BEGIN
    CREATE INDEX [IX_booking_supplier_requests_parent_request_id] ON [booking_supplier_requests] ([parent_request_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084905_AddSupplementarySupplierRequests'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD CONSTRAINT [FK_booking_supplier_requests_booking_supplier_requests_parent_request_id] FOREIGN KEY ([parent_request_id]) REFERENCES [booking_supplier_requests] ([id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112084905_AddSupplementarySupplierRequests'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261112084905_AddSupplementarySupplierRequests', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112110551_AllowPrivateSupplementSuppliers'
)
BEGIN
    DECLARE @var26 nvarchar(max);
    SELECT @var26 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[booking_supplier_requests]') AND [c].[name] = N'service_id');
    IF @var26 IS NOT NULL EXEC(N'ALTER TABLE [booking_supplier_requests] DROP CONSTRAINT ' + @var26 + ';');
    ALTER TABLE [booking_supplier_requests] ALTER COLUMN [service_id] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112110551_AllowPrivateSupplementSuppliers'
)
BEGIN
    DECLARE @var27 nvarchar(max);
    SELECT @var27 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[booking_supplier_requests]') AND [c].[name] = N'provider_id');
    IF @var27 IS NOT NULL EXEC(N'ALTER TABLE [booking_supplier_requests] DROP CONSTRAINT ' + @var27 + ';');
    ALTER TABLE [booking_supplier_requests] ALTER COLUMN [provider_id] nvarchar(36) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112110551_AllowPrivateSupplementSuppliers'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD [agency_supplier_id] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112110551_AllowPrivateSupplementSuppliers'
)
BEGIN
    CREATE INDEX [IX_booking_supplier_requests_agency_supplier_id] ON [booking_supplier_requests] ([agency_supplier_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112110551_AllowPrivateSupplementSuppliers'
)
BEGIN
    ALTER TABLE [booking_supplier_requests] ADD CONSTRAINT [FK_booking_supplier_requests_agency_suppliers_agency_supplier_id] FOREIGN KEY ([agency_supplier_id]) REFERENCES [agency_suppliers] ([id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261112110551_AllowPrivateSupplementSuppliers'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261112110551_AllowPrivateSupplementSuppliers', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113185613_AddCustomerProfileAddress'
)
BEGIN
    ALTER TABLE [users] ADD [address_line] nvarchar(255) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113185613_AddCustomerProfileAddress'
)
BEGIN
    ALTER TABLE [users] ADD [organization_name] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113185613_AddCustomerProfileAddress'
)
BEGIN
    ALTER TABLE [users] ADD [province_code] nvarchar(10) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113185613_AddCustomerProfileAddress'
)
BEGIN
    ALTER TABLE [users] ADD [province_name] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113185613_AddCustomerProfileAddress'
)
BEGIN
    ALTER TABLE [users] ADD [ward_code] nvarchar(10) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113185613_AddCustomerProfileAddress'
)
BEGIN
    ALTER TABLE [users] ADD [ward_name] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113185613_AddCustomerProfileAddress'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261113185613_AddCustomerProfileAddress', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    DROP INDEX [IX_complaints_customer_id] ON [complaints];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    ALTER TABLE [users] ADD [password_changed_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    DECLARE @var28 nvarchar(max);
    SELECT @var28 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[complaints]') AND [c].[name] = N'booking_id');
    IF @var28 IS NOT NULL EXEC(N'ALTER TABLE [complaints] DROP CONSTRAINT ' + @var28 + ';');
    ALTER TABLE [complaints] ALTER COLUMN [booking_id] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    DECLARE @var29 nvarchar(max);
    SELECT @var29 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[complaints]') AND [c].[name] = N'agency_id');
    IF @var29 IS NOT NULL EXEC(N'ALTER TABLE [complaints] DROP CONSTRAINT ' + @var29 + ';');
    ALTER TABLE [complaints] ALTER COLUMN [agency_id] nvarchar(36) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    ALTER TABLE [complaints] ADD [complaint_type] nvarchar(20) NOT NULL DEFAULT N'Trip';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    ALTER TABLE [complaints] ADD [reason_code] nvarchar(50) NOT NULL DEFAULT N'other';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    CREATE TABLE [password_reset_codes] (
        [id] int NOT NULL IDENTITY,
        [user_id] nvarchar(36) NOT NULL,
        [code_hash] nvarchar(64) NOT NULL,
        [expires_at] datetime2 NOT NULL,
        [failed_attempts] int NOT NULL,
        [used_at] datetime2 NULL,
        [created_at] datetime2 NOT NULL,
        CONSTRAINT [PK_password_reset_codes] PRIMARY KEY ([id]),
        CONSTRAINT [FK_password_reset_codes_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    CREATE INDEX [IX_complaints_customer_id_created_at] ON [complaints] ([customer_id], [created_at]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    CREATE INDEX [IX_password_reset_codes_user_id_created_at] ON [password_reset_codes] ([user_id], [created_at]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261114083604_AddComplaintTypesAndPasswordReset'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261114083604_AddComplaintTypesAndPasswordReset', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261117190000_AddGuideLocationCheckout'
)
BEGIN
    ALTER TABLE [booking_attraction_checkins] ADD [checked_out_at] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261117190000_AddGuideLocationCheckout'
)
BEGIN
    ALTER TABLE [booking_attraction_checkins] ADD [checkout_photo_proof_url] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261117190000_AddGuideLocationCheckout'
)
BEGIN
    ALTER TABLE [booking_attraction_checkins] ADD [checkout_notes] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261117190000_AddGuideLocationCheckout'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261117190000_AddGuideLocationCheckout', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119120000_AddAgencyContractTemplates'
)
BEGIN
    CREATE TABLE [agency_contract_templates] (
        [id] int NOT NULL IDENTITY,
        [agency_id] nvarchar(36) NOT NULL,
        [cancellation_tiers] nvarchar(max) NOT NULL,
        [cancellation_note] nvarchar(2000) NULL,
        [additional_terms] nvarchar(max) NULL,
        [created_at] datetime2 NOT NULL,
        [updated_at] datetime2 NOT NULL,
        CONSTRAINT [PK_agency_contract_templates] PRIMARY KEY ([id]),
        CONSTRAINT [FK_agency_contract_templates_users_agency_id] FOREIGN KEY ([agency_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119120000_AddAgencyContractTemplates'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_agency_contract_templates_agency_id] ON [agency_contract_templates] ([agency_id]) WHERE [agency_id] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119120000_AddAgencyContractTemplates'
)
BEGIN
    ALTER TABLE [bookings] ADD [contract_terms_snapshot] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119120000_AddAgencyContractTemplates'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261119120000_AddAgencyContractTemplates', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119122206_AddAgencyAiSubscription'
)
BEGIN
    ALTER TABLE [users] ADD [AgencyAiSubscribed] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119122206_AddAgencyAiSubscription'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261119122206_AddAgencyAiSubscription', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119140000_AddContractTemplateClauses'
)
BEGIN
    ALTER TABLE [agency_contract_templates] ADD [clauses] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119140000_AddContractTemplateClauses'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261119140000_AddContractTemplateClauses', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119180000_RemoveBookingIncidentStatus'
)
BEGIN
    DECLARE @var30 nvarchar(max);
    SELECT @var30 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[booking_incidents]') AND [c].[name] = N'status');
    IF @var30 IS NOT NULL EXEC(N'ALTER TABLE [booking_incidents] DROP CONSTRAINT ' + @var30 + ';');
    ALTER TABLE [booking_incidents] DROP COLUMN [status];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261119180000_RemoveBookingIncidentStatus'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261119180000_RemoveBookingIncidentStatus', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261120120000_AddNotificationDeliveryAndDevices'
)
BEGIN
    ALTER TABLE [workflow_notifications] ADD [DispatchedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261120120000_AddNotificationDeliveryAndDevices'
)
BEGIN
    ALTER TABLE [workflow_notifications] ADD [DispatchClaimedUntil] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261120120000_AddNotificationDeliveryAndDevices'
)
BEGIN
    ALTER TABLE [workflow_notifications] ADD [DispatchAttempts] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261120120000_AddNotificationDeliveryAndDevices'
)
BEGIN
    UPDATE [workflow_notifications] SET [DispatchedAt] = [CreatedAt] WHERE [DispatchedAt] IS NULL
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261120120000_AddNotificationDeliveryAndDevices'
)
BEGIN
    CREATE INDEX [IX_workflow_notifications_DispatchedAt_DispatchClaimedUntil] ON [workflow_notifications] ([DispatchedAt], [DispatchClaimedUntil]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261120120000_AddNotificationDeliveryAndDevices'
)
BEGIN
    CREATE TABLE [notification_device_tokens] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(36) NOT NULL,
        [Token] nvarchar(512) NOT NULL,
        [Platform] nvarchar(12) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastSeenAt] datetime2 NOT NULL,
        CONSTRAINT [PK_notification_device_tokens] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261120120000_AddNotificationDeliveryAndDevices'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_notification_device_tokens_Token] ON [notification_device_tokens] ([Token]) WHERE [Token] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261120120000_AddNotificationDeliveryAndDevices'
)
BEGIN
    CREATE INDEX [IX_notification_device_tokens_UserId_LastSeenAt] ON [notification_device_tokens] ([UserId], [LastSeenAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261120120000_AddNotificationDeliveryAndDevices'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261120120000_AddNotificationDeliveryAndDevices', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261122130000_AddNamedContractTemplates'
)
BEGIN
    DROP INDEX [IX_agency_contract_templates_agency_id] ON [agency_contract_templates];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261122130000_AddNamedContractTemplates'
)
BEGIN
    ALTER TABLE [agency_contract_templates] ADD [name] nvarchar(120) NOT NULL DEFAULT N'Mẫu hiện tại';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261122130000_AddNamedContractTemplates'
)
BEGIN
    ALTER TABLE [agency_contract_templates] ADD [is_active] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261122130000_AddNamedContractTemplates'
)
BEGIN
    UPDATE agency_contract_templates SET is_active = 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261122130000_AddNamedContractTemplates'
)
BEGIN
    CREATE INDEX [IX_agency_contract_templates_agency_id] ON [agency_contract_templates] ([agency_id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261122130000_AddNamedContractTemplates'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261122130000_AddNamedContractTemplates', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261124120000_AddDesignRequestDeparture'
)
BEGIN
    ALTER TABLE [tour_design_requests] ADD [departure_province_code] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261124120000_AddDesignRequestDeparture'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261124120000_AddDesignRequestDeparture', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261124130000_RemoveSubscriptionTables'
)
BEGIN
    DROP TABLE [subscription_payment_history];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261124130000_RemoveSubscriptionTables'
)
BEGIN
    DROP TABLE [agency_subscriptions];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261124130000_RemoveSubscriptionTables'
)
BEGIN
    DROP TABLE [subscription_plans];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261124130000_RemoveSubscriptionTables'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261124130000_RemoveSubscriptionTables', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125090000_AddTourTravelStyle'
)
BEGIN
    ALTER TABLE [tours] ADD [travel_style] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125090000_AddTourTravelStyle'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261125090000_AddTourTravelStyle', N'10.0.10');
END;

COMMIT;
GO

