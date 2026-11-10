using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAgencyParticipantCreationKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "creation_key",
                table: "booking_participants",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_booking_id_creation_key",
                table: "booking_participants",
                columns: new[] { "booking_id", "creation_key" },
                unique: true,
                filter: "[creation_key] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_booking_participants_booking_id_creation_key",
                table: "booking_participants");

            migrationBuilder.DropColumn(
                name: "creation_key",
                table: "booking_participants");
        }
    }
}
