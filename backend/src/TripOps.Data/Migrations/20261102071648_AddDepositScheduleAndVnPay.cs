using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDepositScheduleAndVnPay : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "payment_transactions",
                type: "datetime2",
                nullable: true,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<string>(
                name: "gateway_response_code",
                table: "payment_transactions",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "gateway_transaction_no",
                table: "payment_transactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "stage",
                table: "payment_requests",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "UX_payment_requests_active_stage",
                table: "payment_requests",
                columns: new[] { "booking_id", "stage" },
                unique: true,
                filter: "[stage] IS NOT NULL AND [status] IN ('Pending', 'Overdue', 'Paid')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_payment_requests_stage",
                table: "payment_requests",
                sql: "[stage] IS NULL OR [stage] IN ('deposit', 'balance')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_payment_requests_active_stage",
                table: "payment_requests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_payment_requests_stage",
                table: "payment_requests");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "gateway_response_code",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "gateway_transaction_no",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "stage",
                table: "payment_requests");
        }
    }
}
