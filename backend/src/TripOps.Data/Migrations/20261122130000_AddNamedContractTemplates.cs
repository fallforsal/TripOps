using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations;

/// <summary>
/// Agency lưu nhiều mẫu hợp đồng có tên và chọn một mẫu đang áp dụng.
/// Mẫu cũ (mỗi Agency một dòng) thành "Mẫu hiện tại" và tiếp tục được áp dụng.
/// </summary>
[DbContext(typeof(TripOpsDbContext))]
[Migration("20261122130000_AddNamedContractTemplates")]
public partial class AddNamedContractTemplates : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_agency_contract_templates_agency_id", table: "agency_contract_templates");
        migrationBuilder.AddColumn<string>(name: "name", table: "agency_contract_templates", type: "nvarchar(120)", maxLength: 120,
            nullable: false, defaultValue: "Mẫu hiện tại");
        migrationBuilder.AddColumn<bool>(name: "is_active", table: "agency_contract_templates", type: "bit", nullable: false, defaultValue: false);
        migrationBuilder.Sql("UPDATE agency_contract_templates SET is_active = 1;");
        migrationBuilder.CreateIndex(name: "IX_agency_contract_templates_agency_id", table: "agency_contract_templates", column: "agency_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Mỗi Agency chỉ giữ mẫu đang áp dụng (hoặc mẫu mới nhất) để khôi phục ràng buộc một mẫu / Agency.
        migrationBuilder.Sql("""
            DELETE t FROM agency_contract_templates t
            WHERE EXISTS (SELECT 1 FROM agency_contract_templates o
                          WHERE o.agency_id = t.agency_id
                            AND (o.is_active > t.is_active OR (o.is_active = t.is_active AND o.updated_at > t.updated_at)
                                 OR (o.is_active = t.is_active AND o.updated_at = t.updated_at AND o.id > t.id)));
            """);
        migrationBuilder.DropIndex(name: "IX_agency_contract_templates_agency_id", table: "agency_contract_templates");
        migrationBuilder.DropColumn(name: "name", table: "agency_contract_templates");
        migrationBuilder.DropColumn(name: "is_active", table: "agency_contract_templates");
        migrationBuilder.CreateIndex(name: "IX_agency_contract_templates_agency_id", table: "agency_contract_templates", column: "agency_id", unique: true);
    }
}
