using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialDesignChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InitialChangesJson",
                table: "tour_design_requests",
                type: "nvarchar(max)",
                nullable: true);
            migrationBuilder.Sql("UPDATE booking_supplier_requests SET ResponseHistoryJson = '[]' WHERE ResponseHistoryJson = ''");
            migrationBuilder.Sql("UPDATE booking_quotations SET PlanSnapshotJson = '{}' WHERE PlanSnapshotJson = ''");
            migrationBuilder.Sql(@"UPDATE v SET SharedToCustomer = 1, NumberOfGuests = r.number_of_participants
                FROM tour_versions v JOIN tours t ON t.id = v.tour_id
                JOIN tour_design_requests r ON r.id = t.design_request_id
                WHERE t.is_request = 1 AND ISJSON(v.tour_snapshot) = 1
                AND JSON_VALUE(CASE WHEN ISJSON(v.tour_snapshot) = 1 THEN v.tour_snapshot ELSE '{}' END, '$.status') = 'completed'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InitialChangesJson",
                table: "tour_design_requests");
        }
    }
}
