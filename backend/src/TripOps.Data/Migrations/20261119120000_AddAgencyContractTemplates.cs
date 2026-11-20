using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

/// <summary>Mẫu hợp đồng riêng của Agency (chính sách hủy, điều khoản bổ sung) và bản chụp chính sách trong booking.</summary>
[DbContext(typeof(TripOpsDbContext))]
[Migration("20261119120000_AddAgencyContractTemplates")]
public partial class AddAgencyContractTemplates : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "agency_contract_templates",
            columns: table => new
            {
                id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                cancellation_tiers = table.Column<string>(type: "nvarchar(max)", nullable: false),
                cancellation_note = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                additional_terms = table.Column<string>(type: "nvarchar(max)", nullable: true),
                created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_agency_contract_templates", x => x.id);
                table.ForeignKey(
                    name: "FK_agency_contract_templates_users_agency_id",
                    column: x => x.agency_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_agency_contract_templates_agency_id",
            table: "agency_contract_templates",
            column: "agency_id",
            unique: true);

        migrationBuilder.AddColumn<string>(
            name: "contract_terms_snapshot",
            table: "bookings",
            type: "nvarchar(max)",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "contract_terms_snapshot", table: "bookings");
        migrationBuilder.DropTable(name: "agency_contract_templates");
    }
}
