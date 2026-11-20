using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class VersionScopedAllianceAndDesignLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "close_reason",
                table: "tour_design_requests",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "closed_at",
                table: "tour_design_requests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "archived_at",
                table: "tour_design_request_agencies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "tour_version_agencies",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tour_version_id = table.Column<int>(type: "int", nullable: false),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    is_host = table.Column<bool>(type: "bit", nullable: false),
                    status = table.Column<string>(type: "varchar(20)", nullable: false),
                    stage_area = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    suggested_budget = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    communication_notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    assigned_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    responded_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_version_agencies", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_version_agencies_tour_versions_tour_version_id",
                        column: x => x.tour_version_id,
                        principalTable: "tour_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_version_agencies_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tour_version_agencies_agency_id",
                table: "tour_version_agencies",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_version_agencies_tour_version_id_agency_id",
                table: "tour_version_agencies",
                columns: new[] { "tour_version_id", "agency_id" },
                unique: true);

            // Preserve each historical version's membership, rather than copying today's alliance to every version.
            migrationBuilder.Sql("""
                INSERT INTO tour_version_agencies
                    (tour_version_id,agency_id,is_host,status,stage_area,assigned_at,responded_at)
                SELECT v.id,t.agency_id,1,'accepted',N'',COALESCE(v.created_at,SYSUTCDATETIME()),COALESCE(v.created_at,SYSUTCDATETIME())
                FROM tour_versions v JOIN tours t ON t.id=v.tour_id
                WHERE t.design_request_id IS NOT NULL AND t.agency_id IS NOT NULL;

                INSERT INTO tour_version_agencies
                    (tour_version_id,agency_id,is_host,status,stage_area,suggested_budget,communication_notes,assigned_at,responded_at)
                SELECT v.id,j.company_id,0,COALESCE(j.status,'accepted'),COALESCE(j.segment,N''),j.budget,j.notes,
                    COALESCE(TRY_CONVERT(datetime2,j.invited_at,127),v.created_at,SYSUTCDATETIME()),TRY_CONVERT(datetime2,j.responded_at,127)
                FROM tour_versions v JOIN tours t ON t.id=v.tour_id
                CROSS APPLY OPENJSON(CASE WHEN ISJSON(v.tour_snapshot)=1 THEN v.tour_snapshot ELSE N'{}' END,'$.configuration.coHosts')
                WITH (company_id nvarchar(36) '$.companyId',status varchar(20) '$.status',segment nvarchar(255) '$.assignedSegments',
                    budget decimal(12,2) '$.estimatedBudgetPerGuest',notes nvarchar(max) '$.notes',invited_at nvarchar(50) '$.invitedAt',responded_at nvarchar(50) '$.respondedAt') j
                JOIN users u ON u.id=j.company_id
                WHERE t.design_request_id IS NOT NULL AND j.company_id<>t.agency_id
                  AND NOT EXISTS (SELECT 1 FROM tour_version_agencies a WHERE a.tour_version_id=v.id AND a.agency_id=j.company_id);

                -- Pending invitations may not be in the saved JSON; attach them only to the current working version.
                INSERT INTO tour_version_agencies
                    (tour_version_id,agency_id,is_host,status,stage_area,suggested_budget,communication_notes,assigned_at,responded_at)
                SELECT v.id,a.agency_id,a.is_host,a.status,a.stage_area,a.suggested_budget,a.communication_notes,a.assigned_at,a.responded_at
                FROM tours t JOIN tour_versions v ON v.tour_id=t.id AND v.version=t.version
                JOIN tour_design_request_agencies a ON a.request_id=t.design_request_id
                WHERE a.status<>'cancelled' AND NOT EXISTS
                    (SELECT 1 FROM tour_version_agencies m WHERE m.tour_version_id=v.id AND m.agency_id=a.agency_id);

                UPDATE r SET status='booked' FROM tour_design_requests r
                WHERE r.status IN ('pending','in_progress') AND EXISTS (SELECT 1 FROM bookings b WHERE b.design_request_id=r.id);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE tour_design_requests SET status='in_progress' WHERE status IN ('booked','closed')");
            migrationBuilder.DropTable(
                name: "tour_version_agencies");

            migrationBuilder.DropColumn(
                name: "close_reason",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "closed_at",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "archived_at",
                table: "tour_design_request_agencies");
        }
    }
}
