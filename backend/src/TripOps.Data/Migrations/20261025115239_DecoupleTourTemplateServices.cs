using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class DecoupleTourTemplateServices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A development database may already have some of these columns removed
            // outside EF. Guard every object, and refuse to discard live references.
            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.tour_accommodations', 'ServiceId') IS NOT NULL
                    EXEC('IF EXISTS (SELECT 1 FROM dbo.tour_accommodations WHERE ServiceId IS NOT NULL) THROW 51000, ''tour_accommodations.ServiceId contains data; preserve it before decoupling.'', 1;');
                IF COL_LENGTH('dbo.tour_meals', 'ServiceId') IS NOT NULL
                    EXEC('IF EXISTS (SELECT 1 FROM dbo.tour_meals WHERE ServiceId IS NOT NULL) THROW 51000, ''tour_meals.ServiceId contains data; preserve it before decoupling.'', 1;');
                IF COL_LENGTH('dbo.tourist_attractions', 'ServiceId') IS NOT NULL
                    EXEC('IF EXISTS (SELECT 1 FROM dbo.tourist_attractions WHERE ServiceId IS NOT NULL) THROW 51000, ''tourist_attractions.ServiceId contains data; preserve it before decoupling.'', 1;');
                IF COL_LENGTH('dbo.tour_timeline', 'TransportationServiceId') IS NOT NULL
                    EXEC('IF EXISTS (SELECT 1 FROM dbo.tour_timeline WHERE TransportationServiceId IS NOT NULL) THROW 51000, ''tour_timeline.TransportationServiceId contains data; preserve it before decoupling.'', 1;');
                """);
            foreach (var (table, column) in new[] {
                ("tour_accommodations", "ServiceId"),
                ("tour_meals", "ServiceId"),
                ("tourist_attractions", "ServiceId"),
                ("tour_timeline", "TransportationServiceId") })
            {
                migrationBuilder.Sql($"""
                    IF EXISTS (SELECT 1 FROM sys.foreign_keys
                        WHERE parent_object_id = OBJECT_ID('dbo.{table}')
                        AND name = 'FK_{table}_services_{column}')
                        ALTER TABLE dbo.{table} DROP CONSTRAINT FK_{table}_services_{column};
                    IF EXISTS (SELECT 1 FROM sys.indexes
                        WHERE object_id = OBJECT_ID('dbo.{table}') AND name = 'IX_{table}_{column}')
                        DROP INDEX IX_{table}_{column} ON dbo.{table};
                    IF COL_LENGTH('dbo.{table}', '{column}') IS NOT NULL
                        ALTER TABLE dbo.{table} DROP COLUMN {column};
                    """);
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ServiceId",
                table: "tourist_attractions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TransportationServiceId",
                table: "tour_timeline",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ServiceId",
                table: "tour_meals",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ServiceId",
                table: "tour_accommodations",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_tourist_attractions_ServiceId",
                table: "tourist_attractions",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_tour_timeline_TransportationServiceId",
                table: "tour_timeline",
                column: "TransportationServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_tour_meals_ServiceId",
                table: "tour_meals",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_tour_accommodations_ServiceId",
                table: "tour_accommodations",
                column: "ServiceId");

            migrationBuilder.AddForeignKey(
                name: "FK_tour_accommodations_services_ServiceId",
                table: "tour_accommodations",
                column: "ServiceId",
                principalTable: "services",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_tour_meals_services_ServiceId",
                table: "tour_meals",
                column: "ServiceId",
                principalTable: "services",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_tour_timeline_services_TransportationServiceId",
                table: "tour_timeline",
                column: "TransportationServiceId",
                principalTable: "services",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_tourist_attractions_services_ServiceId",
                table: "tourist_attractions",
                column: "ServiceId",
                principalTable: "services",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
