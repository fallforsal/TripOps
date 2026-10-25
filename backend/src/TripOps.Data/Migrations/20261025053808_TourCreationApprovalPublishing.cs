using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class TourCreationApprovalPublishing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Preserve conflicting legacy history for operator review rather than silently renumbering it.
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM tour_versions GROUP BY TourId, VersionNumber HAVING COUNT(*) > 1)
                    THROW 51000, 'Duplicate tour history versions must be resolved before deploying WF02.', 1;
                """);

            migrationBuilder.DropIndex(
                name: "IX_tour_versions_TourId",
                table: "tour_versions");

            migrationBuilder.AddColumn<string>(
                name: "ApprovalStatus",
                table: "tours",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "NotSubmitted");

            migrationBuilder.AddColumn<int>(
                name: "ApprovedVersion",
                table: "tours",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Destination",
                table: "tours",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAiGenerated",
                table: "tours",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Message",
                table: "tours",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OperationPeriod",
                table: "tours",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "tours",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "tours",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewedBy",
                table: "tours",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SubmittedVersion",
                table: "tours",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "tour_versions",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "tour_versions",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TransportationServiceId",
                table: "tour_timeline",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "tour_pricing_tiers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxAge",
                table: "tour_pricing_tiers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinAge",
                table: "tour_pricing_tiers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDefault",
                table: "tour_meals",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceDifference",
                table: "tour_meals",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "RestaurantName",
                table: "tour_meals",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressNotes",
                table: "tour_accommodations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DestinationName",
                table: "tour_accommodations",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDefault",
                table: "tour_accommodations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "NightsCount",
                table: "tour_accommodations",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceDifference",
                table: "tour_accommodations",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "StarRating",
                table: "tour_accommodations",
                type: "int",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.CreateIndex(
                name: "IX_tours_ReviewedBy",
                table: "tours",
                column: "ReviewedBy");

            migrationBuilder.CreateIndex(
                name: "IX_tour_versions_CreatedBy",
                table: "tour_versions",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_tour_versions_TourId_VersionNumber",
                table: "tour_versions",
                columns: new[] { "TourId", "VersionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tour_timeline_TransportationServiceId",
                table: "tour_timeline",
                column: "TransportationServiceId");

            migrationBuilder.AddForeignKey(
                name: "FK_tour_timeline_services_TransportationServiceId",
                table: "tour_timeline",
                column: "TransportationServiceId",
                principalTable: "services",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_tour_versions_users_CreatedBy",
                table: "tour_versions",
                column: "CreatedBy",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_tours_users_ReviewedBy",
                table: "tours",
                column: "ReviewedBy",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tour_timeline_services_TransportationServiceId",
                table: "tour_timeline");

            migrationBuilder.DropForeignKey(
                name: "FK_tour_versions_users_CreatedBy",
                table: "tour_versions");

            migrationBuilder.DropForeignKey(
                name: "FK_tours_users_ReviewedBy",
                table: "tours");

            migrationBuilder.DropIndex(
                name: "IX_tours_ReviewedBy",
                table: "tours");

            migrationBuilder.DropIndex(
                name: "IX_tour_versions_CreatedBy",
                table: "tour_versions");

            migrationBuilder.DropIndex(
                name: "IX_tour_versions_TourId_VersionNumber",
                table: "tour_versions");

            migrationBuilder.DropIndex(
                name: "IX_tour_timeline_TransportationServiceId",
                table: "tour_timeline");

            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "ApprovedVersion",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "Destination",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "IsAiGenerated",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "Message",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "OperationPeriod",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "SubmittedVersion",
                table: "tours");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "tour_versions");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "tour_versions");

            migrationBuilder.DropColumn(
                name: "TransportationServiceId",
                table: "tour_timeline");

            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "tour_pricing_tiers");

            migrationBuilder.DropColumn(
                name: "MaxAge",
                table: "tour_pricing_tiers");

            migrationBuilder.DropColumn(
                name: "MinAge",
                table: "tour_pricing_tiers");

            migrationBuilder.DropColumn(
                name: "IsDefault",
                table: "tour_meals");

            migrationBuilder.DropColumn(
                name: "PriceDifference",
                table: "tour_meals");

            migrationBuilder.DropColumn(
                name: "RestaurantName",
                table: "tour_meals");

            migrationBuilder.DropColumn(
                name: "AddressNotes",
                table: "tour_accommodations");

            migrationBuilder.DropColumn(
                name: "DestinationName",
                table: "tour_accommodations");

            migrationBuilder.DropColumn(
                name: "IsDefault",
                table: "tour_accommodations");

            migrationBuilder.DropColumn(
                name: "NightsCount",
                table: "tour_accommodations");

            migrationBuilder.DropColumn(
                name: "PriceDifference",
                table: "tour_accommodations");

            migrationBuilder.DropColumn(
                name: "StarRating",
                table: "tour_accommodations");

            migrationBuilder.CreateIndex(
                name: "IX_tour_versions_TourId",
                table: "tour_versions",
                column: "TourId");
        }
    }
}
