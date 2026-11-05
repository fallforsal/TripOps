using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingQuotationsAndMultiplePlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tours_design_request_id",
                table: "tours");

            migrationBuilder.CreateTable(
                name: "booking_quotations",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    version = table.Column<int>(type: "int", nullable: false),
                    tour_id = table.Column<int>(type: "int", nullable: false),
                    tour_version = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    estimated_sale = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    total_cost = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    agency_profit = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    sale_total = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    lines_json = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    sent_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    accepted_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_quotations", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_quotations_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_quotations_tours_tour_id",
                        column: x => x.tour_id,
                        principalTable: "tours",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_supplier_requests",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    service_id = table.Column<int>(type: "int", nullable: false),
                    provider_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    slot_key = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    service_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    service_date_from = table.Column<DateTime>(type: "date", nullable: true),
                    service_date_to = table.Column<DateTime>(type: "date", nullable: true),
                    quantity = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    unit = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    estimated_cost = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    quoted_cost = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    responded_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_supplier_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_booking_supplier_requests_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_supplier_requests_services_service_id",
                        column: x => x.service_id,
                        principalTable: "services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_supplier_requests_users_provider_id",
                        column: x => x.provider_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tours_design_request_id",
                table: "tours",
                column: "design_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_quotations_booking_id_version",
                table: "booking_quotations",
                columns: new[] { "booking_id", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_quotations_tour_id",
                table: "booking_quotations",
                column: "tour_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_supplier_requests_booking_id_slot_key",
                table: "booking_supplier_requests",
                columns: new[] { "booking_id", "slot_key" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_supplier_requests_provider_id_status",
                table: "booking_supplier_requests",
                columns: new[] { "provider_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_supplier_requests_service_id",
                table: "booking_supplier_requests",
                column: "service_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_quotations");

            migrationBuilder.DropTable(
                name: "booking_supplier_requests");

            migrationBuilder.DropIndex(
                name: "IX_tours_design_request_id",
                table: "tours");

            migrationBuilder.CreateIndex(
                name: "IX_tours_design_request_id",
                table: "tours",
                column: "design_request_id",
                unique: true,
                filter: "[design_request_id] IS NOT NULL");
        }
    }
}
