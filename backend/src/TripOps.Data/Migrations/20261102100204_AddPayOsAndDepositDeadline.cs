using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPayOsAndDepositDeadline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "checkout_url",
                table: "payment_transactions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "expires_at",
                table: "payment_transactions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "gateway_link_id",
                table: "payment_transactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "review_note",
                table: "payment_transactions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "due_at",
                table: "payment_requests",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "checkout_url",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "expires_at",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "gateway_link_id",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "review_note",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "due_at",
                table: "payment_requests");
        }
    }
}
