import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/src/models.dart';

void main() {
  test('Guide booking list deserializes ASP.NET Core BookingListItem', () {
    final summary = BookingSummary.fromJson({
      'id': 17,
      'bookingCode': 'BK-2026-0017',
      'tourName': 'Đà Nẵng – Hội An',
      'customerName': 'Khách hàng',
      'contactPhone': '0900000000',
      'startDate': '2026-11-10T00:00:00',
      'totalGuests': 14,
      'totalAmount': 20000000,
      'paidAmount': 10000000,
      'status': 'Confirmed',
      'paymentStatus': 'PartiallyPaid',
      'createdAt': '2026-11-01T00:00:00Z',
    });
    expect(summary.id, 17);
    expect(summary.startDate, DateTime(2026, 11, 10));
    expect(summary.isActive, isTrue);
    expect(summary.guestCount, 14);
  });

  test('BookingDto detail reads participants, days, incidents and endDate', () {
    final detail = BookingDetail.fromJson({
      'id': 17,
      'bookingCode': 'BK-2026-0017',
      'tourName': 'Đà Nẵng – Hội An',
      'status': 'InProgress',
      'startDate': '2026-11-10T00:00:00',
      'endDate': '2026-11-12T00:00:00',
      'totalGuests': 2,
      'agencyName': 'Trip Agency',
      'participants': [
        {'id': 8, 'fullName': 'Nguyễn An', 'attendanceStatus': 'CheckedIn',
         'status': 'ACTIVE', 'phoneNumber': '0900000001'},
      ],
      'snapshotDays': [
        {'id': 71, 'dayNumber': 1, 'title': 'Khởi hành',
         'description': null, 'locations': [
           {'id': 25, 'name': 'Phố cổ Hội An', 'time': null,
            'attendanceStatus': 'Pending'},
         ], 'meals': []},
      ],
      'incidents': [
        {'id': 2, 'bookingId': 17, 'title': 'Kẹt xe',
         'description': 'Đoàn chậm 20 phút\nMức độ: Low',
         'resolutionNotes': 'Low', 'status': 'Reported',
         'createdAt': '2026-11-10T06:00:00Z'},
      ],
    });

    expect(detail.endDate, DateTime(2026, 11, 12));
    expect(detail.passengers.single.status, 'CheckedIn');
    expect(detail.days.single.stops.single.id, 25);
    expect(detail.incidents.single.status, 'Reported');
  });

  test('date parsing preserves backend calendar day regardless of timezone', () {
    expect(parseCalendarDate('2026-11-08T00:00:00Z'),
      DateTime(2026, 11, 8));
    expect(parseCalendarDate('2026-11-08T00:00:00+07:00'),
      DateTime(2026, 11, 8));
  });
}
