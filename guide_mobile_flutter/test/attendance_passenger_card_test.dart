import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/attendance/presentation/attendance_progress_card.dart';
import 'package:tripops_guide/features/attendance/presentation/attendance_screen.dart';
import 'package:tripops_guide/features/attendance/presentation/guide_passenger_card.dart';

BookingDetail _detail(String status, {bool allow = true}) => BookingDetail(
  id: 20, code: 'BK20', name: 'Tour', status: 'Confirmed',
  startDate: DateTime(2026, 11, 12), endDate: DateTime(2026, 11, 14),
  totalGuests: 2, canRecordAttendance: allow,
  passengers: [
    const Passenger(id: 1, name: 'Nguyễn Văn An', status: 'CheckedIn'),
    Passenger(id: 2, name: 'Lê Chi', status: status, phone: '0901234567'),
  ],
  days: const [], incidents: const [],
);

class _Repository implements GuideRepository {
  final gate = Completer<void>();
  int requests = 0;
  String status = 'Pending';

  @override
  Future<void> attendance(int bookingId, int participantId, String status, {String? note}) async {
    requests++;
    await gate.future;
    this.status = status;
  }

  @override
  Future<BookingDetail> detail(int id) async => _detail(status);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('progress includes absent guests, empty group is not complete', (tester) async {
    Future<void> show(int total, int present, int absent) => tester.pumpWidget(
      MaterialApp(theme: TripOpsTheme.light, home: Scaffold(
        body: AttendanceProgressCard(total: total, present: present, absent: absent),
      )),
    );
    await show(4, 2, 2);
    expect(find.text('4 / 4'), findsOneWidget);
    expect(find.text('Đã hoàn tất điểm danh'), findsOneWidget);
    final present = find.byKey(const ValueKey('attendance-present-segment'));
    final absent = find.byKey(const ValueKey('attendance-absent-segment'));
    final pending = find.byKey(const ValueKey('attendance-pending-segment'));
    expect(tester.getSize(present).height, 10);
    expect(tester.getSize(present).width, closeTo(tester.getSize(absent).width, 0.01));
    expect(pending, findsNothing);
    await show(4, 1, 1);
    expect(find.text('2 / 4'), findsOneWidget);
    expect(tester.getSize(pending).width, closeTo(tester.getSize(present).width * 2, 0.01));
    expect(find.text('Đã hoàn tất điểm danh'), findsNothing);
    await show(0, 0, 0);
    expect(find.text('0 / 0'), findsOneWidget);
    expect(pending, findsOneWidget);
    expect(find.text('Đã hoàn tất điểm danh'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('compact passenger card preserves readonly status and contact actions', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final actions = <String>[];
    Future<void> show(bool allow) => tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: Scaffold(body: GuidePassengerCard(
        passenger: const Passenger(id: 2, name: 'Nguyễn Văn An', status: 'CheckedIn',
          phone: '0901234567', statusNote: 'Đã đến'),
        canRecord: allow, busy: false, actionsLocked: false,
        onStatusChanged: actions.add, onEditNote: () => actions.add('note'),
        onCopyPhone: (phone) => actions.add('copy:$phone'),
        onCallPhone: (phone) => actions.add('call:$phone'),
      )),
    ));
    await show(false);
    final present = find.byKey(const ValueKey('passenger-present-2'));
    final absent = find.byKey(const ValueKey('passenger-absent-2'));
    expect(tester.widget<TextButton>(present).onPressed, isNull);
    expect(tester.widget<TextButton>(absent).onPressed, isNull);
    expect(find.text('Chỉ xem · Không thể chỉnh sửa'), findsOneWidget);
    expect(find.text('Ghi chú HDV: Đã đến'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('passenger-copy-2')));
    await tester.tap(find.byKey(const ValueKey('passenger-call-2')));
    expect(actions, ['copy:0901234567', 'call:0901234567']);
    expect(find.byType(BackdropFilter), findsNothing);
    await show(true);
    expect(tester.widget<TextButton>(present).onPressed, isNull);
    await tester.tap(absent);
    await tester.tap(find.byKey(const ValueKey('passenger-note-2')));
    await tester.tap(find.byKey(const ValueKey('passenger-reset-2')));
    expect(actions, ['copy:0901234567', 'call:0901234567', 'Absent', 'note', 'Pending']);
    expect(tester.takeException(), isNull);
  });

  testWidgets('server confirmation controls status and progress, duplicate taps are blocked', (tester) async {
    tester.view.physicalSize = const Size(430, 1500);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final repo = _Repository();
    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: AttendanceScreen(detail: _detail('Pending'), guides: repo),
    ));
    await tester.pumpAndSettle();
    final progress = find.byKey(const ValueKey('attendance-progress'));
    final absent = find.byKey(const ValueKey('passenger-absent-2'));
    final passenger = find.byKey(const ValueKey('passenger-card-2'));
    expect(tester.widget<AttendanceProgressCard>(progress).recorded, 1);
    await tester.tap(absent);
    await tester.pump();
    expect(repo.requests, 1);
    expect(tester.widget<GuidePassengerCard>(passenger).passenger.status, 'Pending');
    expect(tester.widget<GuidePassengerCard>(passenger).busy, isTrue);
    expect(tester.widget<TextButton>(absent).onPressed, isNull);
    expect(tester.widget<AttendanceProgressCard>(progress).recorded, 1);
    repo.gate.complete();
    await tester.pumpAndSettle();
    expect(tester.widget<GuidePassengerCard>(passenger).passenger.status, 'Absent');
    expect(tester.widget<AttendanceProgressCard>(progress).recorded, 2);
    expect(find.text('Đã hoàn tất điểm danh'), findsOneWidget);
    expect(tester.widget<TextButton>(absent).onPressed, isNull);
    expect(repo.requests, 1);
    expect(tester.takeException(), isNull);
  });
}
