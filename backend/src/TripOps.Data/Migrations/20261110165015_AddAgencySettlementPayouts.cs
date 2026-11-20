using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAgencySettlementPayouts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "bank_account_holder",
                table: "business_profiles",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bank_account_number",
                table: "business_profiles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "bank_account_updated_at",
                table: "business_profiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bank_name",
                table: "business_profiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "auto_payout_at",
                table: "booking_agencies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "fee_percent",
                table: "booking_agencies",
                type: "decimal(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payout_account_holder",
                table: "booking_agencies",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payout_account_number",
                table: "booking_agencies",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "payout_attempts",
                table: "booking_agencies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "payout_bank_name",
                table: "booking_agencies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payout_gateway_id",
                table: "booking_agencies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payout_method",
                table: "booking_agencies",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payout_note",
                table: "booking_agencies",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payout_reference",
                table: "booking_agencies",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "settled_by",
                table: "booking_agencies",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "tour_completed_at",
                table: "booking_agencies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_agencies_payout_reference",
                table: "booking_agencies",
                column: "payout_reference",
                unique: true,
                filter: "[payout_reference] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_booking_agencies_payout_reference",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "bank_account_holder",
                table: "business_profiles");

            migrationBuilder.DropColumn(
                name: "bank_account_number",
                table: "business_profiles");

            migrationBuilder.DropColumn(
                name: "bank_account_updated_at",
                table: "business_profiles");

            migrationBuilder.DropColumn(
                name: "bank_name",
                table: "business_profiles");

            migrationBuilder.DropColumn(
                name: "auto_payout_at",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "fee_percent",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "payout_account_holder",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "payout_account_number",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "payout_attempts",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "payout_bank_name",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "payout_gateway_id",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "payout_method",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "payout_note",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "payout_reference",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "settled_by",
                table: "booking_agencies");

            migrationBuilder.DropColumn(
                name: "tour_completed_at",
                table: "booking_agencies");
        }
    }
}
