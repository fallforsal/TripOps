using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class DesignServiceCosting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_WorkflowNotifications",
                table: "WorkflowNotifications");

            migrationBuilder.RenameTable(
                name: "WorkflowNotifications",
                newName: "workflow_notifications");

            migrationBuilder.RenameIndex(
                name: "IX_WorkflowNotifications_UserId_CreatedAt",
                table: "workflow_notifications",
                newName: "IX_workflow_notifications_UserId_CreatedAt");

            migrationBuilder.AddColumn<string>(
                name: "CostUnit",
                table: "tourist_locations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "tourist_locations",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ServiceId",
                table: "tourist_locations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "tourist_locations",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "PriceUnit",
                table: "services",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "service_date_to",
                table: "booking_supplier_requests",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "service_date_from",
                table: "booking_supplier_requests",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CostUnit",
                table: "booking_locations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "booking_locations",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ServiceId",
                table: "booking_locations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "booking_locations",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddPrimaryKey(
                name: "PK_workflow_notifications",
                table: "workflow_notifications",
                column: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_workflow_notifications",
                table: "workflow_notifications");

            migrationBuilder.DropColumn(
                name: "CostUnit",
                table: "tourist_locations");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "tourist_locations");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "tourist_locations");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "tourist_locations");

            migrationBuilder.DropColumn(
                name: "PriceUnit",
                table: "services");

            migrationBuilder.DropColumn(
                name: "CostUnit",
                table: "booking_locations");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "booking_locations");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "booking_locations");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "booking_locations");

            migrationBuilder.RenameTable(
                name: "workflow_notifications",
                newName: "WorkflowNotifications");

            migrationBuilder.RenameIndex(
                name: "IX_workflow_notifications_UserId_CreatedAt",
                table: "WorkflowNotifications",
                newName: "IX_WorkflowNotifications_UserId_CreatedAt");

            migrationBuilder.AlterColumn<DateTime>(
                name: "service_date_to",
                table: "booking_supplier_requests",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "service_date_from",
                table: "booking_supplier_requests",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_WorkflowNotifications",
                table: "WorkflowNotifications",
                column: "Id");
        }
    }
}
