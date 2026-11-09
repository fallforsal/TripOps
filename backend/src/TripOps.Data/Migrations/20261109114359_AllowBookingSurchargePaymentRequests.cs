using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AllowBookingSurchargePaymentRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_payment_requests_stage",
                table: "payment_requests");

            migrationBuilder.AddCheckConstraint(
                name: "CK_payment_requests_stage",
                table: "payment_requests",
                sql: "[stage] IS NULL OR [stage] IN ('deposit', 'balance') OR [stage] LIKE 'fee:%'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_payment_requests_stage",
                table: "payment_requests");

            migrationBuilder.AddCheckConstraint(
                name: "CK_payment_requests_stage",
                table: "payment_requests",
                sql: "[stage] IS NULL OR [stage] IN ('deposit', 'balance')");
        }
    }
}
