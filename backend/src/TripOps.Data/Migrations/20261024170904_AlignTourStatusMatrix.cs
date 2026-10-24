using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AlignTourStatusMatrix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_request",
                table: "tours",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // Preserve publication only for previously published, public tours.
            migrationBuilder.Sql("""
                UPDATE [tours]
                SET [Visibility] = CASE
                        WHEN [IsDeleted] = 0 AND LOWER([Status]) IN ('published', 'completed')
                             AND LOWER([Visibility]) = 'public' THEN 'public'
                        ELSE 'hidden' END,
                    [Status] = CASE
                        WHEN [IsDeleted] = 1 OR LOWER([Status]) = 'deleted' THEN 'deleted'
                        WHEN LOWER([Status]) = 'draft' THEN 'draft'
                        ELSE 'completed' END,
                    [IsDeleted] = CASE WHEN LOWER([Status]) = 'deleted' THEN 1 ELSE [IsDeleted] END,
                    [DeletedAt] = CASE WHEN [IsDeleted] = 1 OR LOWER([Status]) = 'deleted'
                                       THEN COALESCE([DeletedAt], SYSUTCDATETIME()) ELSE [DeletedAt] END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Old Hidden/Suspended distinctions cannot be recovered after conversion.
            migrationBuilder.Sql("""
                UPDATE [tours]
                SET [Status] = CASE
                        WHEN [Status] = 'draft' THEN 'Draft'
                        WHEN [Status] = 'completed' AND [Visibility] = 'public' THEN 'Published'
                        ELSE 'Hidden' END,
                    [Visibility] = CASE WHEN [Visibility] = 'public' THEN 'Public' ELSE 'Private' END;
                """);
            migrationBuilder.DropColumn(
                name: "is_request",
                table: "tours");
        }
    }
}
