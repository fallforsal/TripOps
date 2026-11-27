import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/home/presentation/schedule_calendar_card.dart';

void main() {
  testWidgets('month grid ignores inherited header padding and supports selection and today', (tester) async {
    tester.view.physicalSize = const Size(360, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final tour = BookingSummary(
      id: 42, code: 'BK-42', name: 'Đà Lạt',
      startDate: DateTime(2026, 11, 28),
      endDate: DateTime(2026, 12, 1),
      status: 'Confirmed', guestCount: 4,
    );
    int? opened;
    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: Scaffold(body: Builder(builder: (context) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          padding: const EdgeInsets.only(top: 100, bottom: 80),
        ),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ScheduleCalendarCard(
              bookings: [tour],
              inProgressEndDates: const {},
              today: DateTime(2026, 11, 27),
              onOpenTour: (booking) => opened = booking.id,
            ),
          ],
        ),
      ))),
    ));
    await tester.pumpAndSettle();

    final grid = find.byKey(const ValueKey('calendar-grid'));
    expect(tester.widget<GridView>(grid).padding, EdgeInsets.zero);
    expect(tester.widget<GridView>(grid).primary, isFalse);
    final dayOne = find.byKey(const ValueKey('cal-day-2026-11-1'));
    expect(tester.getTopLeft(dayOne).dy, closeTo(tester.getTopLeft(grid).dy, 1));
    expect(find.text('Lịch ngày 27/11/2026'), findsOneWidget);
    expect(find.text('Không có lịch dẫn tour'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('cal-day-2026-11-28')));
    await tester.pumpAndSettle();
    expect(find.text('Lịch ngày 28/11/2026'), findsOneWidget);
    expect(find.text('Đà Lạt'), findsOneWidget);
    final event = find.byKey(const ValueKey('calendar-tour-42'));
    await tester.ensureVisible(event);
    await tester.tap(event);
    expect(opened, 42);

    final next = find.byKey(const ValueKey('calendar-next-month'));
    await tester.ensureVisible(next);
    await tester.tap(next);
    await tester.pumpAndSettle();
    expect(find.text('Tháng 12'), findsOneWidget);
    expect(find.text('Lịch ngày 01/12/2026'), findsOneWidget);
    expect(find.text('Đà Lạt'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('calendar-today')));
    await tester.pumpAndSettle();
    expect(find.text('Tháng 11'), findsOneWidget);
    expect(find.text('Lịch ngày 27/11/2026'), findsOneWidget);
    expect(find.text('Không có lịch dẫn tour'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
