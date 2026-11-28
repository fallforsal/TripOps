import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/assigned_tours/domain/tour_catalog.dart';
import 'package:tripops_guide/features/assigned_tours/presentation/tour_list_screen.dart';

void main() {
  testWidgets('glass search filters, clears and restores controlled query', (tester) async {
    tester.view.physicalSize = const Size(320, 850);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    var query = '';
    late StateSetter rebuild;
    final bookings = [
      BookingSummary(id: 1, code: 'BK-1', name: 'Đà Lạt',
        startDate: DateTime.now(), status: 'Confirmed', guestCount: 4),
      BookingSummary(id: 2, code: 'BK-2', name: 'Huế',
        startDate: DateTime.now(), status: 'Confirmed', guestCount: 8),
    ];
    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: Scaffold(body: StatefulBuilder(builder: (context, setState) {
        rebuild = setState;
        return TourListScreen(
          bookings: bookings, filter: TourFilter.all, query: query,
          onFilterChanged: (_) {}, onQueryChanged: (next) => setState(() => query = next),
          onOpenTour: (_) {},
        );
      })),
    ));
    await tester.pumpAndSettle();

    final field = find.byKey(const ValueKey('tour-search'));
    final clear = find.byKey(const ValueKey('guide-search-clear'));
    expect(find.text('Tìm kiếm tour'), findsOneWidget);
    expect(find.text('Danh sách tour (2)'), findsOneWidget);
    expect(clear, findsNothing);

    await tester.enterText(field, 'da lat');
    await tester.pumpAndSettle();
    expect(query, 'da lat');
    expect(find.text('Danh sách tour (1)'), findsOneWidget);
    expect(find.text('Đà Lạt'), findsOneWidget);
    expect(find.text('Huế'), findsNothing);

    await tester.tap(clear);
    await tester.pumpAndSettle();
    expect(query, isEmpty);
    expect(tester.widget<TextField>(field).controller!.text, isEmpty);
    expect(find.text('Danh sách tour (2)'), findsOneWidget);
    expect(clear, findsNothing);

    rebuild(() => query = 'BK-2');
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(field).controller!.text, 'BK-2');
    expect(find.text('Huế'), findsOneWidget);
    expect(find.text('Đà Lạt'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
