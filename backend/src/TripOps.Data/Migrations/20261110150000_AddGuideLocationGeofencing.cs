using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TripOps.Data;

#nullable disable

namespace TripOps.Data.Migrations;

[DbContext(typeof(TripOpsDbContext))]
[Migration("20261110150000_AddGuideLocationGeofencing")]
public partial class AddGuideLocationGeofencing : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<double>(
            name: "latitude", table: "tourist_locations",
            type: "float", nullable: true);
        migrationBuilder.AddColumn<double>(
            name: "longitude", table: "tourist_locations",
            type: "float", nullable: true);
        migrationBuilder.AddColumn<int>(
            name: "geofence_radius_meters", table: "tourist_locations",
            type: "int", nullable: false, defaultValue: 1500);

        migrationBuilder.AddColumn<int>(
            name: "visit_order", table: "booking_locations",
            type: "int", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<double>(
            name: "latitude", table: "booking_locations",
            type: "float", nullable: true);
        migrationBuilder.AddColumn<double>(
            name: "longitude", table: "booking_locations",
            type: "float", nullable: true);
        migrationBuilder.AddColumn<int>(
            name: "geofence_radius_meters", table: "booking_locations",
            type: "int", nullable: false, defaultValue: 1500);

        migrationBuilder.AddColumn<double>(
            name: "gps_latitude", table: "booking_attraction_checkins",
            type: "float", nullable: true);
        migrationBuilder.AddColumn<double>(
            name: "gps_longitude", table: "booking_attraction_checkins",
            type: "float", nullable: true);
        migrationBuilder.AddColumn<double>(
            name: "gps_accuracy_meters", table: "booking_attraction_checkins",
            type: "float", nullable: true);
        migrationBuilder.AddColumn<DateTime>(
            name: "gps_recorded_at_utc", table: "booking_attraction_checkins",
            type: "datetime2", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "latitude", table: "tourist_locations");
        migrationBuilder.DropColumn(name: "longitude", table: "tourist_locations");
        migrationBuilder.DropColumn(name: "geofence_radius_meters", table: "tourist_locations");

        migrationBuilder.DropColumn(name: "visit_order", table: "booking_locations");
        migrationBuilder.DropColumn(name: "latitude", table: "booking_locations");
        migrationBuilder.DropColumn(name: "longitude", table: "booking_locations");
        migrationBuilder.DropColumn(name: "geofence_radius_meters", table: "booking_locations");

        migrationBuilder.DropColumn(name: "gps_latitude", table: "booking_attraction_checkins");
        migrationBuilder.DropColumn(name: "gps_longitude", table: "booking_attraction_checkins");
        migrationBuilder.DropColumn(name: "gps_accuracy_meters", table: "booking_attraction_checkins");
        migrationBuilder.DropColumn(name: "gps_recorded_at_utc", table: "booking_attraction_checkins");
    }
}
