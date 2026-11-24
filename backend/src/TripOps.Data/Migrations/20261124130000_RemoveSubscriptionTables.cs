using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

/// <summary>
/// Gói đăng ký (subscription) của Agency để dành cho giai đoạn sau: bỏ 3 bảng subscription_plans, agency_subscriptions,
/// subscription_payment_history khỏi database. Down tạo lại đúng cấu trúc cũ (không khôi phục dữ liệu).
/// </summary>
[DbContext(typeof(TripOpsDbContext))]
[Migration("20261124130000_RemoveSubscriptionTables")]
public partial class RemoveSubscriptionTables : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "subscription_payment_history");
        migrationBuilder.DropTable(name: "agency_subscriptions");
        migrationBuilder.DropTable(name: "subscription_plans");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "subscription_plans",
            columns: table => new
            {
                id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
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
            constraints: table => table.PrimaryKey("PK_subscription_plans", x => x.id));

        migrationBuilder.CreateTable(
            name: "agency_subscriptions",
            columns: table => new
            {
                id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
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
                table.ForeignKey("FK_agency_subscriptions_subscription_plans_plan_id", x => x.plan_id, "subscription_plans", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_agency_subscriptions_users_agency_id", x => x.agency_id, "users", "id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "subscription_payment_history",
            columns: table => new
            {
                id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
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
                table.ForeignKey("FK_subscription_payment_history_agency_subscriptions_subscription_id", x => x.subscription_id, "agency_subscriptions", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_subscription_payment_history_subscription_plans_plan_id", x => x.plan_id, "subscription_plans", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_subscription_payment_history_users_company_id", x => x.company_id, "users", "id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(name: "IX_subscription_plans_slug", table: "subscription_plans", column: "slug", unique: true);
        migrationBuilder.CreateIndex(name: "IX_agency_subscriptions_agency_id", table: "agency_subscriptions", column: "agency_id");
        migrationBuilder.CreateIndex(name: "IX_agency_subscriptions_plan_id", table: "agency_subscriptions", column: "plan_id");
        migrationBuilder.CreateIndex(name: "IX_subscription_payment_history_subscription_id", table: "subscription_payment_history", column: "subscription_id");
        migrationBuilder.CreateIndex(name: "IX_subscription_payment_history_company_id", table: "subscription_payment_history", column: "company_id");
        migrationBuilder.CreateIndex(name: "IX_subscription_payment_history_plan_id", table: "subscription_payment_history", column: "plan_id");
    }
}
