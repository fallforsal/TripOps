using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

/// <summary>Khách ghi tỉnh/thành khởi hành khi gửi yêu cầu thiết kế tour.</summary>
[DbContext(typeof(TripOpsDbContext))]
[Migration("20261124120000_AddDesignRequestDeparture")]
public partial class AddDesignRequestDeparture : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "departure_province_code", table: "tour_design_requests", type: "nvarchar(30)", maxLength: 30, nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "departure_province_code", table: "tour_design_requests");
    }
}
