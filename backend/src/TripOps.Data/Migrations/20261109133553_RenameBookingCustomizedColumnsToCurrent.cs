using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameBookingCustomizedColumnsToCurrent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "customized_restaurant_name",
                table: "booking_restaurants",
                newName: "current_restaurant_name");

            migrationBuilder.RenameColumn(
                name: "customized_location_name",
                table: "booking_locations",
                newName: "current_location_name");

            migrationBuilder.RenameColumn(
                name: "customized_stars",
                table: "booking_hotels",
                newName: "current_stars");

            migrationBuilder.RenameColumn(
                name: "customized_hotel_name",
                table: "booking_hotels",
                newName: "current_hotel_name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "current_restaurant_name",
                table: "booking_restaurants",
                newName: "customized_restaurant_name");

            migrationBuilder.RenameColumn(
                name: "current_location_name",
                table: "booking_locations",
                newName: "customized_location_name");

            migrationBuilder.RenameColumn(
                name: "current_stars",
                table: "booking_hotels",
                newName: "customized_stars");

            migrationBuilder.RenameColumn(
                name: "current_hotel_name",
                table: "booking_hotels",
                newName: "customized_hotel_name");
        }
    }
}
