import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/attendance/presentation/attendance_screen.dart';

/// This test does not call the backend. The backend performs the real check.
class _FakeGuideRepository implements GuideRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

BookingDetail _booking({required bool allow}) => BookingDetail(
  id: 20,
  code: 'BK20',
  name: 'Tour Đà Lạt',
  status: 'Confirmed',
  startDate: DateTime(2026, 11, 12),
  endDate: DateTime(2026, 11, 14),
  totalGuests: 1,
  canRecordAttendance: allow,
  passengers: const [
    Passenger(id: 5, name: 'Nguyễn Văn A', status: 'Pending'),
  ],
  days: const [],
  incidents: const [],
);

void main() {
  testWidgets('attendance edits are disabled outside the departure date',
      (tester) async {
    tester.view.physicalSize = const Size(430, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(MaterialApp(
      home: AttendanceScreen(
        detail: _booking(allow: false),
        guides: _FakeGuideRepository(),
      ),
    ));
    expect(find.textContaining('Chỉ được điểm danh vào ngày bắt đầu chặng được giao'),
      findsOneWidget);
    final check = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, 'Có mặt'),
    );
    final absent = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, 'Vắng mặt'),
    );
    expect(check.onPressed, isNull);
    expect(absent.onPressed, isNull);
  });

  testWidgets('attendance actions are available on server-authorized date',
      (tester) async {
    tester.view.physicalSize = const Size(430, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(MaterialApp(
      home: AttendanceScreen(
        detail: _booking(allow: true),
        guides: _FakeGuideRepository(),
      ),
    ));
    expect(find.textContaining('Chỉ được điểm danh vào ngày bắt đầu chặng được giao'),
      findsNothing);
    final check = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, 'Có mặt'),
    );
    expect(check.onPressed, isNotNull);
  });
}
