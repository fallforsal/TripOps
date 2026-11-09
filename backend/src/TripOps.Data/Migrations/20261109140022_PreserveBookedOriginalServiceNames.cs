using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class PreserveBookedOriginalServiceNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Preserve the current selection before correcting legacy originals. Only the first
            // quotation's matching slot is evidence of what the customer actually booked.
            migrationBuilder.Sql("""
                UPDATE dbo.booking_hotels SET current_hotel_name = original_hotel_name WHERE current_hotel_name IS NULL;
                UPDATE dbo.booking_hotels SET current_stars = original_stars WHERE current_stars IS NULL;
                UPDATE dbo.booking_restaurants SET current_restaurant_name = original_restaurant_name WHERE current_restaurant_name IS NULL;
                UPDATE dbo.booking_locations SET current_location_name = original_location_name WHERE current_location_name IS NULL;

                UPDATE h SET original_hotel_name = initial.name
                FROM dbo.booking_hotels h
                CROSS APPLY (SELECT TOP (1) q.lines_json FROM dbo.booking_quotations q
                    WHERE q.booking_id = h.booking_id ORDER BY q.version, q.id) first_plan
                CROSS APPLY OPENJSON(CASE WHEN ISJSON(first_plan.lines_json) = 1 THEN first_plan.lines_json ELSE N'[]' END)
                    WITH (slot_key nvarchar(100) '$.slotKey', name nvarchar(255) '$.name') initial
                WHERE initial.slot_key = CONCAT('hotel:', h.id) AND NULLIF(LTRIM(RTRIM(initial.name)), N'') IS NOT NULL;

                UPDATE m SET original_restaurant_name = initial.name
                FROM dbo.booking_restaurants m
                JOIN dbo.booking_timelines d ON d.id = m.booking_timeline_id
                CROSS APPLY (SELECT TOP (1) q.lines_json FROM dbo.booking_quotations q
                    WHERE q.booking_id = d.booking_id ORDER BY q.version, q.id) first_plan
                CROSS APPLY OPENJSON(CASE WHEN ISJSON(first_plan.lines_json) = 1 THEN first_plan.lines_json ELSE N'[]' END)
                    WITH (slot_key nvarchar(100) '$.slotKey', name nvarchar(255) '$.name') initial
                WHERE initial.slot_key = CONCAT('meal:', m.id) AND NULLIF(LTRIM(RTRIM(initial.name)), N'') IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data correction only. Do not restore the incorrect default-tour names or erase selections.
        }
    }
}
