using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

/// <summary>Phong cách du lịch của tour để lọc theo các thẻ ở trang chủ.</summary>
[DbContext(typeof(TripOpsDbContext))]
[Migration("20261125090000_AddTourTravelStyle")]
public partial class AddTourTravelStyle : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "travel_style", table: "tours", type: "nvarchar(30)", maxLength: 30, nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "travel_style", table: "tours");
    }
}
