using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingProposalEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "booking_proposal_events",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    snapshot_id = table.Column<int>(type: "int", nullable: false),
                    actor_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    recipient_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    event_type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    read_at = table.Column<DateTime>(type: "datetime2", nullable: true)
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_proposal_events");
        }
    }
}
