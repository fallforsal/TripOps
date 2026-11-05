using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTourPlanProposals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tour_plan_proposals",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    request_id = table.Column<int>(type: "int", nullable: false),
                    tour_id = table.Column<int>(type: "int", nullable: false),
                    customer_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    base_tour_version = table.Column<int>(type: "int", nullable: false),
                    proposal_json = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    agency_reply = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    responded_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_plan_proposals", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_plan_proposals_tour_design_requests_request_id",
                        column: x => x.request_id,
                        principalTable: "tour_design_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_plan_proposals_tours_tour_id",
                        column: x => x.tour_id,
                        principalTable: "tours",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_plan_proposals_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_plan_proposals_users_customer_id",
                        column: x => x.customer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tour_plan_proposals_agency_id_status",
                table: "tour_plan_proposals",
                columns: new[] { "agency_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_tour_plan_proposals_customer_id",
                table: "tour_plan_proposals",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_plan_proposals_request_id_created_at",
                table: "tour_plan_proposals",
                columns: new[] { "request_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_tour_plan_proposals_tour_id",
                table: "tour_plan_proposals",
                column: "tour_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tour_plan_proposals");
        }
    }
}
