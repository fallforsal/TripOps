using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomTourRequestBusinessAndUniqueTour : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tours_design_request_id",
                table: "tours");

            migrationBuilder.AddColumn<string>(
                name: "business_email",
                table: "tour_design_requests",
                type: "nvarchar(191)",
                maxLength: 191,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "business_name",
                table: "tour_design_requests",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "business_phone",
                table: "tour_design_requests",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_tours_design_request_id",
                table: "tours",
                column: "design_request_id",
                unique: true,
                filter: "[design_request_id] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tours_design_request_id",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "business_email",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "business_name",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "business_phone",
                table: "tour_design_requests");

            migrationBuilder.CreateIndex(
                name: "IX_tours_design_request_id",
                table: "tours",
                column: "design_request_id");
        }
    }
}
