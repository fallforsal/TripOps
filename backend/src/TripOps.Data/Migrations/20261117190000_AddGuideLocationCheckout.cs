using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

[DbContext(typeof(TripOpsDbContext))]
[Migration("20261117190000_AddGuideLocationCheckout")]
public partial class AddGuideLocationCheckout : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>("checked_out_at", "booking_attraction_checkins", type: "datetime2", nullable: true);
        migrationBuilder.AddColumn<string>("checkout_photo_proof_url", "booking_attraction_checkins", type: "nvarchar(max)", nullable: true);
        migrationBuilder.AddColumn<string>("checkout_notes", "booking_attraction_checkins", type: "nvarchar(max)", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn("checked_out_at", "booking_attraction_checkins");
        migrationBuilder.DropColumn("checkout_photo_proof_url", "booking_attraction_checkins");
        migrationBuilder.DropColumn("checkout_notes", "booking_attraction_checkins");
    }
}
