using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "subscription_plans",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    slug = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    price_monthly = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    price_yearly = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    is_popular = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    sort_order = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true, defaultValue: "active"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscription_plans", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    email = table.Column<string>(type: "nvarchar(191)", maxLength: 191, nullable: false),
                    phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    password_hash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    role = table.Column<string>(type: "nvarchar(50)", nullable: false, defaultValue: "User"),
                    avatar = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    is_verified = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Active"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                    table.ForeignKey(
                        name: "FK_users_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "agency_subscriptions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    plan_id = table.Column<int>(type: "int", nullable: false),
                    billing_cycle = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "monthly"),
                    price = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    start_date = table.Column<DateTime>(type: "date", nullable: false),
                    end_date = table.Column<DateTime>(type: "date", nullable: false),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Active"),
                    auto_renew = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    cancelled_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    cancel_reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    last_payment_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    next_payment_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_agency_subscriptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_agency_subscriptions_subscription_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "subscription_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_agency_subscriptions_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "business_profiles",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    business_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    tax_code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    business_address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    business_license_url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    rejection_reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    approved_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_business_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_business_profiles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "chat_conversations",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_one_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    user_two_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    last_message_content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    last_message_sender_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    last_message_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "active"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_conversations", x => x.id);
                    table.ForeignKey(
                        name: "FK_chat_conversations_users_last_message_sender_id",
                        column: x => x.last_message_sender_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_chat_conversations_users_user_one_id",
                        column: x => x.user_one_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_chat_conversations_users_user_two_id",
                        column: x => x.user_two_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "services",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    provider_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    price = table.Column<decimal>(type: "decimal(12,2)", nullable: false, defaultValue: 0m),
                    price_from = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    price_to = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    capacity = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    star_rating = table.Column<int>(type: "int", nullable: true),
                    amenities = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    policies = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    province = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ward = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    street = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    latitude = table.Column<decimal>(type: "decimal(10,8)", nullable: true),
                    longitude = table.Column<decimal>(type: "decimal(11,8)", nullable: true),
                    thumbnail_url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    images = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    rating = table.Column<decimal>(type: "decimal(3,2)", nullable: true, defaultValue: 5m),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "Pending"),
                    rejection_reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_services", x => x.id);
                    table.ForeignKey(
                        name: "FK_services_users_provider_id",
                        column: x => x.provider_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "system_bank_accounts",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    bank_name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    bank_code = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    account_number = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    account_holder = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    branch = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    is_default = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true, defaultValue: "ACTIVE"),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    updated_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_bank_accounts", x => x.id);
                    table.ForeignKey(
                        name: "FK_system_bank_accounts_users_updated_by",
                        column: x => x.updated_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "system_commission_configs",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    commission_rate = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    applied_from = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    created_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_commission_configs", x => x.id);
                    table.ForeignKey(
                        name: "FK_system_commission_configs_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tour_design_requests",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    contact_name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    contact_email = table.Column<string>(type: "nvarchar(191)", maxLength: 191, nullable: false),
                    contact_phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    destination = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    departure_date = table.Column<DateTime>(type: "date", nullable: false),
                    return_date = table.Column<DateTime>(type: "date", nullable: true),
                    number_of_participants = table.Column<int>(type: "int", nullable: true),
                    budget_per_person = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    hotel_rating_requirement = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    special_requirements = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true, defaultValue: "Pending"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_design_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_design_requests_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_design_requests_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "subscription_payment_history",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    subscription_id = table.Column<int>(type: "int", nullable: false),
                    company_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    plan_id = table.Column<int>(type: "int", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    payment_method = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    transaction_code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "PENDING"),
                    billing_period_start = table.Column<DateTime>(type: "date", nullable: false),
                    billing_period_end = table.Column<DateTime>(type: "date", nullable: false),
                    paid_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    admin_note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscription_payment_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_subscription_payment_history_agency_subscriptions_subscription_id",
                        column: x => x.subscription_id,
                        principalTable: "agency_subscriptions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_subscription_payment_history_subscription_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "subscription_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_subscription_payment_history_users_company_id",
                        column: x => x.company_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "chat_messages",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    conversation_id = table.Column<int>(type: "int", nullable: false),
                    sender_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    content_type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "text"),
                    is_read = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    read_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    reply_to_message_id = table.Column<int>(type: "int", nullable: true),
                    is_edited = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_chat_messages_chat_conversations_conversation_id",
                        column: x => x.conversation_id,
                        principalTable: "chat_conversations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_chat_messages_chat_messages_reply_to_message_id",
                        column: x => x.reply_to_message_id,
                        principalTable: "chat_messages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_chat_messages_users_sender_id",
                        column: x => x.sender_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tour_design_request_agencies",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    request_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    is_host = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    stage_area = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    suggested_budget = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    communication_notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true, defaultValue: "PENDING"),
                    assigned_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    responded_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_design_request_agencies", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_design_request_agencies_tour_design_requests_request_id",
                        column: x => x.request_id,
                        principalTable: "tour_design_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_design_request_agencies_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tours",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    tour_code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    location = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    departure_location = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    duration_tour = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    operation_period = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    duration_days = table.Column<int>(type: "int", nullable: true),
                    duration_nights = table.Column<int>(type: "int", nullable: true),
                    baseprice = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    min_participants = table.Column<int>(type: "int", nullable: true),
                    max_participants = table.Column<int>(type: "int", nullable: true),
                    highlights = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    inclusions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    exclusions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    policies = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    message = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    thumbnail_urls = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    image_urls = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    visibility = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    is_request = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    version = table.Column<int>(type: "int", nullable: true, defaultValue: 1),
                    change_note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    design_request_id = table.Column<int>(type: "int", nullable: true),
                    is_shared_to_customer = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    is_ai_generated = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tours", x => x.id);
                    table.ForeignKey(
                        name: "FK_tours_tour_design_requests_design_request_id",
                        column: x => x.design_request_id,
                        principalTable: "tour_design_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tours_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "chat_attachments",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    message_id = table.Column<int>(type: "int", nullable: false),
                    file_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    file_url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    file_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    file_size = table.Column<int>(type: "int", nullable: true),
                    thumbnail_url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_attachments", x => x.id);
                    table.ForeignKey(
                        name: "FK_chat_attachments_chat_messages_message_id",
                        column: x => x.message_id,
                        principalTable: "chat_messages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "bookings",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    customer_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    tour_id = table.Column<int>(type: "int", nullable: true),
                    design_request_id = table.Column<int>(type: "int", nullable: true),
                    departure_date = table.Column<DateTime>(type: "date", nullable: false),
                    contact_full_name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    contact_phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    contact_email = table.Column<string>(type: "nvarchar(191)", maxLength: 191, nullable: false),
                    contact_note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    payment_status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "Unpaid"),
                    has_customization = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    original_total_price = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    total_price = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true, defaultValue: "Pending"),
                    cancel_reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    cancelled_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bookings", x => x.id);
                    table.ForeignKey(
                        name: "FK_bookings_tour_design_requests_design_request_id",
                        column: x => x.design_request_id,
                        principalTable: "tour_design_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_tours_tour_id",
                        column: x => x.tour_id,
                        principalTable: "tours",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_users_customer_id",
                        column: x => x.customer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tour_hotels",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tour_id = table.Column<int>(type: "int", nullable: false),
                    service_id = table.Column<int>(type: "int", nullable: true),
                    destination_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    hotel_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    star_rating = table.Column<int>(type: "int", nullable: true, defaultValue: 3),
                    nights_count = table.Column<int>(type: "int", nullable: true, defaultValue: 1),
                    is_default = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    price_difference = table.Column<decimal>(type: "decimal(12,2)", nullable: true, defaultValue: 0m),
                    address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_hotels", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_hotels_services_service_id",
                        column: x => x.service_id,
                        principalTable: "services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_hotels_tours_tour_id",
                        column: x => x.tour_id,
                        principalTable: "tours",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_hotels_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tour_pricing_tiers",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tour_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    tier_name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    min_age = table.Column<int>(type: "int", nullable: true),
                    max_age = table.Column<int>(type: "int", nullable: true),
                    price = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    display_order = table.Column<int>(type: "int", nullable: true, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_pricing_tiers", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_pricing_tiers_tours_tour_id",
                        column: x => x.tour_id,
                        principalTable: "tours",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_pricing_tiers_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tour_timeline",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tour_id = table.Column<int>(type: "int", nullable: false),
                    day_number = table.Column<int>(type: "int", nullable: false),
                    title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_timeline", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_timeline_tours_tour_id",
                        column: x => x.tour_id,
                        principalTable: "tours",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tour_versions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tour_id = table.Column<int>(type: "int", nullable: false),
                    version = table.Column<int>(type: "int", nullable: false),
                    change_note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    price = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    tour_snapshot = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    created_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_versions_tours_tour_id",
                        column: x => x.tour_id,
                        principalTable: "tours",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_versions_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_agencies",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    is_host = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    original_amount = table.Column<decimal>(type: "decimal(12,2)", nullable: true, defaultValue: 0m),
                    final_amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false, defaultValue: 0m),
                    platform_fee = table.Column<decimal>(type: "decimal(12,2)", nullable: true, defaultValue: 0m),
                    net_payout = table.Column<decimal>(type: "decimal(12,2)", nullable: true, defaultValue: 0m),
                    settlement_status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "Unpaid"),
                    payout_transferred_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    bank_reference_code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_agencies", x => x.id);
                    table.UniqueConstraint("AK_booking_agencies_booking_id_agency_id", x => new { x.booking_id, x.agency_id });
                    table.ForeignKey(
                        name: "FK_booking_agencies_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_agencies_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_hotels",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    service_id = table.Column<int>(type: "int", nullable: true),
                    destination = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    date_from = table.Column<DateTime>(type: "datetime2", nullable: true),
                    date_to = table.Column<DateTime>(type: "datetime2", nullable: true),
                    original_hotel_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    original_stars = table.Column<int>(type: "int", nullable: true, defaultValue: 5),
                    customized_hotel_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    customized_stars = table.Column<int>(type: "int", nullable: true),
                    provider_response = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    nights_count = table.Column<int>(type: "int", nullable: true, defaultValue: 1),
                    price_difference = table.Column<decimal>(type: "decimal(12,2)", nullable: true, defaultValue: 0m),
                    is_customized = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "approved"),
                    total_price = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_hotels", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_hotels_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_hotels_services_service_id",
                        column: x => x.service_id,
                        principalTable: "services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_timelines",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    day_number = table.Column<int>(type: "int", nullable: false),
                    title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_timelines", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_timelines_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "complaints",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    customer_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    subject = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    evidence_urls = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    agency_response = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    agency_responded_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    admin_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    admin_notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "Pending"),
                    resolved_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    deleted_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_complaints", x => x.id);
                    table.ForeignKey(
                        name: "FK_complaints_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_complaints_users_admin_id",
                        column: x => x.admin_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_complaints_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_complaints_users_customer_id",
                        column: x => x.customer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "feedbacks",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    customer_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    overall_rating = table.Column<int>(type: "int", nullable: false),
                    overall_comment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    agency_rating = table.Column<int>(type: "int", nullable: false),
                    agency_comment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    images = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    agency_reply = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    replied_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "Visible"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feedbacks", x => x.id);
                    table.ForeignKey(
                        name: "FK_feedbacks_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_feedbacks_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_feedbacks_users_customer_id",
                        column: x => x.customer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payment_requests",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    due_date = table.Column<DateTime>(type: "date", nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "Pending"),
                    created_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    paid_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_requests", x => x.id);
                    table.UniqueConstraint("AK_payment_requests_booking_id_id", x => new { x.booking_id, x.id });
                    table.ForeignKey(
                        name: "FK_payment_requests_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payment_requests_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "refund_requests",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    requested_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    reason = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    reason_detail = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    evidence_urls = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    original_paid_amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    approved_refund_amount = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    refund_fee = table.Column<decimal>(type: "decimal(12,2)", nullable: true, defaultValue: 0m),
                    refund_bank_name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    refund_account_number = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    refund_account_holder = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Pending"),
                    reviewed_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    review_note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    rejection_reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    reviewed_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    completed_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refund_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_refund_requests_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_refund_requests_users_requested_by",
                        column: x => x.requested_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_refund_requests_users_reviewed_by",
                        column: x => x.reviewed_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tour_restaurants",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    service_id = table.Column<int>(type: "int", nullable: true),
                    tour_timeline_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    time = table.Column<DateTime>(type: "datetime2", nullable: true),
                    meal_type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    restaurant_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_default = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    price_difference = table.Column<decimal>(type: "decimal(12,2)", nullable: false, defaultValue: 0m),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_restaurants", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_restaurants_services_service_id",
                        column: x => x.service_id,
                        principalTable: "services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_restaurants_tour_timeline_tour_timeline_id",
                        column: x => x.tour_timeline_id,
                        principalTable: "tour_timeline",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_restaurants_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tourist_locations",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tour_timeline_id = table.Column<int>(type: "int", nullable: false),
                    time = table.Column<DateTime>(type: "datetime2", nullable: true),
                    name_location = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tourist_locations", x => x.id);
                    table.ForeignKey(
                        name: "FK_tourist_locations_tour_timeline_tour_timeline_id",
                        column: x => x.tour_timeline_id,
                        principalTable: "tour_timeline",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tourist_locations_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_assigned_guides",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    guide_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    role = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true, defaultValue: "lead_guide"),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    assigned_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_assigned_guides", x => x.id);
                    table.UniqueConstraint("AK_booking_assigned_guides_booking_id_agency_id_guide_id", x => new { x.booking_id, x.agency_id, x.guide_id });
                    table.ForeignKey(
                        name: "FK_booking_assigned_guides_booking_agencies_booking_id_agency_id",
                        columns: x => new { x.booking_id, x.agency_id },
                        principalTable: "booking_agencies",
                        principalColumns: new[] { "booking_id", "agency_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_assigned_guides_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_assigned_guides_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_assigned_guides_users_guide_id",
                        column: x => x.guide_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_incidents",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    reported_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    incident_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true, defaultValue: "OTHER"),
                    title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "Reported"),
                    evidence_urls = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    resolved_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_incidents", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_incidents_booking_agencies_booking_id_agency_id",
                        columns: x => new { x.booking_id, x.agency_id },
                        principalTable: "booking_agencies",
                        principalColumns: new[] { "booking_id", "agency_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_incidents_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_incidents_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_incidents_users_reported_by",
                        column: x => x.reported_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_price_adjustments",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    adjusted_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    previous_total_price = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    adjustment_amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    new_total_price = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_price_adjustments", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_price_adjustments_booking_agencies_booking_id_agency_id",
                        columns: x => new { x.booking_id, x.agency_id },
                        principalTable: "booking_agencies",
                        principalColumns: new[] { "booking_id", "agency_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_price_adjustments_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_price_adjustments_users_adjusted_by",
                        column: x => x.adjusted_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_price_adjustments_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_locations",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_timeline_id = table.Column<int>(type: "int", nullable: false),
                    time = table.Column<DateTime>(type: "datetime2", nullable: true),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    original_location_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    customized_location_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    is_customized = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    customer_note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    price_difference = table.Column<decimal>(type: "decimal(12,2)", nullable: true, defaultValue: 0m),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "approved"),
                    attendance_status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    guide_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_locations", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_locations_booking_timelines_booking_timeline_id",
                        column: x => x.booking_timeline_id,
                        principalTable: "booking_timelines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_locations_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_locations_users_guide_id",
                        column: x => x.guide_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_restaurants",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    service_id = table.Column<int>(type: "int", nullable: true),
                    booking_timeline_id = table.Column<int>(type: "int", nullable: false),
                    date_service = table.Column<DateTime>(type: "date", nullable: true),
                    time = table.Column<DateTime>(type: "datetime2", nullable: true),
                    meal_type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    original_restaurant_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    customized_restaurant_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    price_difference = table.Column<decimal>(type: "decimal(12,2)", nullable: true, defaultValue: 0m),
                    is_customized = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    total_price = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    provider_response = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "approved"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_restaurants", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_restaurants_booking_timelines_booking_timeline_id",
                        column: x => x.booking_timeline_id,
                        principalTable: "booking_timelines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_restaurants_services_service_id",
                        column: x => x.service_id,
                        principalTable: "services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payment_transactions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    payment_request_id = table.Column<int>(type: "int", nullable: true),
                    transaction_code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    payment_method = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "Success"),
                    payer_name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    payment_proof_url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    paid_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_transactions", x => x.id);
                    table.ForeignKey(
                        name: "FK_payment_transactions_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payment_transactions_payment_requests_booking_id_payment_request_id",
                        columns: x => new { x.booking_id, x.payment_request_id },
                        principalTable: "payment_requests",
                        principalColumns: new[] { "booking_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payment_transactions_payment_requests_payment_request_id",
                        column: x => x.payment_request_id,
                        principalTable: "payment_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_participants",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    participant_index = table.Column<int>(type: "int", nullable: false),
                    is_primary = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    full_name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    date_of_birth = table.Column<DateTime>(type: "date", nullable: true),
                    gender = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    identity_card_number = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    tier_name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    price = table.Column<decimal>(type: "decimal(12,2)", nullable: false, defaultValue: 0m),
                    assigned_guide_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    attendance_status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true, defaultValue: "Pending"),
                    checked_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    checked_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true, defaultValue: "ACTIVE"),
                    status_note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    roommate_note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    restaurant_note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_participants", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_participants_booking_agencies_booking_id_agency_id",
                        columns: x => new { x.booking_id, x.agency_id },
                        principalTable: "booking_agencies",
                        principalColumns: new[] { "booking_id", "agency_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_participants_booking_assigned_guides_booking_id_agency_id_assigned_guide_id",
                        columns: x => new { x.booking_id, x.agency_id, x.assigned_guide_id },
                        principalTable: "booking_assigned_guides",
                        principalColumns: new[] { "booking_id", "agency_id", "guide_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_participants_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_participants_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_participants_users_assigned_guide_id",
                        column: x => x.assigned_guide_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_participants_users_checked_by",
                        column: x => x.checked_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_attraction_checkins",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_timeline_attraction_id = table.Column<int>(type: "int", nullable: false),
                    guide_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    attendance_status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true, defaultValue: "Pending"),
                    checked_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    photo_proof_url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_attraction_checkins", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_attraction_checkins_booking_locations_booking_timeline_attraction_id",
                        column: x => x.booking_timeline_attraction_id,
                        principalTable: "booking_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_attraction_checkins_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_attraction_checkins_users_guide_id",
                        column: x => x.guide_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_agency_subscriptions_agency_id",
                table: "agency_subscriptions",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_agency_subscriptions_plan_id",
                table: "agency_subscriptions",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_agencies_agency_id",
                table: "booking_agencies",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_agencies_booking_id",
                table: "booking_agencies",
                column: "booking_id",
                unique: true,
                filter: "[is_host] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_booking_agencies_booking_id_agency_id",
                table: "booking_agencies",
                columns: new[] { "booking_id", "agency_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_assigned_guides_agency_id",
                table: "booking_assigned_guides",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_assigned_guides_booking_id_agency_id_guide_id",
                table: "booking_assigned_guides",
                columns: new[] { "booking_id", "agency_id", "guide_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_assigned_guides_booking_id_guide_id",
                table: "booking_assigned_guides",
                columns: new[] { "booking_id", "guide_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_assigned_guides_guide_id",
                table: "booking_assigned_guides",
                column: "guide_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_attraction_checkins_agency_id",
                table: "booking_attraction_checkins",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_attraction_checkins_booking_timeline_attraction_id_guide_id",
                table: "booking_attraction_checkins",
                columns: new[] { "booking_timeline_attraction_id", "guide_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_attraction_checkins_guide_id",
                table: "booking_attraction_checkins",
                column: "guide_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_hotels_booking_id",
                table: "booking_hotels",
                column: "booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_hotels_service_id",
                table: "booking_hotels",
                column: "service_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_incidents_agency_id",
                table: "booking_incidents",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_incidents_booking_id_agency_id",
                table: "booking_incidents",
                columns: new[] { "booking_id", "agency_id" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_incidents_reported_by",
                table: "booking_incidents",
                column: "reported_by");

            migrationBuilder.CreateIndex(
                name: "IX_booking_locations_agency_id",
                table: "booking_locations",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_locations_booking_timeline_id",
                table: "booking_locations",
                column: "booking_timeline_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_locations_guide_id",
                table: "booking_locations",
                column: "guide_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_agency_id",
                table: "booking_participants",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_assigned_guide_id",
                table: "booking_participants",
                column: "assigned_guide_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_booking_id_agency_id_assigned_guide_id",
                table: "booking_participants",
                columns: new[] { "booking_id", "agency_id", "assigned_guide_id" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_booking_id_agency_id_participant_index",
                table: "booking_participants",
                columns: new[] { "booking_id", "agency_id", "participant_index" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_booking_id_participant_index",
                table: "booking_participants",
                columns: new[] { "booking_id", "participant_index" },
                unique: true,
                filter: "[is_primary] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_checked_by",
                table: "booking_participants",
                column: "checked_by");

            migrationBuilder.CreateIndex(
                name: "IX_booking_price_adjustments_adjusted_by",
                table: "booking_price_adjustments",
                column: "adjusted_by");

            migrationBuilder.CreateIndex(
                name: "IX_booking_price_adjustments_agency_id",
                table: "booking_price_adjustments",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_price_adjustments_booking_id_agency_id",
                table: "booking_price_adjustments",
                columns: new[] { "booking_id", "agency_id" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_restaurants_booking_timeline_id",
                table: "booking_restaurants",
                column: "booking_timeline_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_restaurants_service_id",
                table: "booking_restaurants",
                column: "service_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_timelines_booking_id_day_number",
                table: "booking_timelines",
                columns: new[] { "booking_id", "day_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bookings_booking_code",
                table: "bookings",
                column: "booking_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bookings_customer_id",
                table: "bookings",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_design_request_id",
                table: "bookings",
                column: "design_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_tour_id",
                table: "bookings",
                column: "tour_id");

            migrationBuilder.CreateIndex(
                name: "IX_business_profiles_user_id",
                table: "business_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chat_attachments_message_id",
                table: "chat_attachments",
                column: "message_id");

            migrationBuilder.CreateIndex(
                name: "IX_chat_conversations_last_message_sender_id",
                table: "chat_conversations",
                column: "last_message_sender_id");

            migrationBuilder.CreateIndex(
                name: "IX_chat_conversations_user_one_id_user_two_id",
                table: "chat_conversations",
                columns: new[] { "user_one_id", "user_two_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chat_conversations_user_two_id",
                table: "chat_conversations",
                column: "user_two_id");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_conversation_id",
                table: "chat_messages",
                column: "conversation_id");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_reply_to_message_id",
                table: "chat_messages",
                column: "reply_to_message_id");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_sender_id",
                table: "chat_messages",
                column: "sender_id");

            migrationBuilder.CreateIndex(
                name: "IX_complaints_admin_id",
                table: "complaints",
                column: "admin_id");

            migrationBuilder.CreateIndex(
                name: "IX_complaints_agency_id",
                table: "complaints",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_complaints_booking_id",
                table: "complaints",
                column: "booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_complaints_customer_id",
                table: "complaints",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_feedbacks_agency_id",
                table: "feedbacks",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_feedbacks_booking_id",
                table: "feedbacks",
                column: "booking_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_feedbacks_customer_id",
                table: "feedbacks",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_requests_booking_id_id",
                table: "payment_requests",
                columns: new[] { "booking_id", "id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_requests_created_by",
                table: "payment_requests",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_booking_id_payment_request_id",
                table: "payment_transactions",
                columns: new[] { "booking_id", "payment_request_id" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_payment_request_id",
                table: "payment_transactions",
                column: "payment_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_transaction_code",
                table: "payment_transactions",
                column: "transaction_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_refund_requests_booking_id",
                table: "refund_requests",
                column: "booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_refund_requests_requested_by",
                table: "refund_requests",
                column: "requested_by");

            migrationBuilder.CreateIndex(
                name: "IX_refund_requests_reviewed_by",
                table: "refund_requests",
                column: "reviewed_by");

            migrationBuilder.CreateIndex(
                name: "IX_services_id_provider_id",
                table: "services",
                columns: new[] { "id", "provider_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_services_provider_id",
                table: "services",
                column: "provider_id");

            migrationBuilder.CreateIndex(
                name: "IX_subscription_payment_history_company_id",
                table: "subscription_payment_history",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_subscription_payment_history_plan_id",
                table: "subscription_payment_history",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_subscription_payment_history_subscription_id",
                table: "subscription_payment_history",
                column: "subscription_id");

            migrationBuilder.CreateIndex(
                name: "IX_subscription_plans_slug",
                table: "subscription_plans",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_system_bank_accounts_updated_by",
                table: "system_bank_accounts",
                column: "updated_by");

            migrationBuilder.CreateIndex(
                name: "IX_system_commission_configs_created_by",
                table: "system_commission_configs",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_request_agencies_agency_id",
                table: "tour_design_request_agencies",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_request_agencies_request_id",
                table: "tour_design_request_agencies",
                column: "request_id",
                unique: true,
                filter: "[is_host] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_request_agencies_request_id_agency_id",
                table: "tour_design_request_agencies",
                columns: new[] { "request_id", "agency_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_requests_agency_id",
                table: "tour_design_requests",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_requests_user_id",
                table: "tour_design_requests",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_hotels_agency_id",
                table: "tour_hotels",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_hotels_service_id",
                table: "tour_hotels",
                column: "service_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_hotels_tour_id",
                table: "tour_hotels",
                column: "tour_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_pricing_tiers_agency_id",
                table: "tour_pricing_tiers",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_pricing_tiers_tour_id",
                table: "tour_pricing_tiers",
                column: "tour_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_restaurants_agency_id",
                table: "tour_restaurants",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_restaurants_service_id",
                table: "tour_restaurants",
                column: "service_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_restaurants_tour_timeline_id",
                table: "tour_restaurants",
                column: "tour_timeline_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_timeline_tour_id_day_number",
                table: "tour_timeline",
                columns: new[] { "tour_id", "day_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tour_versions_created_by",
                table: "tour_versions",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_tour_versions_tour_id_id",
                table: "tour_versions",
                columns: new[] { "tour_id", "id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tour_versions_tour_id_version",
                table: "tour_versions",
                columns: new[] { "tour_id", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tourist_locations_agency_id",
                table: "tourist_locations",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tourist_locations_tour_timeline_id",
                table: "tourist_locations",
                column: "tour_timeline_id");

            migrationBuilder.CreateIndex(
                name: "IX_tours_agency_id",
                table: "tours",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tours_design_request_id",
                table: "tours",
                column: "design_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_tours_tour_code",
                table: "tours",
                column: "tour_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_agency_id",
                table: "users",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_attraction_checkins");

            migrationBuilder.DropTable(
                name: "booking_hotels");

            migrationBuilder.DropTable(
                name: "booking_incidents");

            migrationBuilder.DropTable(
                name: "booking_participants");

            migrationBuilder.DropTable(
                name: "booking_price_adjustments");

            migrationBuilder.DropTable(
                name: "booking_restaurants");

            migrationBuilder.DropTable(
                name: "business_profiles");

            migrationBuilder.DropTable(
                name: "chat_attachments");

            migrationBuilder.DropTable(
                name: "complaints");

            migrationBuilder.DropTable(
                name: "feedbacks");

            migrationBuilder.DropTable(
                name: "payment_transactions");

            migrationBuilder.DropTable(
                name: "refund_requests");

            migrationBuilder.DropTable(
                name: "subscription_payment_history");

            migrationBuilder.DropTable(
                name: "system_bank_accounts");

            migrationBuilder.DropTable(
                name: "system_commission_configs");

            migrationBuilder.DropTable(
                name: "tour_design_request_agencies");

            migrationBuilder.DropTable(
                name: "tour_hotels");

            migrationBuilder.DropTable(
                name: "tour_pricing_tiers");

            migrationBuilder.DropTable(
                name: "tour_restaurants");

            migrationBuilder.DropTable(
                name: "tour_versions");

            migrationBuilder.DropTable(
                name: "tourist_locations");

            migrationBuilder.DropTable(
                name: "booking_locations");

            migrationBuilder.DropTable(
                name: "booking_assigned_guides");

            migrationBuilder.DropTable(
                name: "chat_messages");

            migrationBuilder.DropTable(
                name: "payment_requests");

            migrationBuilder.DropTable(
                name: "agency_subscriptions");

            migrationBuilder.DropTable(
                name: "services");

            migrationBuilder.DropTable(
                name: "tour_timeline");

            migrationBuilder.DropTable(
                name: "booking_timelines");

            migrationBuilder.DropTable(
                name: "booking_agencies");

            migrationBuilder.DropTable(
                name: "chat_conversations");

            migrationBuilder.DropTable(
                name: "subscription_plans");

            migrationBuilder.DropTable(
                name: "bookings");

            migrationBuilder.DropTable(
                name: "tours");

            migrationBuilder.DropTable(
                name: "tour_design_requests");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
