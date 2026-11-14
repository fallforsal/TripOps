using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintMessages : Migration
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

            migrationBuilder.CreateTable(
                name: "complaint_messages",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    complaint_id = table.Column<int>(type: "int", nullable: false),
                    sender_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    sender_role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    attachment_urls = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_complaint_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_complaint_messages_complaints_complaint_id",
                        column: x => x.complaint_id,
                        principalTable: "complaints",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_complaint_messages_users_sender_id",
                        column: x => x.sender_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_complaints_customer_id_created_at",
                table: "complaints",
                columns: new[] { "customer_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_complaint_messages_complaint_id",
                table: "complaint_messages",
                column: "complaint_id");

            migrationBuilder.CreateIndex(
                name: "IX_complaint_messages_sender_id",
                table: "complaint_messages",
                column: "sender_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "complaint_messages");

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
