using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTourProvinces : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tour_provinces",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tour_id = table.Column<int>(type: "int", nullable: false),
                    province_code = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_provinces", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_provinces_tours_tour_id",
                        column: x => x.tour_id,
                        principalTable: "tours",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tour_provinces_province_code_tour_id",
                table: "tour_provinces",
                columns: new[] { "province_code", "tour_id" });

            migrationBuilder.CreateIndex(
                name: "IX_tour_provinces_tour_id_province_code",
                table: "tour_provinces",
                columns: new[] { "tour_id", "province_code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tour_provinces");
        }
    }
}

