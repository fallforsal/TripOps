import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/assigned_tours/domain/tour_catalog.dart';
import 'package:tripops_guide/features/assigned_tours/presentation/tour_status_pill.dart';

void main() {
  testWidgets('tour statuses retain labels and use static glass without blur', (tester) async {
    const statuses = [
      'Confirmed', 'Completed', 'InProgress', 'Paid', 'Deposited',
      'Pending', 'Cancelled', 'Rejected', 'Unknown',
    ];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: ListView(children: [
        for (final status in statuses)
          Align(
            alignment: Alignment.centerLeft,
            child: TourStatusPill(key: ValueKey(status), status: status),
          ),
      ])),
    ));
    for (final status in statuses) {
      final pill = find.byKey(ValueKey(status));
      expect(find.descendant(of: pill, matching: find.text(bookingStatusLabel(status))), findsOneWidget);
      final decoration = tester.widget<DecoratedBox>(
        find.descendant(of: pill, matching: find.byType(DecoratedBox)),
      ).decoration as BoxDecoration;
      expect(decoration.gradient, isA<LinearGradient>());
      expect(decoration.border, isNotNull);
    }
    Color? textColor(String status) => tester.widget<Text>(
      find.descendant(of: find.byKey(ValueKey(status)), matching: find.byType(Text)),
    ).style?.color;
    expect(textColor('Confirmed'), isNot(textColor('InProgress')));
    expect(textColor('Completed'), isNot(textColor('InProgress')));
    expect(textColor('Confirmed'), isNot(textColor('Completed')));
    expect(find.byType(BackdropFilter), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
