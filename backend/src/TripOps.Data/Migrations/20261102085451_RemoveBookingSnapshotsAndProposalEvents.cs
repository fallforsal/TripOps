using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveBookingSnapshotsAndProposalEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_proposal_events");

            migrationBuilder.DropTable(
                name: "booking_snapshots");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "booking_snapshots",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    accepted_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: true),
                    booking_id = table.Column<int>(type: "int", nullable: false),
                    created_by = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    accepted_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    snapshot_data = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    snapshot_type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    source_tour_version = table.Column<int>(type: "int", nullable: true),
                    version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_snapshots", x => x.id);
                    table.CheckConstraint("CK_booking_snapshots_accepted", "([snapshot_type] = 'agreed' AND [accepted_at] IS NOT NULL AND [accepted_by] IS NOT NULL) OR ([snapshot_type] IN ('initial_request', 'proposal') AND [accepted_at] IS NULL AND [accepted_by] IS NULL)");
                    table.CheckConstraint("CK_booking_snapshots_data_isjson", "ISJSON([snapshot_data]) = 1");
                    table.CheckConstraint("CK_booking_snapshots_type", "[snapshot_type] IN ('initial_request', 'proposal', 'agreed')");
                    table.CheckConstraint("CK_booking_snapshots_version", "[version] > 0");
                    table.ForeignKey(
                        name: "FK_booking_snapshots_bookings_booking_id",
                        column: x => x.booking_id,
                        principalTable: "bookings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_snapshots_users_accepted_by",
                        column: x => x.accepted_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_snapshots_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_proposal_events",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    snapshot_id = table.Column<int>(type: "int", nullable: false),
                    actor_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    event_type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    read_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    recipient_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_proposal_events", x => x.id);
                    table.CheckConstraint("CK_booking_proposal_events_type", "[event_type] IN ('proposal_sent', 'proposal_accepted', 'changes_requested')");
                    table.ForeignKey(
                        name: "FK_booking_proposal_events_booking_snapshots_snapshot_id",
                        column: x => x.snapshot_id,
                        principalTable: "booking_snapshots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_proposal_events_users_actor_id",
                        column: x => x.actor_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_booking_proposal_events_users_recipient_id",
                        column: x => x.recipient_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_booking_proposal_events_actor_id",
                table: "booking_proposal_events",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_proposal_events_recipient_id_read_at_created_at",
                table: "booking_proposal_events",
                columns: new[] { "recipient_id", "read_at", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_proposal_events_snapshot_id_event_type_recipient_id",
                table: "booking_proposal_events",
                columns: new[] { "snapshot_id", "event_type", "recipient_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_snapshots_accepted_by",
                table: "booking_snapshots",
                column: "accepted_by");

            migrationBuilder.CreateIndex(
                name: "IX_booking_snapshots_booking_id_snapshot_type_version",
                table: "booking_snapshots",
                columns: new[] { "booking_id", "snapshot_type", "version" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_snapshots_booking_id_version",
                table: "booking_snapshots",
                columns: new[] { "booking_id", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_snapshots_created_by",
                table: "booking_snapshots",
                column: "created_by");
        }
    }
}
