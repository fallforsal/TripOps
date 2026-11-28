import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/core/widgets/guide_segmented_control.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/assigned_tours/domain/tour_catalog.dart';
import 'package:tripops_guide/features/assigned_tours/presentation/tour_list_screen.dart';

void main() {
  testWidgets('all four glass segments fit and filter tours on a narrow phone', (tester) async {
    tester.view.physicalSize = const Size(320, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final bookings = [
      BookingSummary(id: 1, code: 'BK-1', name: 'Upcoming tour',
        startDate: DateTime.now().add(const Duration(days: 2)), status: 'Confirmed', guestCount: 4),
      BookingSummary(id: 2, code: 'BK-2', name: 'Current tour',
        startDate: DateTime.now(), status: 'InProgress', guestCount: 5),
      BookingSummary(id: 3, code: 'BK-3', name: 'Finished tour',
        startDate: DateTime.now().subtract(const Duration(days: 2)), status: 'Completed', guestCount: 6),
    ];
    var selected = TourFilter.upcoming;
    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: Scaffold(body: StatefulBuilder(builder: (context, setState) {
        return TourListScreen(
          bookings: bookings, filter: selected, query: '',
          onFilterChanged: (next) => setState(() => selected = next),
          onQueryChanged: (_) {}, onOpenTour: (_) {},
        );
      })),
    ));
    await tester.pumpAndSettle();

    final control = find.byType(GuideSegmentedControl<TourFilter>);
    expect(control, findsOneWidget);
    expect(find.byType(ChoiceChip), findsNothing);
    final controlRect = tester.getRect(control);
    for (final option in TourFilter.values) {
      final rect = tester.getRect(find.byKey(ValueKey(option)));
      expect(rect.left, greaterThanOrEqualTo(controlRect.left));
      expect(rect.right, lessThanOrEqualTo(controlRect.right));
      expect(rect.height, greaterThanOrEqualTo(44));
    }
    expect(find.text('Upcoming tour'), findsOneWidget);

    for (final option in [TourFilter.inProgress, TourFilter.completed, TourFilter.all, TourFilter.upcoming]) {
      await tester.tap(find.byKey(ValueKey(option)));
      await tester.pumpAndSettle();
      expect(selected, option);
      final thumb = tester.widget<AnimatedAlign>(find.byKey(const ValueKey('guide-segment-thumb')));
      expect(thumb.alignment, Alignment(-1 + 2 * option.index / (TourFilter.values.length - 1), 0));
      expect(find.text('Danh sách tour (${option == TourFilter.all ? 3 : 1})'), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
  });
}
