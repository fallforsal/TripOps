using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplementarySupplierRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "parent_request_id",
                table: "booking_supplier_requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "participant_indices_json",
                table: "booking_supplier_requests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_supplier_requests_parent_request_id",
                table: "booking_supplier_requests",
                column: "parent_request_id");

            migrationBuilder.AddForeignKey(
                name: "FK_booking_supplier_requests_booking_supplier_requests_parent_request_id",
                table: "booking_supplier_requests",
                column: "parent_request_id",
                principalTable: "booking_supplier_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_booking_supplier_requests_booking_supplier_requests_parent_request_id",
                table: "booking_supplier_requests");

            migrationBuilder.DropIndex(
                name: "IX_booking_supplier_requests_parent_request_id",
                table: "booking_supplier_requests");

            migrationBuilder.DropColumn(
                name: "parent_request_id",
                table: "booking_supplier_requests");

            migrationBuilder.DropColumn(
                name: "participant_indices_json",
                table: "booking_supplier_requests");
        }
    }
}
