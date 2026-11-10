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
  bool firstHasCoordinates = true,
}) => BookingDetail(
  id: 123,
  code: 'BK-123',
  name: 'Tour Vũng Tàu',
  status: 'Confirmed',
  startDate: DateTime(2026, 11, 10),
  endDate: DateTime(2026, 11, 12),
  totalGuests: 1,
  passengers: const [],
  incidents: const [],
  canCheckInLocations: dateAllowed,
  nextLocationCheckInId: nextId,
  days: [
    TourDay(dayNumber: 1, title: 'Ngày 1', stops: [
      TourStop(
        id: 1, name: 'Điểm 1', status: 'Pending',
        latitude: firstHasCoordinates ? 10.34 : null,
        longitude: firstHasCoordinates ? 107.08 : null,
      ),
      const TourStop(id: 2, name: 'Điểm 2', status: 'Pending',
        latitude: 10.35, longitude: 107.09),
    ]),
  ],
);

Future<void> showScreen(WidgetTester tester, BookingDetail detail) async {
  tester.view.physicalSize = const Size(430, 1400);
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
  testWidgets('before departure, all GPS check-in buttons are disabled', (tester) async {
    await showScreen(tester, _detail(dateAllowed: false));
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('checkin-1'))).onPressed, isNull);
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('checkin-2'))).onPressed, isNull);
    expect(find.textContaining('Chưa đến ngày khởi hành'), findsWidgets);
  });

  testWidgets('only the next stop may be checked in', (tester) async {
    await showScreen(tester, _detail(dateAllowed: true, nextId: 1));
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('checkin-1'))).onPressed, isNotNull);
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('checkin-2'))).onPressed, isNull);
    expect(find.text('Cần check-in điểm trước đó'), findsOneWidget);
  });

  testWidgets('missing Agency geofence blocks otherwise eligible stop', (tester) async {
    await showScreen(tester, _detail(
      dateAllowed: true, nextId: 1, firstHasCoordinates: false,
    ));
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('checkin-1'))).onPressed, isNull);
    expect(find.text('Agency chưa cấu hình GPS điểm này'), findsOneWidget);
  });

  testWidgets('when server advances sequence, next stop is enabled', (tester) async {
    await showScreen(tester, _detail(dateAllowed: true, nextId: 2));
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('checkin-1'))).onPressed, isNull);
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('checkin-2'))).onPressed, isNotNull);
  });
}
