import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/widgets/tour_thumbnail.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/assigned_tours/presentation/tour_card.dart';

void main() {
  testWidgets('TourCard displays assigned tour and handles details tap',
      (tester) async {
    var tapped = false;
    final booking = BookingSummary(
      id: 42,
      code: 'BK-042',
      name: 'Hành trình Đà Lạt',
      startDate: DateTime(2026, 11, 12),
      status: 'Confirmed',
      guestCount: 12,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TourCard(
            tour: booking,
            label: 'Tour sắp tới',
            onTap: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.text('Hành trình Đà Lạt'), findsOneWidget);
    expect(find.text('BK-042'), findsOneWidget);
    expect(find.text('Đã xác nhận'), findsOneWidget);
    expect(find.text('12/11/2026'), findsOneWidget);
    expect(find.text('12 khách'), findsOneWidget);

    expect(find.text('Tour sắp tới'), findsOneWidget);
    expect(find.text('Xem chi tiết  ›'), findsNothing);
    expect(find.byIcon(Icons.chevron_right_rounded), findsOneWidget);
    expect(tester.widget<TourThumbnail>(find.byType(TourThumbnail)).width, greaterThan(56));
    expect(find.byType(BackdropFilter), findsNothing);
    await tester.tap(find.byKey(const ValueKey('tour-card-42')));
    expect(tapped, isTrue);
  });
}
