using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "booking_snapshots",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    version = table.Column<int>(type: "int", nullable: false),
                    snapshot_type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    snapshot_data = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    source_tour_version = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    created_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    accepted_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    accepted_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_snapshots", x => x.id);
                    table.CheckConstraint("CK_booking_snapshots_accepted", "([snapshot_type] = 'agreed' AND [accepted_at] IS NOT NULL AND [accepted_by] IS NOT NULL) OR ([snapshot_type] IN ('initial_request', 'proposal') AND [accepted_at] IS NULL AND [accepted_by] IS NULL)");
                    table.CheckConstraint("CK_booking_snapshots_data_isjson", "ISJSON([snapshot_data]) = 1");
                    table.CheckConstraint("CK_booking_snapshots_type", "[snapshot_type] IN ('initial_request', 'proposal', 'agreed')");
                    table.CheckConstraint("CK_booking_snapshots_version", "[version] > 0");
                    table.ForeignKey(
                        name: "FK_booking_snapshots_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_snapshots_users_accepted_by",
                        column: x => x.accepted_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_snapshots_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_booking_snapshots_accepted_by",
                table: "booking_snapshots",
                column: "accepted_by");

            migrationBuilder.CreateIndex(
                name: "IX_booking_snapshots_booking_id_snapshot_type_version",
                table: "booking_snapshots",
                columns: new[] { "booking_id", "snapshot_type", "version" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_snapshots_booking_id_version",
                table: "booking_snapshots",
                columns: new[] { "booking_id", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_snapshots_created_by",
                table: "booking_snapshots",
                column: "created_by");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_snapshots");
        }
    }
}
