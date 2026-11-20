SET NOCOUNT ON;
DECLARE @domain nvarchar(80) = N'%@regional-demo.tripops.test';
DECLARE @prefix nvarchar(20) = N'REG26-%';

IF (SELECT COUNT(*) FROM users WHERE email LIKE @domain AND role = N'TravelAgency') <> 19
    THROW 51000, 'Expected 19 demo agencies.', 1;
IF (SELECT COUNT(*) FROM users WHERE email LIKE @domain) <> 172
    THROW 51000, 'Expected 172 fixture identities.', 1;
IF (SELECT COUNT(*) FROM tours WHERE tour_code LIKE @prefix AND visibility = N'public') <> 38
    THROW 51000, 'Expected 38 public tours.', 1;
IF (SELECT COUNT(*) FROM bookings WHERE booking_code LIKE @prefix) <> 228
    THROW 51000, 'Expected 228 fixture bookings.', 1;
IF EXISTS (SELECT 1 FROM tours t JOIN tour_provinces p ON p.tour_id=t.id
    WHERE t.tour_code LIKE @prefix GROUP BY t.id HAVING COUNT(*) <> 1)
    THROW 51000, 'A fixture tour has an unexpected number of provinces.', 1;
IF EXISTS (SELECT 1 FROM tours t JOIN tour_provinces p ON p.tour_id=t.id
    WHERE t.tour_code LIKE @prefix GROUP BY p.province_code HAVING COUNT(DISTINCT t.agency_id) <> 1)
    THROW 51000, 'More than one fixture agency is assigned to one province.', 1;
IF EXISTS (SELECT 1 FROM bookings b JOIN booking_agencies a ON a.booking_id=b.id
    WHERE b.booking_code LIKE @prefix AND a.auto_payout_at IS NOT NULL)
    THROW 51000, 'A fixture booking must never be scheduled for an automatic payout.', 1;
IF EXISTS (SELECT 1 FROM bookings b JOIN payment_transactions p ON p.booking_id=b.id
    WHERE b.booking_code LIKE @prefix AND (p.payment_method <> N'DEMO' OR p.gateway_link_id IS NOT NULL))
    THROW 51000, 'Fixture payments must be simulations without gateway links.', 1;
IF EXISTS (SELECT 1 FROM bookings b
    WHERE b.booking_code LIKE @prefix AND b.status=N'Completed'
      AND (b.payment_status <> N'Paid' OR b.total_price <> COALESCE((SELECT SUM(t.amount) FROM payment_transactions t WHERE t.booking_id=b.id AND t.status=N'Success'),0)))
    THROW 51000, 'A completed fixture booking has an inconsistent payment total.', 1;
IF EXISTS (SELECT 1 FROM bookings b
    WHERE b.booking_code LIKE @prefix AND b.total_price <> COALESCE((SELECT SUM(p.price) FROM booking_participants p WHERE p.booking_id=b.id),0))
    THROW 51000, 'Participant prices do not balance to booking sale.', 1;
IF EXISTS (SELECT 1 FROM bookings b WHERE b.booking_code LIKE @prefix AND ISJSON(b.tour_configuration_data)<>1)
    THROW 51000, 'A booking is missing its frozen tour configuration.', 1;

SELECT u.role, COUNT(*) AS fixture_accounts FROM users u WHERE email LIKE @domain GROUP BY u.role;
SELECT b.status, COUNT(*) AS fixture_bookings FROM bookings b WHERE b.booking_code LIKE @prefix GROUP BY b.status;
SELECT p.province_code, COUNT(DISTINCT t.agency_id) AS agencies, COUNT(DISTINCT t.id) AS public_tours
FROM tours t JOIN tour_provinces p ON p.tour_id=t.id WHERE t.tour_code LIKE @prefix GROUP BY p.province_code ORDER BY p.province_code;
SELECT N'OK: regional fixture invariants passed' AS verification;
