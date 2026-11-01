using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAgencySupplierDirectory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "agency_supplier_id",
                table: "tour_restaurants",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "supplier_snapshot",
                table: "tour_restaurants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "supplier_source",
                table: "tour_restaurants",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "agency_supplier_id",
                table: "tour_hotels",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "supplier_snapshot",
                table: "tour_hotels",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "supplier_source",
                table: "tour_hotels",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "agency_suppliers",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    supplier_type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    area = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    contact_name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    contact_phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    contact_email = table.Column<string>(type: "nvarchar(191)", maxLength: 191, nullable: true),
                    star_rating = table.Column<int>(type: "int", nullable: true),
                    reference_price = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    conditions = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_agency_suppliers", x => x.id);
                    table.ForeignKey(
                        name: "FK_agency_suppliers_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tour_restaurants_agency_supplier_id",
                table: "tour_restaurants",
                column: "agency_supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_hotels_agency_supplier_id",
                table: "tour_hotels",
                column: "agency_supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_agency_suppliers_agency_id_supplier_type_name",
                table: "agency_suppliers",
                columns: new[] { "agency_id", "supplier_type", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_agency_suppliers_agency_id_supplier_type_status",
                table: "agency_suppliers",
                columns: new[] { "agency_id", "supplier_type", "status" });

            migrationBuilder.AddForeignKey(
                name: "FK_tour_hotels_agency_suppliers_agency_supplier_id",
                table: "tour_hotels",
                column: "agency_supplier_id",
                principalTable: "agency_suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_tour_restaurants_agency_suppliers_agency_supplier_id",
                table: "tour_restaurants",
                column: "agency_supplier_id",
                principalTable: "agency_suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            // Preserve the source of rows created before Agency supplier references existed.
            migrationBuilder.Sql("UPDATE tour_restaurants SET supplier_source = CASE WHEN service_id IS NULL THEN N'AGENCY_SUPPLIER' ELSE N'PLATFORM_PARTNER' END WHERE supplier_source IS NULL");
            migrationBuilder.Sql("UPDATE tour_hotels SET supplier_source = CASE WHEN service_id IS NULL THEN N'AGENCY_SUPPLIER' ELSE N'PLATFORM_PARTNER' END WHERE supplier_source IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tour_hotels_agency_suppliers_agency_supplier_id",
                table: "tour_hotels");

            migrationBuilder.DropForeignKey(
                name: "FK_tour_restaurants_agency_suppliers_agency_supplier_id",
                table: "tour_restaurants");

            migrationBuilder.DropTable(
                name: "agency_suppliers");

            migrationBuilder.DropIndex(
                name: "IX_tour_restaurants_agency_supplier_id",
                table: "tour_restaurants");

            migrationBuilder.DropIndex(
                name: "IX_tour_hotels_agency_supplier_id",
                table: "tour_hotels");

            migrationBuilder.DropColumn(
                name: "agency_supplier_id",
                table: "tour_restaurants");

            migrationBuilder.DropColumn(
                name: "supplier_snapshot",
                table: "tour_restaurants");

            migrationBuilder.DropColumn(
                name: "supplier_source",
                table: "tour_restaurants");

            migrationBuilder.DropColumn(
                name: "agency_supplier_id",
                table: "tour_hotels");

            migrationBuilder.DropColumn(
                name: "supplier_snapshot",
                table: "tour_hotels");

            migrationBuilder.DropColumn(
                name: "supplier_source",
                table: "tour_hotels");
        }
    }
}
