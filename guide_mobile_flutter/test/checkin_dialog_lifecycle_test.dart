import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/location_checkin/presentation/checkin_photo_dialog.dart';

class _DialogHarness extends StatefulWidget {
  const _DialogHarness();

  @override
  State<_DialogHarness> createState() => _DialogHarnessState();
}

class _DialogHarnessState extends State<_DialogHarness> {
  CheckinSubmission? result;

  Future<void> open() async {
    final submission = await showDialog<CheckinSubmission>(
      context: context,
      builder: (context) => const CheckinPhotoDialog(stopName: 'Điểm A'),
    );
    if (mounted && submission != null) setState(() => result = submission);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Column(
      children: [
        FilledButton(
          onPressed: open,
          child: const Text('Mở check-in'),
        ),
        Text(result?.note ?? 'Chưa gửi', key: const ValueKey('submitted-note')),
      ],
    ),
  );
}

void main() {
  testWidgets('enter note, submit, close route, and reopen without lifecycle errors',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: _DialogHarness()));
    await tester.tap(find.text('Mở check-in'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const ValueKey('checkin-note-field')),
      'Đã đến điểm A',
    );
    await tester.pump();

    await tester.tap(find.byKey(const ValueKey('confirm-checkin')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('checkin-note-field')), findsNothing);
    expect(find.text('Đã đến điểm A'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Mở check-in'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('checkin-note-field')),
      'Lần tiếp theo',
    );
    await tester.tap(find.text('Hủy'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('Đã đến điểm A'), findsOneWidget);
  });
}
