using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyPrivateTourDesignWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM dbo.tours WHERE design_request_id IS NOT NULL GROUP BY design_request_id HAVING COUNT(*) > 1)
                    THROW 51000, 'A request has multiple old tour plans. Export and consolidate these plans before applying SimplifyPrivateTourDesignWorkflow.', 1;
                """);

            migrationBuilder.DropIndex(
                name: "IX_tours_design_request_id",
                table: "tours");

            migrationBuilder.AddColumn<DateTime>(name: "responded_at", table: "tour_design_requests", type: "datetime2", nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "cloned_from_tour_id",
                table: "tours",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "shared_version",
                table: "tours",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "restored_from_version",
                table: "tour_versions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "shared_at",
                table: "tour_versions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "shared_by",
                table: "tour_versions",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "tour_design_requests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                defaultValue: "pending",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true,
                oldDefaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "rejection_reason",
                table: "tour_design_requests",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "design_request_id",
                table: "chat_messages",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tour_version",
                table: "bookings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_tour_versions_tour_id_version",
                table: "tour_versions",
                columns: new[] { "tour_id", "version" });

            migrationBuilder.CreateIndex(
                name: "IX_tours_cloned_from_tour_id",
                table: "tours",
                column: "cloned_from_tour_id");

            migrationBuilder.CreateIndex(
                name: "IX_tours_design_request_id",
                table: "tours",
                column: "design_request_id",
                unique: true,
                filter: "[design_request_id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_tours_id_shared_version",
                table: "tours",
                columns: new[] { "id", "shared_version" });

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_design_request_id_id",
                table: "chat_messages",
                columns: new[] { "design_request_id", "id" });

            migrationBuilder.AddForeignKey(
                name: "FK_chat_messages_tour_design_requests_design_request_id",
                table: "chat_messages",
                column: "design_request_id",
                principalTable: "tour_design_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_tours_tour_versions_id_shared_version",
                table: "tours",
                columns: new[] { "id", "shared_version" },
                principalTable: "tour_versions",
                principalColumns: new[] { "tour_id", "version" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_tours_tours_cloned_from_tour_id",
                table: "tours",
                column: "cloned_from_tour_id",
                principalTable: "tours",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql("EXEC(N'" + """
                UPDATE v SET shared_at = COALESCE(v.created_at, SYSUTCDATETIME()), shared_by = v.created_by
                  FROM dbo.tour_versions v WHERE v.SharedToCustomer = 1;
                UPDATE t SET shared_version = t.version FROM dbo.tours t
                  WHERE t.is_request = 1 AND t.is_shared_to_customer = 1
                  AND EXISTS (SELECT 1 FROM dbo.tour_versions v WHERE v.tour_id=t.id AND v.version=t.version);
                UPDATE v SET shared_at = COALESCE(v.shared_at, SYSUTCDATETIME()), shared_by=COALESCE(v.shared_by,t.agency_id)
                  FROM dbo.tour_versions v JOIN dbo.tours t ON v.tour_id=t.id AND v.version=t.shared_version;
                UPDATE dbo.tour_design_requests SET status=CASE UPPER(status)
                  WHEN 'PENDING' THEN 'pending' WHEN 'CANCELLED' THEN 'cancelled' WHEN 'REJECTED' THEN 'rejected' ELSE 'in_progress' END;
                UPDATE dbo.tour_design_requests SET responded_at=COALESCE(updated_at,created_at) WHERE status<>'pending';
                UPDATE dbo.tour_design_requests SET rejection_reason=N'Yêu cầu đã bị từ chối trước khi bổ sung chức năng ghi lý do.' WHERE status='rejected';
                UPDATE b SET tour_version=COALESCE((SELECT TOP(1) q.tour_version FROM dbo.booking_quotations q WHERE q.booking_id=b.id ORDER BY q.version),t.version,1)
                  FROM dbo.bookings b LEFT JOIN dbo.tours t ON t.id=b.tour_id;

                CREATE TABLE #LegacyDesignMessages (request_id int, actor nvarchar(36), content nvarchar(max), sent_at datetime2);
                INSERT #LegacyDesignMessages
                SELECT r.id, CASE WHEN COALESCE(j.Actor,j.actor2) IN (r.user_id,r.agency_id) THEN COALESCE(j.Actor,j.actor2) ELSE r.agency_id END,
                       COALESCE(j.Message,j.message2), COALESCE(TRY_CONVERT(datetime2,COALESCE(j.At,j.at2)),r.created_at,SYSUTCDATETIME())
                  FROM dbo.tour_design_request_agencies a JOIN dbo.tour_design_requests r ON a.request_id=r.id
                  CROSS APPLY OPENJSON(CASE WHEN ISJSON(a.communication_notes)=1 AND LEFT(LTRIM(a.communication_notes),1)='[' THEN a.communication_notes ELSE N'[]' END)
                  WITH (Actor nvarchar(36) '$.Actor', actor2 nvarchar(36) '$.actor', Message nvarchar(max) '$.Message',message2 nvarchar(max) '$.message', At nvarchar(100) '$.At',at2 nvarchar(100) '$.at') j
                 WHERE COALESCE(j.Message,j.message2) IS NOT NULL;
                INSERT #LegacyDesignMessages
                SELECT r.id,r.agency_id,a.communication_notes,COALESCE(a.assigned_at,r.created_at,SYSUTCDATETIME())
                  FROM dbo.tour_design_request_agencies a JOIN dbo.tour_design_requests r ON a.request_id=r.id
                 WHERE NULLIF(a.communication_notes,N'') IS NOT NULL AND ISJSON(a.communication_notes)=0;
                INSERT #LegacyDesignMessages
                SELECT request_id,customer_id,N'[Đề xuất trước khi chuyển sang chat] '+message+NCHAR(10)+proposal_json,created_at FROM dbo.tour_plan_proposals;
                INSERT #LegacyDesignMessages
                SELECT request_id,agency_id,N'[Phản hồi đề xuất cũ] '+agency_reply,COALESCE(responded_at,created_at) FROM dbo.tour_plan_proposals WHERE NULLIF(agency_reply,N'') IS NOT NULL;
                IF EXISTS(SELECT 1 FROM #LegacyDesignMessages m JOIN dbo.tour_design_requests r ON r.id=m.request_id WHERE r.user_id IS NULL OR r.agency_id IS NULL)
                    THROW 51001, 'Legacy request messages have no customer/agency. Assign owners before migrating.',1;
                INSERT dbo.chat_conversations(user_one_id,user_two_id,status,created_at,updated_at)
                SELECT DISTINCT CASE WHEN r.user_id COLLATE Latin1_General_100_BIN2 < r.agency_id COLLATE Latin1_General_100_BIN2 THEN r.user_id ELSE r.agency_id END,
                  CASE WHEN r.user_id COLLATE Latin1_General_100_BIN2 < r.agency_id COLLATE Latin1_General_100_BIN2 THEN r.agency_id ELSE r.user_id END,'active',SYSUTCDATETIME(),SYSUTCDATETIME()
                  FROM dbo.tour_design_requests r WHERE EXISTS(SELECT 1 FROM #LegacyDesignMessages m WHERE m.request_id=r.id)
                  AND NOT EXISTS(SELECT 1 FROM dbo.chat_conversations c WHERE (c.user_one_id=r.user_id AND c.user_two_id=r.agency_id) OR (c.user_one_id=r.agency_id AND c.user_two_id=r.user_id));
                INSERT dbo.chat_messages(conversation_id,sender_id,content,content_type,is_read,is_edited,is_deleted,created_at,updated_at,design_request_id)
                SELECT c.id,m.actor,m.content,'text',0,0,0,m.sent_at,m.sent_at,m.request_id FROM #LegacyDesignMessages m
                  JOIN dbo.tour_design_requests r ON r.id=m.request_id JOIN dbo.chat_conversations c ON
                  (c.user_one_id=r.user_id AND c.user_two_id=r.agency_id) OR (c.user_one_id=r.agency_id AND c.user_two_id=r.user_id);
                UPDATE c SET last_message_content=m.content,last_message_sender_id=m.sender_id,last_message_at=m.created_at FROM dbo.chat_conversations c
                  CROSS APPLY(SELECT TOP(1) content,sender_id,created_at FROM dbo.chat_messages WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC) m;
                DROP TABLE #LegacyDesignMessages;
                """.Replace("'", "''") + "');");

            migrationBuilder.DropTable(
                name: "tour_design_request_agencies");
            migrationBuilder.DropTable(
                name: "tour_plan_proposals");
            migrationBuilder.DropColumn(
                name: "is_shared_to_customer",
                table: "tours");
            migrationBuilder.DropColumn(
                name: "SharedToCustomer",
                table: "tour_versions");
            migrationBuilder.DropColumn(
                name: "AgreedTourId",
                table: "tour_design_requests");
            migrationBuilder.DropColumn(
                name: "AgreedTourVersion",
                table: "tour_design_requests");
            migrationBuilder.DropColumn(name: "AgreedAt", table: "tour_design_requests");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE dbo.tour_design_requests SET status=CASE status WHEN 'in_progress' THEN 'Contacted' WHEN 'pending' THEN 'Pending' WHEN 'rejected' THEN 'Rejected' WHEN 'cancelled' THEN 'Cancelled' ELSE status END;");

            migrationBuilder.DropForeignKey(
                name: "FK_chat_messages_tour_design_requests_design_request_id",
                table: "chat_messages");

            migrationBuilder.DropForeignKey(
                name: "FK_tours_tour_versions_id_shared_version",
                table: "tours");

            migrationBuilder.DropForeignKey(
                name: "FK_tours_tours_cloned_from_tour_id",
                table: "tours");

            migrationBuilder.DropIndex(
                name: "IX_tours_cloned_from_tour_id",
                table: "tours");

            migrationBuilder.DropIndex(
                name: "IX_tours_design_request_id",
                table: "tours");

            migrationBuilder.DropIndex(
                name: "IX_tours_id_shared_version",
                table: "tours");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_tour_versions_tour_id_version",
                table: "tour_versions");

            migrationBuilder.DropIndex(
                name: "IX_chat_messages_design_request_id_id",
                table: "chat_messages");

            migrationBuilder.DropColumn(
                name: "cloned_from_tour_id",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "shared_version",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "restored_from_version",
                table: "tour_versions");

            migrationBuilder.DropColumn(
                name: "shared_at",
                table: "tour_versions");

            migrationBuilder.DropColumn(
                name: "shared_by",
                table: "tour_versions");

            migrationBuilder.DropColumn(
                name: "rejection_reason",
                table: "tour_design_requests");

            migrationBuilder.DropColumn(
                name: "design_request_id",
                table: "chat_messages");

            migrationBuilder.DropColumn(
                name: "tour_version",
                table: "bookings");

            migrationBuilder.RenameColumn(
                name: "responded_at",
                table: "tour_design_requests",
                newName: "AgreedAt");

            migrationBuilder.AddColumn<bool>(
                name: "is_shared_to_customer",
                table: "tours",
                type: "bit",
                nullable: true,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SharedToCustomer",
                table: "tour_versions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "tour_design_requests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                defaultValue: "Pending",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true,
                oldDefaultValue: "pending");

            migrationBuilder.AddColumn<int>(
                name: "AgreedTourId",
                table: "tour_design_requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AgreedTourVersion",
                table: "tour_design_requests",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "tour_design_request_agencies",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    request_id = table.Column<int>(type: "int", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()"),
                    communication_notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_host = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    responded_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    stage_area = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true, defaultValue: "PENDING"),
                    suggested_budget = table.Column<decimal>(type: "decimal(12,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_design_request_agencies", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_design_request_agencies_tour_design_requests_request_id",
                        column: x => x.request_id,
                        principalTable: "tour_design_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_design_request_agencies_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tour_plan_proposals",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    agency_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    agency_reply = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    base_tour_version = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    customer_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    proposal_json = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    request_id = table.Column<int>(type: "int", nullable: false),
                    responded_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    tour_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tour_plan_proposals", x => x.id);
                    table.ForeignKey(
                        name: "FK_tour_plan_proposals_tour_design_requests_request_id",
                        column: x => x.request_id,
                        principalTable: "tour_design_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_plan_proposals_tours_tour_id",
                        column: x => x.tour_id,
                        principalTable: "tours",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_plan_proposals_users_agency_id",
                        column: x => x.agency_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tour_plan_proposals_users_customer_id",
                        column: x => x.customer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tours_design_request_id",
                table: "tours",
                column: "design_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_request_agencies_agency_id",
                table: "tour_design_request_agencies",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_request_agencies_request_id",
                table: "tour_design_request_agencies",
                column: "request_id",
                unique: true,
                filter: "[is_host] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_tour_design_request_agencies_request_id_agency_id",
                table: "tour_design_request_agencies",
                columns: new[] { "request_id", "agency_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tour_plan_proposals_agency_id_status",
                table: "tour_plan_proposals",
                columns: new[] { "agency_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_tour_plan_proposals_customer_id",
                table: "tour_plan_proposals",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_tour_plan_proposals_request_id_created_at",
                table: "tour_plan_proposals",
                columns: new[] { "request_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_tour_plan_proposals_tour_id",
                table: "tour_plan_proposals",
                column: "tour_id");
        }
    }
}
