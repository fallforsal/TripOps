using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class RestoreDesignTourCoHosting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tour_design_request_agencies",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tour_design_request_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    stage_area = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    assigned_days = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    suggested_budget = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    communication_notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    status = table.Column<string>(type: "varchar(20)", nullable: false),
                    rejection_reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    quote_adult = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    quote_child = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    quote_infant = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    quote_note = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    quoted_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    assigned_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    responded_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_design_request_agencies", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_design_request_agencies_tour_design_requests_tour_design_request_id",
                        column: x => x.tour_design_request_id,
                        principalTable: "tour_design_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_design_request_agencies_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_request_agencies_agency_id",
                table: "tour_design_request_agencies",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_request_agencies_tour_design_request_id_agency_id",
                table: "tour_design_request_agencies",
                columns: new[] { "tour_design_request_id", "agency_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tour_design_request_agencies");
        }
    }
}
