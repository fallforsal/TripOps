import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/core/widgets/guide_glass_metric.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/tour_history/presentation/history_screen.dart';

void main() {
  testWidgets('history uses static glass KPIs and counts only completed tours', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final bookings = [
      BookingSummary(id: 1, code: 'BK-1', name: 'Đà Lạt',
        startDate: DateTime(2026, 11, 16), status: 'Completed', guestCount: 23),
      BookingSummary(id: 2, code: 'BK-2', name: 'Huế',
        startDate: DateTime(2026, 11, 17), status: 'Completed', guestCount: 4),
      BookingSummary(id: 3, code: 'BK-3', name: 'Tour sắp tới',
        startDate: DateTime(2026, 12, 1), status: 'Confirmed', guestCount: 10),
    ];

    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: Scaffold(body: HistoryScreen(bookings: bookings, onOpenTour: (_) {})),
    ));
    await tester.pumpAndSettle();

    final completed = find.byKey(const ValueKey('history-completed-metric'));
    final guests = find.byKey(const ValueKey('history-guests-metric'));
    expect(find.byType(GuideGlassMetric), findsNWidgets(2));
    expect(tester.widget<GuideGlassMetric>(completed).value, 2);
    expect(tester.widget<GuideGlassMetric>(guests).value, 27);
    expect(find.descendant(of: completed, matching: find.text('2')), findsOneWidget);
    expect(find.descendant(of: guests, matching: find.text('27')), findsOneWidget);
    expect(tester.getSize(completed).height, tester.getSize(guests).height);
    expect(find.byType(BackdropFilter), findsNothing);
    expect(find.text('Lịch sử tour (2)'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
