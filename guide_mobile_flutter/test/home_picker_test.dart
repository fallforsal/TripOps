import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/home/domain/home_trip_picker.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';

BookingSummary b(int id, String date, String status) => BookingSummary(
  id: id, code: 'B$id', name: 'Tour $id',
  startDate: DateTime.parse(date), status: status, guestCount: 12,
);

void main() {
  final today = DateTime(2026, 11, 8);

  test('today tour wins over future and completed past bookings', () {
    final result = selectHomeTrip([
      b(1, '2026-11-10', 'Confirmed'),
      b(2, '2026-11-08', 'Paid'),
      b(3, '2026-11-07', 'Completed'),
    ], today);
    expect(result.kind, HomeTripKind.today);
    expect(result.tour?.id, 2);
  });

  test('select nearest future when there is no tour today', () {
    final result = selectHomeTrip([
      b(1, '2026-11-21', 'Confirmed'),
      b(2, '2026-11-10', 'Paid'),
      b(3, '2026-11-09', 'Cancelled'),
      b(4, '2026-11-11', 'Confirmed'),
    ], today);
    expect(result.kind, HomeTripKind.upcoming);
    expect(result.tour?.id, 2);
  });

  test('multi-day in-progress booking is selected using detail endDate', () {
    final result = selectHomeTrip([
      b(5, '2026-11-06', 'InProgress'),
      b(6, '2026-11-10', 'Confirmed'),
    ], today, inProgressEndDates: {5: DateTime(2026, 11, 9)});
    expect(result.kind, HomeTripKind.today);
    expect(result.tour?.id, 5);
  });

  test('stale InProgress tour is not mistaken for today', () {
    final result = selectHomeTrip([
      b(5, '2026-11-01', 'InProgress'),
      b(6, '2026-11-10', 'Confirmed'),
    ], today, inProgressEndDates: {5: DateTime(2026, 11, 3)});
    expect(result.kind, HomeTripKind.upcoming);
    expect(result.tour?.id, 6);
  });

  test('no operational tours gives honest empty state', () {
    final result = selectHomeTrip([
      b(1, '2026-11-04', 'Completed'),
      b(2, '2026-11-10', 'Rejected'),
    ], today);
    expect(result.kind, HomeTripKind.none);
    expect(result.tour, isNull);
  });
}
