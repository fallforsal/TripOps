import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/core/widgets/guide_glass.dart';
import 'package:tripops_guide/core/widgets/guide_search_bar.dart';
import 'package:tripops_guide/core/widgets/guide_segmented_control.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/attendance/domain/attendance_filter.dart';
import 'package:tripops_guide/features/attendance/presentation/attendance_screen.dart';
import 'package:tripops_guide/features/attendance/presentation/attendance_progress_card.dart';

class _FakeGuideRepository implements GuideRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('attendance glass controls preserve search, filters and progress',
      (tester) async {
    tester.view.physicalSize = const Size(360, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final detail = BookingDetail(
      id: 20, code: 'BK20', name: 'Tour Đà Lạt', status: 'Confirmed',
      startDate: DateTime(2026, 11, 12), endDate: DateTime(2026, 11, 14),
      totalGuests: 4, canRecordAttendance: false,
      passengers: const [
        Passenger(id: 1, name: 'Nguyễn Văn An', status: 'CheckedIn', phone: '0901234567'),
        Passenger(id: 2, name: 'Trần Bình', status: 'CheckedIn'),
        Passenger(id: 3, name: 'Lê Chi', status: 'Absent'),
        Passenger(id: 4, name: 'Phạm Dũng', status: 'Pending'),
        Passenger(id: 5, name: 'Khách đã xóa', status: 'Pending', recordStatus: 'INACTIVE'),
      ],
      days: const [], incidents: const [],
    );
    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: AttendanceScreen(detail: detail, guides: _FakeGuideRepository()),
    ));
    await tester.pumpAndSettle();

    final progress = find.byKey(const ValueKey('attendance-progress'));
    expect(find.descendant(of: progress, matching: find.byType(GuideStaticGlass)), findsOneWidget);
    expect(find.descendant(of: progress, matching: find.byType(BackdropFilter)), findsNothing);
    expect(tester.widget<AttendanceProgressCard>(progress).recorded, 3);
    expect(find.text('3 / 4'), findsOneWidget);
    expect(find.text('1 vắng mặt'), findsOneWidget);

    final control = find.byType(GuideSegmentedControl<AttendanceFilter>);
    expect(control, findsOneWidget);
    expect(find.byType(GuideSearchBar), findsOneWidget);
    expect(find.byType(ChoiceChip), findsNothing);
    final bounds = tester.getRect(control);
    for (final option in AttendanceFilter.values) {
      final rect = tester.getRect(find.byKey(ValueKey(option)));
      expect(rect.left, greaterThanOrEqualTo(bounds.left));
      expect(rect.right, lessThanOrEqualTo(bounds.right));
    }

    final field = find.byKey(const ValueKey('passenger-search'));
    await tester.ensureVisible(field);
    await tester.enterText(field, 'nguyen van an');
    await tester.pumpAndSettle();
    expect(find.text('Nguyễn Văn An'), findsOneWidget);
    expect(find.text('Trần Bình'), findsNothing);
    await tester.enterText(field, '0901234567');
    await tester.pumpAndSettle();
    expect(find.text('Nguyễn Văn An'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('guide-search-clear')));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(field).controller!.text, isEmpty);
    FocusManager.instance.primaryFocus?.unfocus();

    for (final option in AttendanceFilter.values) {
      final segment = find.byKey(ValueKey(option));
      await tester.ensureVisible(segment);
      await tester.tap(segment);
      await tester.pumpAndSettle();
      expect(tester.widget<GuideSegmentedControl<AttendanceFilter>>(control).value, option);
    }
    expect(find.text('Lê Chi'), findsOneWidget);
    expect(find.text('Nguyễn Văn An'), findsNothing);
    expect(find.text('Khách đã xóa'), findsNothing);
    expect(tester.widget<AttendanceProgressCard>(progress).recorded, 3);
    expect(find.text('1 vắng mặt'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
