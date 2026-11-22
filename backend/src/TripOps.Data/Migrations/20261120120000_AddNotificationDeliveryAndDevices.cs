using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

/// <summary>Durable notification delivery cursor, retry lease and FCM device registration.</summary>
[DbContext(typeof(TripOpsDbContext))]
[Migration("20261120120000_AddNotificationDeliveryAndDevices")]
public partial class AddNotificationDeliveryAndDevices : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(name: "DispatchedAt", table: "workflow_notifications", type: "datetime2", nullable: true);
        migrationBuilder.AddColumn<DateTime>(name: "DispatchClaimedUntil", table: "workflow_notifications", type: "datetime2", nullable: true);
        migrationBuilder.AddColumn<int>(name: "DispatchAttempts", table: "workflow_notifications", type: "int", nullable: false, defaultValue: 0);
        // Historical notifications must remain in the inbox without causing a flood of pushes.
        migrationBuilder.Sql("UPDATE [workflow_notifications] SET [DispatchedAt] = [CreatedAt] WHERE [DispatchedAt] IS NULL");
        migrationBuilder.CreateIndex(
            name: "IX_workflow_notifications_DispatchedAt_DispatchClaimedUntil",
            table: "workflow_notifications",
            columns: new[] { "DispatchedAt", "DispatchClaimedUntil" });

        migrationBuilder.CreateTable(
            name: "notification_device_tokens",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                UserId = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                Token = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                Platform = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                LastSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false),
            },
            constraints: table => table.PrimaryKey("PK_notification_device_tokens", x => x.Id));
        migrationBuilder.CreateIndex(name: "IX_notification_device_tokens_Token", table: "notification_device_tokens",
            column: "Token", unique: true);
        migrationBuilder.CreateIndex(name: "IX_notification_device_tokens_UserId_LastSeenAt", table: "notification_device_tokens",
            columns: new[] { "UserId", "LastSeenAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "notification_device_tokens");
        migrationBuilder.DropIndex(name: "IX_workflow_notifications_DispatchedAt_DispatchClaimedUntil",
            table: "workflow_notifications");
        migrationBuilder.DropColumn(name: "DispatchedAt", table: "workflow_notifications");
        migrationBuilder.DropColumn(name: "DispatchClaimedUntil", table: "workflow_notifications");
        migrationBuilder.DropColumn(name: "DispatchAttempts", table: "workflow_notifications");
    }
}
