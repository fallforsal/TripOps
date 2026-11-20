using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingParticipantPhone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "phone_number",
                table: "booking_participants",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            // Earlier versions embedded the phone in note. Preserve note and copy only that line.
            migrationBuilder.Sql("""
                UPDATE p SET phone_number = phone.value
                FROM dbo.booking_participants AS p
                CROSS APPLY (SELECT REPLACE(COALESCE(p.note, N''), CHAR(13), N'') AS text) AS notes
                CROSS APPLY (SELECT CHARINDEX(NCHAR(10) + N'Điện thoại: ', NCHAR(10) + notes.text) AS position) AS marker
                CROSS APPLY (SELECT CASE WHEN marker.position > 0 THEN marker.position + LEN(N'Điện thoại: ') END AS start) AS part
                CROSS APPLY (SELECT LTRIM(RTRIM(SUBSTRING(notes.text, part.start,
                    CHARINDEX(NCHAR(10), notes.text + NCHAR(10), part.start) - part.start))) AS value) AS phone
                WHERE p.phone_number IS NULL AND marker.position > 0 AND LEN(phone.value) BETWEEN 1 AND 30;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "phone_number",
                table: "booking_participants");
        }
    }
}
