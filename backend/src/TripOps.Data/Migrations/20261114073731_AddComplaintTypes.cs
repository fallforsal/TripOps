using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_complaints_customer_id",
                table: "complaints");

            migrationBuilder.AlterColumn<int>(
                name: "booking_id",
                table: "complaints",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "agency_id",
                table: "complaints",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(36)",
                oldMaxLength: 36);

            migrationBuilder.AddColumn<string>(
                name: "complaint_type",
                table: "complaints",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Trip");

            migrationBuilder.AddColumn<string>(
                name: "reason_code",
                table: "complaints",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "other");

            migrationBuilder.CreateIndex(
                name: "IX_complaints_customer_id_created_at",
                table: "complaints",
                columns: new[] { "customer_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_complaints_customer_id_created_at",
                table: "complaints");

            migrationBuilder.DropColumn(
                name: "complaint_type",
                table: "complaints");

            migrationBuilder.DropColumn(
                name: "reason_code",
                table: "complaints");

            migrationBuilder.AlterColumn<int>(
                name: "booking_id",
                table: "complaints",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "agency_id",
                table: "complaints",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(36)",
                oldMaxLength: 36,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_complaints_customer_id",
                table: "complaints",
                column: "customer_id");
        }
    }
}
