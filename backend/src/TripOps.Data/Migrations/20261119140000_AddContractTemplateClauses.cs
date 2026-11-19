using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

/// <summary>Nội dung các điều hợp đồng do Agency sửa lại (JSON theo mã điều).</summary>
[DbContext(typeof(TripOpsDbContext))]
[Migration("20261119140000_AddContractTemplateClauses")]
public partial class AddContractTemplateClauses : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "clauses",
            table: "agency_contract_templates",
            type: "nvarchar(max)",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "clauses", table: "agency_contract_templates");
    }
}
