import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/src/models.dart';
import 'package:tripops_guide/src/tour_catalog.dart';

BookingSummary booking(int id, String name, String date, String status) =>
    BookingSummary(
      id: id,
      code: 'BK-$id',
      name: name,
      startDate: DateTime.parse(date),
      status: status,
      guestCount: 6,
    );

void main() {
  final now = DateTime(2026, 11, 8, 10);

  test('upcoming includes today and future Confirmed/Paid, nearest first', () {
    final result = filterBookings([
      booking(1, 'Đà Lạt', '2026-11-15', 'Confirmed'),
      booking(2, 'Phú Quốc', '2026-11-08', 'Paid'),
      booking(3, 'Huế', '2026-11-07', 'Confirmed'),
      booking(4, 'Nha Trang', '2026-11-10', 'InProgress'),
      booking(5, 'Hạ Long', '2026-11-09', 'Cancelled'),
    ], filter: TourFilter.upcoming, today: now);
    expect(result.map((b) => b.id).toList(), [2, 1]);
  });

  test('in progress includes multi-day tours started before today', () {
    final result = filterBookings([
      booking(1, 'Đà Lạt', '2026-11-06', 'InProgress'),
      booking(2, 'Huế', '2026-11-08', 'Confirmed'),
    ], filter: TourFilter.inProgress, today: now);
    expect(result.single.id, 1);
  });

  test('completed filter excludes cancelled and sorts newest first', () {
    final result = filterBookings([
      booking(1, 'Đà Lạt', '2026-10-01', 'Completed'),
      booking(2, 'Huế', '2026-11-02', 'Completed'),
      booking(3, 'Sapa', '2026-11-04', 'Cancelled'),
    ], filter: TourFilter.completed, today: now);
    expect(result.map((b) => b.id).toList(), [2, 1]);
  });

  test('search ignores Vietnamese accents and case for name and code', () {
    final data = [
      booking(1, 'Hành trình Đà Lạt', '2026-11-10', 'Paid'),
      booking(2, 'Hà Nội', '2026-11-12', 'Paid'),
    ];
    expect(filterBookings(data, filter: TourFilter.all, today: now,
      query: 'da lat').single.id, 1);
    expect(filterBookings(data, filter: TourFilter.all, today: now,
      query: 'bK-2').single.id, 2);
  });

  test('no matches returns an empty list without inventing tours', () {
    final result = filterBookings([], filter: TourFilter.all, today: now,
      query: 'anything');
    expect(result, isEmpty);
  });
}
