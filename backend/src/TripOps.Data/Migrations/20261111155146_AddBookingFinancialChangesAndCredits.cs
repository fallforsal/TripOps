using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingFinancialChangesAndCredits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "credit_amount",
                table: "payment_requests",
                type: "decimal(19,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "booking_financial_changes",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    requested_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    request_key = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(19,2)", nullable: false),
                    reason = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    reviewed_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    review_note = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    refund_request_id = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_financial_changes", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_financial_changes_booking_agencies_booking_id_agency_id",
                        columns: x => new { x.booking_id, x.agency_id },
                        principalTable: "booking_agencies",
                        principalColumns: new[] { "booking_id", "agency_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_financial_changes_refund_requests_refund_request_id",
                        column: x => x.refund_request_id,
                        principalTable: "refund_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_financial_changes_users_requested_by",
                        column: x => x.requested_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_booking_financial_changes_booking_id_agency_id",
                table: "booking_financial_changes",
                columns: new[] { "booking_id", "agency_id" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_financial_changes_booking_id_request_key",
                table: "booking_financial_changes",
                columns: new[] { "booking_id", "request_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_financial_changes_refund_request_id",
                table: "booking_financial_changes",
                column: "refund_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_financial_changes_requested_by",
                table: "booking_financial_changes",
                column: "requested_by");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_financial_changes");

            migrationBuilder.DropColumn(
                name: "credit_amount",
                table: "payment_requests");
        }
    }
}
