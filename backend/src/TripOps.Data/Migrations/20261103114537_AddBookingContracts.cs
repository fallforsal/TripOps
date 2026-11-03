using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingContracts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "booking_contracts",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    version = table.Column<int>(type: "int", nullable: false),
                    contract_no = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    total_amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    signed_file_name = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: true),
                    signed_file_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    signed_file_sha256 = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    signed_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    sign_method = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    reviewed_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    review_note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_contracts", x => x.id);
                    table.CheckConstraint("CK_booking_contracts_status", "[status] IN ('AwaitingSignature', 'Signed', 'Verified', 'ResignRequested', 'Superseded')");
                    table.ForeignKey(
                        name: "FK_booking_contracts_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_contracts_users_reviewed_by",
                        column: x => x.reviewed_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_booking_contracts_booking_id_version",
                table: "booking_contracts",
                columns: new[] { "booking_id", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_contracts_reviewed_by",
                table: "booking_contracts",
                column: "reviewed_by");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_contracts");
        }
    }
}
