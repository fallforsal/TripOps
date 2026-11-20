import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/attendance/domain/passenger_contact.dart';
import 'package:tripops_guide/features/attendance/presentation/attendance_screen.dart';

class _FakeGuideRepository implements GuideRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

BookingDetail _detail({String? phone}) => BookingDetail(
  id: 20,
  code: 'BK20',
  name: 'Tour Đà Lạt',
  status: 'Confirmed',
  startDate: DateTime(2026, 11, 12),
  endDate: DateTime(2026, 11, 14),
  totalGuests: 1,
  canRecordAttendance: false,
  passengers: [
    Passenger(
      id: 5, name: 'Nguyễn Văn A', status: 'Pending', phone: phone,
    ),
  ],
  days: const [],
  incidents: const [],
);

void main() {
  test('phone value is trimmed; no number remains unavailable', () {
    expect(passengerPhone(' 090 123 4567 '), '090 123 4567');
    expect(passengerPhone('  '), isNull);
    expect(passengerPhone(null), isNull);
  });

  test('dialer accepts digits, +84, separators; rejects unsafe text', () {
    expect(dialablePassengerPhone('090 123 4567'), '0901234567');
    expect(dialablePassengerPhone('+84 (90) 123-4567'), '+84901234567');
    expect(dialablePassengerPhone('not provided'), isNull);
    expect(dialablePassengerPhone('123'), isNull);
    expect(dialablePassengerPhone('0901234567;123'), isNull);
  });

  testWidgets('passenger card shows phone and contact actions without avatar',
      (tester) async {
    tester.view.physicalSize = const Size(430, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(MaterialApp(
      home: AttendanceScreen(
        detail: _detail(phone: '0901234567'),
        guides: _FakeGuideRepository(),
      ),
    ));
    expect(find.text('Nguyễn Văn A'), findsOneWidget);
    expect(find.text('0901234567'), findsOneWidget);
    expect(find.byIcon(Icons.person_outline), findsNothing);
    expect(find.byKey(const ValueKey('passenger-copy-5')), findsOneWidget);
    expect(find.byKey(const ValueKey('passenger-call-5')), findsOneWidget);
    expect(
      tester.widget<IconButton>(
        find.byKey(const ValueKey('passenger-call-5')),
      ).onPressed,
      isNotNull,
    );
  });

  testWidgets('missing passenger phone is labeled and actions are hidden',
      (tester) async {
    tester.view.physicalSize = const Size(430, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(MaterialApp(
      home: AttendanceScreen(
        detail: _detail(),
        guides: _FakeGuideRepository(),
      ),
    ));
    expect(find.text('Chưa cập nhật'), findsOneWidget);
    expect(find.byKey(const ValueKey('passenger-copy-5')), findsNothing);
    expect(find.byKey(const ValueKey('passenger-call-5')), findsNothing);
  });
}
