using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AlignCoHostInvitationAndAgencyOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(name: "communication_notes", table: "tour_design_request_agencies", type: "nvarchar(max)", nullable: true,
                oldClrType: typeof(string), oldType: "nvarchar(2000)", oldMaxLength: 2000, oldNullable: true);
            migrationBuilder.Sql("""
                UPDATE tour_design_request_agencies SET communication_notes=CONCAT(communication_notes,CHAR(10),N'Lý do từ chối: ',rejection_reason)
                WHERE rejection_reason IS NOT NULL;
                INSERT INTO tour_pricing_tiers(tour_id,agency_id,tier_name,min_age,max_age,price,display_order)
                SELECT t.id,a.agency_id,p.label,p.min_age,p.max_age,p.price,p.sort_order
                FROM tour_design_request_agencies a JOIN tours t ON t.design_request_id=a.tour_design_request_id
                CROSS APPLY (VALUES (N'Người lớn',12,CAST(NULL AS int),a.quote_adult,2),(N'Trẻ em',5,11,a.quote_child,1),(N'Em bé',0,4,a.quote_infant,0)) p(label,min_age,max_age,price,sort_order)
                WHERE a.status='accepted' AND p.price IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tour_pricing_tiers x WHERE x.tour_id=t.id AND x.agency_id=a.agency_id AND x.min_age=p.min_age);
                """);
            migrationBuilder.DropForeignKey(
                name: "FK_tour_design_request_agencies_tour_design_requests_tour_design_request_id",
                table: "tour_design_request_agencies");

            migrationBuilder.DropColumn(
                name: "assigned_days",
                table: "tour_design_request_agencies");

            migrationBuilder.DropColumn(
                name: "quote_adult",
                table: "tour_design_request_agencies");

            migrationBuilder.DropColumn(
                name: "quote_child",
                table: "tour_design_request_agencies");

            migrationBuilder.DropColumn(
                name: "quote_infant",
                table: "tour_design_request_agencies");

            migrationBuilder.DropColumn(
                name: "quote_note",
                table: "tour_design_request_agencies");

            migrationBuilder.DropColumn(
                name: "quoted_at",
                table: "tour_design_request_agencies");

            migrationBuilder.DropColumn(
                name: "rejection_reason",
                table: "tour_design_request_agencies");

            migrationBuilder.RenameColumn(
                name: "tour_design_request_id",
                table: "tour_design_request_agencies",
                newName: "request_id");

            migrationBuilder.RenameIndex(
                name: "IX_tour_design_request_agencies_tour_design_request_id_agency_id",
                table: "tour_design_request_agencies",
                newName: "IX_tour_design_request_agencies_request_id_agency_id");

            migrationBuilder.AddColumn<bool>(
                name: "is_host",
                table: "tour_design_request_agencies",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddForeignKey(
                name: "FK_tour_design_request_agencies_tour_design_requests_request_id",
                table: "tour_design_request_agencies",
                column: "request_id",
                principalTable: "tour_design_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
            migrationBuilder.Sql("""
                EXEC(N'UPDATE a SET is_host=1 FROM tour_design_request_agencies a JOIN tour_design_requests r ON r.id=a.request_id AND r.agency_id=a.agency_id;
                INSERT INTO tour_design_request_agencies(request_id,agency_id,is_host,stage_area,status,assigned_at,responded_at)
                SELECT r.id,r.agency_id,1,N'''',CASE WHEN r.status=''in_progress'' THEN ''accepted'' ELSE COALESCE(r.status,''pending'') END,COALESCE(r.created_at,SYSUTCDATETIME()),r.responded_at
                FROM tour_design_requests r WHERE r.agency_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tour_design_request_agencies a WHERE a.request_id=r.id AND a.agency_id=r.agency_id);');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS(SELECT 1 FROM tour_design_request_agencies WHERE DATALENGTH(communication_notes)>4000)
                    THROW 51000, 'Communication notes exceed the old schema limit; preserve them before downgrading.', 1;
                DELETE FROM tour_design_request_agencies WHERE is_host=1;
                """);
            migrationBuilder.AlterColumn<string>(name: "communication_notes", table: "tour_design_request_agencies", type: "nvarchar(2000)", maxLength: 2000, nullable: true,
                oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);
            migrationBuilder.DropForeignKey(
                name: "FK_tour_design_request_agencies_tour_design_requests_request_id",
                table: "tour_design_request_agencies");

            migrationBuilder.DropColumn(
                name: "is_host",
                table: "tour_design_request_agencies");

            migrationBuilder.RenameColumn(
                name: "request_id",
                table: "tour_design_request_agencies",
                newName: "tour_design_request_id");

            migrationBuilder.RenameIndex(
                name: "IX_tour_design_request_agencies_request_id_agency_id",
                table: "tour_design_request_agencies",
                newName: "IX_tour_design_request_agencies_tour_design_request_id_agency_id");

            migrationBuilder.AddColumn<string>(
                name: "assigned_days",
                table: "tour_design_request_agencies",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<decimal>(
                name: "quote_adult",
                table: "tour_design_request_agencies",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "quote_child",
                table: "tour_design_request_agencies",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "quote_infant",
                table: "tour_design_request_agencies",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "quote_note",
                table: "tour_design_request_agencies",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "quoted_at",
                table: "tour_design_request_agencies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "rejection_reason",
                table: "tour_design_request_agencies",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_tour_design_request_agencies_tour_design_requests_tour_design_request_id",
                table: "tour_design_request_agencies",
                column: "tour_design_request_id",
                principalTable: "tour_design_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
