import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/main.dart';

void main() {
  testWidgets('connection screen starts without claiming success', (
    tester,
  ) async {
    await tester.pumpWidget(const TripOpsApp());
    expect(find.text('Chưa kiểm tra.'), findsOneWidget);
    expect(
      find.widgetWithText(FilledButton, 'Kiểm tra kết nối'),
      findsOneWidget,
    );
  });
}
