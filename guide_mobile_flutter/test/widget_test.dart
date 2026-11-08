import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/src/models.dart';
import 'package:tripops_guide/src/screens.dart';

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
    expect(find.text('BK-042  ·  Đã xác nhận'), findsOneWidget);
    expect(find.text('Khởi hành 12/11/2026'), findsOneWidget);
    expect(find.text('12 khách'), findsOneWidget);

    await tester.tap(find.text('Xem chi tiết  ›'));
    expect(tapped, isTrue);
  });
}
