using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "full_address",
                table: "services",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "hidden_reason",
                table: "services",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "operating_hours",
                table: "services",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "sub_category",
                table: "services",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "full_address",
                table: "services");

            migrationBuilder.DropColumn(
                name: "hidden_reason",
                table: "services");

            migrationBuilder.DropColumn(
                name: "operating_hours",
                table: "services");

            migrationBuilder.DropColumn(
                name: "sub_category",
                table: "services");
        }
    }
}
