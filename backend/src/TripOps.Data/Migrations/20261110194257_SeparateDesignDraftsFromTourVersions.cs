using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeparateDesignDraftsFromTourVersions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "configuration_data",
                table: "tours",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "has_draft_changes",
                table: "tours",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "revision",
                table: "tours",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "tour_configuration_data",
                table: "bookings",
                type: "nvarchar(max)",
                nullable: true);
            if (ActiveProvider.Contains("SqlServer")) migrationBuilder.Sql("""
                EXEC(N'UPDATE t SET revision = CASE WHEN ISNULL(t.version,1)>0 THEN ISNULL(t.version,1) ELSE 1 END,
                  configuration_data = JSON_QUERY(v.tour_snapshot,''$.configuration'')
                  FROM tours t OUTER APPLY (SELECT TOP 1 tour_snapshot FROM tour_versions v
                    WHERE v.tour_id=t.id AND v.version=t.version ORDER BY v.id DESC) v;
                UPDATE b SET tour_configuration_data=JSON_QUERY(v.tour_snapshot,''$.configuration'')
                  FROM bookings b JOIN tour_versions v ON v.tour_id=b.tour_id AND v.version=b.tour_version;');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "configuration_data",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "has_draft_changes",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "revision",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "tour_configuration_data",
                table: "bookings");
        }
    }
}
