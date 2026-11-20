using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDesignRequestBusinessContacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "business_email",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "business_phone",
                table: "tour_design_requests");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "business_email",
                table: "tour_design_requests",
                type: "nvarchar(191)",
                maxLength: 191,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "business_phone",
                table: "tour_design_requests",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);
        }
    }
}
