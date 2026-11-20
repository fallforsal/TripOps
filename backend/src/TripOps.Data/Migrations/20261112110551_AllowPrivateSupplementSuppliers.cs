using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AllowPrivateSupplementSuppliers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "service_id",
                table: "booking_supplier_requests",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "provider_id",
                table: "booking_supplier_requests",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(36)",
                oldMaxLength: 36);

            migrationBuilder.AddColumn<int>(
                name: "agency_supplier_id",
                table: "booking_supplier_requests",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_supplier_requests_agency_supplier_id",
                table: "booking_supplier_requests",
                column: "agency_supplier_id");

            migrationBuilder.AddForeignKey(
                name: "FK_booking_supplier_requests_agency_suppliers_agency_supplier_id",
                table: "booking_supplier_requests",
                column: "agency_supplier_id",
                principalTable: "agency_suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_booking_supplier_requests_agency_suppliers_agency_supplier_id",
                table: "booking_supplier_requests");

            migrationBuilder.DropIndex(
                name: "IX_booking_supplier_requests_agency_supplier_id",
                table: "booking_supplier_requests");

            migrationBuilder.DropColumn(
                name: "agency_supplier_id",
                table: "booking_supplier_requests");

            migrationBuilder.AlterColumn<int>(
                name: "service_id",
                table: "booking_supplier_requests",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "provider_id",
                table: "booking_supplier_requests",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(36)",
                oldMaxLength: 36,
                oldNullable: true);
        }
    }
}
