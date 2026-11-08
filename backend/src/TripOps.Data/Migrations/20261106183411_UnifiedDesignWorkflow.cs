using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class UnifiedDesignWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NumberOfGuests",
                table: "tour_versions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SharedToCustomer",
                table: "tour_versions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "AgreedAt",
                table: "tour_design_requests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AgreedTourId",
                table: "tour_design_requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AgreedTourVersion",
                table: "tour_design_requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Revision",
                table: "tour_design_requests",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SourceSnapshotJson",
                table: "tour_design_requests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SourceTourId",
                table: "tour_design_requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QuotationId",
                table: "payment_requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AcceptedQuotationId",
                table: "bookings",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AvailabilityConfirmed",
                table: "booking_supplier_requests",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "AvailableQuantity",
                table: "booking_supplier_requests",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HoldUntil",
                table: "booking_supplier_requests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PriceConfirmed",
                table: "booking_supplier_requests",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReplyDeadline",
                table: "booking_supplier_requests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponseHistoryJson",
                table: "booking_supplier_requests",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "NumberOfGuests",
                table: "booking_quotations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PaymentPolicy",
                table: "booking_quotations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PlanSnapshotJson",
                table: "booking_quotations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ValidUntil",
                table: "booking_quotations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WorkflowNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RequestId = table.Column<int>(type: "int", nullable: true),
                    BookingId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowNotifications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowNotifications_UserId_CreatedAt",
                table: "WorkflowNotifications",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkflowNotifications");

            migrationBuilder.DropColumn(
                name: "NumberOfGuests",
                table: "tour_versions");

            migrationBuilder.DropColumn(
                name: "SharedToCustomer",
                table: "tour_versions");

            migrationBuilder.DropColumn(
                name: "AgreedAt",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "AgreedTourId",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "AgreedTourVersion",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "Revision",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "SourceSnapshotJson",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "SourceTourId",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "QuotationId",
                table: "payment_requests");

            migrationBuilder.DropColumn(
                name: "AcceptedQuotationId",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "AvailabilityConfirmed",
                table: "booking_supplier_requests");

            migrationBuilder.DropColumn(
                name: "AvailableQuantity",
                table: "booking_supplier_requests");

            migrationBuilder.DropColumn(
                name: "HoldUntil",
                table: "booking_supplier_requests");

            migrationBuilder.DropColumn(
                name: "PriceConfirmed",
                table: "booking_supplier_requests");

            migrationBuilder.DropColumn(
                name: "ReplyDeadline",
                table: "booking_supplier_requests");

            migrationBuilder.DropColumn(
                name: "ResponseHistoryJson",
                table: "booking_supplier_requests");

            migrationBuilder.DropColumn(
                name: "NumberOfGuests",
                table: "booking_quotations");

            migrationBuilder.DropColumn(
                name: "PaymentPolicy",
                table: "booking_quotations");

            migrationBuilder.DropColumn(
                name: "PlanSnapshotJson",
                table: "booking_quotations");

            migrationBuilder.DropColumn(
                name: "ValidUntil",
                table: "booking_quotations");
        }
    }
}
