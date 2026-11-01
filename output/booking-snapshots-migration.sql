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

