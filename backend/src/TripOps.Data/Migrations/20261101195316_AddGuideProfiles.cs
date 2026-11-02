using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGuideProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "guide_profiles",
                columns: table => new
                {
                    user_id = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    experience_years = table.Column<short>(type: "smallint", nullable: false),
                    languages = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    routes = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    specialties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    bio = table.Column<string>(type: "nvarchar(max)", maxLength: 5000, nullable: true),
                    suspended_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    suspended_reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guide_profiles", x => x.user_id);
                    table.CheckConstraint("CK_guide_profiles_experience", "experience_years BETWEEN 0 AND 50");
                    table.ForeignKey(
                        name: "FK_guide_profiles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });
            migrationBuilder.Sql(@"
INSERT INTO guide_profiles (user_id, experience_years, languages, routes, specialties, created_at, updated_at)
SELECT id, 0, N'[]', N'[]', N'[]', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM users WHERE role = N'TourGuide';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "guide_profiles");
        }
    }
}
