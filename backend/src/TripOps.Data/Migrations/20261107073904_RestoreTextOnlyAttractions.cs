using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class RestoreTextOnlyAttractions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CostUnit",
                table: "tourist_locations");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "tourist_locations");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "tourist_locations");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "tourist_locations");

            migrationBuilder.DropColumn(
                name: "CostUnit",
                table: "booking_locations");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "booking_locations");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "booking_locations");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "booking_locations");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CostUnit",
                table: "tourist_locations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "tourist_locations",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ServiceId",
                table: "tourist_locations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "tourist_locations",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CostUnit",
                table: "booking_locations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "booking_locations",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ServiceId",
                table: "booking_locations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "booking_locations",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }
    }
}
