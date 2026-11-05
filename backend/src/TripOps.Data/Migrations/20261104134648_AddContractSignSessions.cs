using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContractSignSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "contract_sign_sessions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    contract_id = table.Column<int>(type: "int", nullable: false),
                    token_hash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    expires_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    otp_hash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    otp_expires_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    otp_sent_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    otp_send_count = table.Column<int>(type: "int", nullable: false),
                    otp_attempts = table.Column<int>(type: "int", nullable: false),
                    completed_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    signer_ip = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: true),
                    signer_user_agent = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contract_sign_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_contract_sign_sessions_booking_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "booking_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_contract_sign_sessions_contract_id",
                table: "contract_sign_sessions",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "IX_contract_sign_sessions_token_hash",
                table: "contract_sign_sessions",
                column: "token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contract_sign_sessions");
        }
    }
}
