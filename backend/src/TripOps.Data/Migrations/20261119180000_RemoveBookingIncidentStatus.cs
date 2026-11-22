using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

[DbContext(typeof(TripOpsDbContext))]
[Migration("20261119180000_RemoveBookingIncidentStatus")]
public partial class RemoveBookingIncidentStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn("status", "booking_incidents");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "status",
            table: "booking_incidents",
            type: "nvarchar(30)",
            maxLength: 30,
            nullable: true,
            defaultValue: "Reported");
    }
}
