using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAllianceBookingStagesAndSurchargeBeneficiaries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_booking_participants_booking_id_creation_key",
                table: "booking_participants");

            migrationBuilder.DropIndex(
                name: "IX_booking_hotels_booking_id",
                table: "booking_hotels");

            migrationBuilder.AddColumn<string>(
                name: "beneficiary_agency_id",
                table: "payment_requests",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "agency_id",
                table: "booking_restaurants",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "agency_id",
                table: "booking_hotels",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true);

            migrationBuilder.Sql("""
                EXEC(N'
                UPDATE h SET agency_id=COALESCE((SELECT TOP(1) JSON_VALUE(x.value,''$.agencyId'') FROM tour_versions v
                CROSS APPLY OPENJSON(v.tour_snapshot,''$.configuration.timelines'') d CROSS APPLY OPENJSON(d.value,''$.accommodations'') x
                WHERE v.tour_id=b.tour_id AND v.version=b.tour_version AND JSON_VALUE(x.value,''$.hotelName'')=h.original_hotel_name),t.agency_id)
                FROM booking_hotels h JOIN bookings b ON b.id=h.booking_id JOIN tours t ON t.id=b.tour_id;
                UPDATE m SET agency_id=COALESCE((SELECT TOP(1) JSON_VALUE(x.value,''$.agencyId'') FROM tour_versions v
                CROSS APPLY OPENJSON(v.tour_snapshot,''$.configuration.timelines'') d CROSS APPLY OPENJSON(d.value,''$.meals'') x
                WHERE v.tour_id=b.tour_id AND v.version=b.tour_version AND TRY_CONVERT(int,JSON_VALUE(d.value,''$.dayNumber''))=bt.day_number
                AND JSON_VALUE(x.value,''$.mealType'')=m.meal_type AND JSON_VALUE(x.value,''$.restaurantName'')=m.original_restaurant_name),t.agency_id)
                FROM booking_restaurants m JOIN booking_timelines bt ON bt.id=m.booking_timeline_id JOIN bookings b ON b.id=bt.booking_id JOIN tours t ON t.id=b.tour_id;
                UPDATE p SET beneficiary_agency_id=COALESCE((SELECT TOP(1) a.agency_id FROM booking_agencies a WHERE a.booking_id=p.booking_id AND a.agency_id=p.created_by),t.agency_id)
                FROM payment_requests p JOIN bookings b ON b.id=p.booking_id JOIN tours t ON t.id=b.tour_id WHERE p.stage LIKE ''fee:%'';
                -- Convert legacy full-tour passenger rows only when the booked version has explicit Agency prices.
                SELECT p.id AS source_id,a.agency_id,CONVERT(decimal(12,2),JSON_VALUE(price.value,''$.pricePerGuest'')) AS stage_price
                INTO #stage_backfill FROM booking_participants p JOIN bookings b ON b.id=p.booking_id JOIN tours t ON t.id=b.tour_id
                JOIN booking_agencies a ON a.booking_id=b.id AND a.agency_id<>p.agency_id
                JOIN tour_versions v ON v.tour_id=b.tour_id AND v.version=b.tour_version
                CROSS APPLY OPENJSON(v.tour_snapshot,''$.configuration.agencyPricing'') ap CROSS APPLY OPENJSON(ap.value,''$.tiers'') price
                CROSS APPLY (SELECT DATEDIFF(year,p.date_of_birth,b.departure_date)-CASE WHEN DATEADD(year,DATEDIFF(year,p.date_of_birth,b.departure_date),p.date_of_birth)>b.departure_date THEN 1 ELSE 0 END AS age) ages
                WHERE p.is_primary=1 AND p.agency_id=t.agency_id AND JSON_VALUE(ap.value,''$.agencyId'')=a.agency_id
                AND ((p.date_of_birth IS NOT NULL AND ages.age>=COALESCE(TRY_CONVERT(int,JSON_VALUE(price.value,''$.minAge'')),0) AND ages.age<=COALESCE(TRY_CONVERT(int,JSON_VALUE(price.value,''$.maxAge'')),150))
                OR (p.date_of_birth IS NULL AND JSON_VALUE(price.value,''$.name'')=p.tier_name))
                AND NOT EXISTS(SELECT 1 FROM booking_participants old WHERE old.booking_id=b.id AND old.participant_index=p.participant_index AND old.agency_id=a.agency_id);
                IF EXISTS(SELECT 1 FROM #stage_backfill f JOIN booking_participants p ON p.id=f.source_id GROUP BY f.source_id,p.price HAVING SUM(f.stage_price)>p.price)
                THROW 51000, ''Legacy passenger price is below partner shares. Review allocation before migration.'',1;
                INSERT INTO booking_participants(booking_id,agency_id,participant_index,is_primary,creation_key,full_name,date_of_birth,gender,identity_card_number,note,tier_name,price,attendance_status,status,status_note,roommate_note,restaurant_note,created_at,updated_at)
                SELECT p.booking_id,f.agency_id,p.participant_index,0,p.creation_key,p.full_name,p.date_of_birth,p.gender,p.identity_card_number,p.note,p.tier_name,f.stage_price,''pending'',p.status,p.status_note,p.roommate_note,p.restaurant_note,p.created_at,p.updated_at
                FROM #stage_backfill f JOIN booking_participants p ON p.id=f.source_id;
                UPDATE p SET price=p.price-f.amount FROM booking_participants p JOIN (SELECT source_id,SUM(stage_price) AS amount FROM #stage_backfill GROUP BY source_id) f ON f.source_id=p.id;
                DROP TABLE #stage_backfill;
                ');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_payment_requests_booking_id_beneficiary_agency_id",
                table: "payment_requests",
                columns: new[] { "booking_id", "beneficiary_agency_id" });

            migrationBuilder.CreateIndex(
                name: "IX_booking_restaurants_agency_id",
                table: "booking_restaurants",
                column: "agency_id");

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_booking_id_agency_id_creation_key",
                table: "booking_participants",
                columns: new[] { "booking_id", "agency_id", "creation_key" },
                unique: true,
                filter: "[creation_key] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_booking_id_participant_index_agency_id",
                table: "booking_participants",
                columns: new[] { "booking_id", "participant_index", "agency_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_hotels_booking_id_agency_id",
                table: "booking_hotels",
                columns: new[] { "booking_id", "agency_id" });

            migrationBuilder.AddForeignKey(
                name: "FK_booking_hotels_booking_agencies_booking_id_agency_id",
                table: "booking_hotels",
                columns: new[] { "booking_id", "agency_id" },
                principalTable: "booking_agencies",
                principalColumns: new[] { "booking_id", "agency_id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_booking_restaurants_users_agency_id",
                table: "booking_restaurants",
                column: "agency_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payment_requests_booking_agencies_booking_id_beneficiary_agency_id",
                table: "payment_requests",
                columns: new[] { "booking_id", "beneficiary_agency_id" },
                principalTable: "booking_agencies",
                principalColumns: new[] { "booking_id", "agency_id" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF EXISTS(SELECT 1 FROM booking_participants WHERE creation_key IS NOT NULL GROUP BY booking_id,creation_key HAVING COUNT(*)>1) THROW 51000, 'Stage copies share a creation key; restore the database backup to downgrade safely.',1;");
            migrationBuilder.DropForeignKey(
                name: "FK_booking_hotels_booking_agencies_booking_id_agency_id",
                table: "booking_hotels");

            migrationBuilder.DropForeignKey(
                name: "FK_booking_restaurants_users_agency_id",
                table: "booking_restaurants");

            migrationBuilder.DropForeignKey(
                name: "FK_payment_requests_booking_agencies_booking_id_beneficiary_agency_id",
                table: "payment_requests");

            migrationBuilder.DropIndex(
                name: "IX_payment_requests_booking_id_beneficiary_agency_id",
                table: "payment_requests");

            migrationBuilder.DropIndex(
                name: "IX_booking_restaurants_agency_id",
                table: "booking_restaurants");

            migrationBuilder.DropIndex(
                name: "IX_booking_participants_booking_id_agency_id_creation_key",
                table: "booking_participants");

            migrationBuilder.DropIndex(
                name: "IX_booking_participants_booking_id_participant_index_agency_id",
                table: "booking_participants");

            migrationBuilder.DropIndex(
                name: "IX_booking_hotels_booking_id_agency_id",
                table: "booking_hotels");

            migrationBuilder.DropColumn(
                name: "beneficiary_agency_id",
                table: "payment_requests");

            migrationBuilder.DropColumn(
                name: "agency_id",
                table: "booking_restaurants");

            migrationBuilder.DropColumn(
                name: "agency_id",
                table: "booking_hotels");

            migrationBuilder.CreateIndex(
                name: "IX_booking_participants_booking_id_creation_key",
                table: "booking_participants",
                columns: new[] { "booking_id", "creation_key" },
                unique: true,
                filter: "[creation_key] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_booking_hotels_booking_id",
                table: "booking_hotels",
                column: "booking_id");
        }
    }
}
