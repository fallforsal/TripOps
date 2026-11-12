import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/location_checkin/presentation/location_screen.dart';

class _FakeGuides implements GuideRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

BookingDetail _detail({
  required bool dateAllowed,
  int? nextId = 1,
}) => BookingDetail(
  id: 123,
  code: 'BK-123',
  name: 'Tour Vũng Tàu',
  status: 'Confirmed',
  startDate: DateTime(2026, 11, 12),
  endDate: DateTime(2026, 11, 14),
  totalGuests: 1,
  passengers: const [],
  incidents: const [],
  canCheckInLocations: dateAllowed,
  nextLocationCheckInId: nextId,
  days: [
    TourDay(dayNumber: 1, title: 'Ngày 1', stops: [
      const TourStop(id: 1, name: 'Điểm A', status: 'Pending'),
      const TourStop(id: 2, name: 'Điểm B', status: 'Pending'),
    ]),
    TourDay(dayNumber: 2, title: 'Ngày 2', stops: [
      const TourStop(id: 3, name: 'Điểm C', status: 'Pending'),
    ]),
  ],
);

Future<void> showScreen(WidgetTester tester, BookingDetail detail) async {
  tester.view.physicalSize = const Size(430, 1700);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
  await tester.pumpWidget(MaterialApp(
    home: LocationScreen(detail: detail, guides: _FakeGuides()),
  ));
}

void main() {
  testWidgets('before departure all check-in actions are disabled', (tester) async {
    await showScreen(tester, _detail(dateAllowed: false));
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('checkin-1'))).onPressed, isNull);
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('checkin-2'))).onPressed, isNull);
    expect(find.textContaining('Chưa đến ngày khởi hành'), findsWidgets);
  });

  testWidgets('on departure date only first itinerary stop is enabled',
      (tester) async {
    await showScreen(tester, _detail(dateAllowed: true));
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('checkin-1'))).onPressed, isNotNull);
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('checkin-2'))).onPressed, isNull);
    expect(find.text('Cần check-in điểm trước đó'), findsWidgets);
    expect(find.textContaining('GPS'), findsOneWidget);
    expect(find.textContaining('Phạm vi GPS'), findsNothing);
    expect(find.text('Bỏ qua'), findsNothing);
  });

  testWidgets('server advancement unlocks the next stop even without GPS',
      (tester) async {
    await showScreen(tester, _detail(dateAllowed: true, nextId: 2));
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('checkin-1'))).onPressed, isNull);
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('checkin-2'))).onPressed, isNotNull);
  });

  testWidgets('later-day stop unlocks only when earlier stops completed',
      (tester) async {
    await showScreen(tester, _detail(dateAllowed: true, nextId: 3));
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('checkin-3'))).onPressed, isNotNull);
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('checkin-1'))).onPressed, isNull);
  });

  testWidgets('older backend without permission flag disables check-in',
      (tester) async {
    final dto = BookingDetail.fromJson({
      'id': 123, 'bookingCode': 'BK-123',
      'tourName': 'Tour Demo', 'status': 'Confirmed',
      'startDate': '2026-11-12', 'endDate': '2026-11-13',
      'snapshotDays': [
        {'dayNumber': 1, 'title': 'Ngày 1', 'locations': [
          {'id': 1, 'name': 'Điểm A', 'attendanceStatus': 'Pending'}
        ]}
      ]
    });
    await showScreen(tester, dto);
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('checkin-1'))).onPressed, isNull);
  });
}
