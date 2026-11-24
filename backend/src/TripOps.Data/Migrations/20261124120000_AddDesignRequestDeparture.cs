using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

/// <summary>Khách ghi nơi khởi hành (tỉnh/thành và điểm đón) khi gửi yêu cầu thiết kế tour.</summary>
[DbContext(typeof(TripOpsDbContext))]
[Migration("20261124120000_AddDesignRequestDeparture")]
public partial class AddDesignRequestDeparture : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "departure_province_code", table: "tour_design_requests", type: "nvarchar(30)", maxLength: 30, nullable: true);
        migrationBuilder.AddColumn<string>(name: "departure_point", table: "tour_design_requests", type: "nvarchar(255)", maxLength: 255, nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "departure_province_code", table: "tour_design_requests");
        migrationBuilder.DropColumn(name: "departure_point", table: "tour_design_requests");
    }
}
