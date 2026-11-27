import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/core/widgets/guide_glass.dart';
import 'package:tripops_guide/core/widgets/guide_glass_metric.dart';

void main() {
  testWidgets('home KPI widgets have equal heights and display actual values', (tester) async {
    tester.view.physicalSize = const Size(320, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    var value = 3;
    late StateSetter update;
    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: Scaffold(body: StatefulBuilder(builder: (context, setState) {
        update = setState;
        return ListView(padding: const EdgeInsets.all(20), children: [
          IntrinsicHeight(child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: GuideGlassMetric(
                key: const ValueKey('active'), icon: Icons.route_outlined,
                value: value, label: 'Tour đang phụ trách', color: deepTeal, tint: paleTeal,
              )),
              const SizedBox(width: 9),
              const Expanded(child: GuideGlassMetric(
                key: ValueKey('departure'), icon: Icons.event_outlined,
                value: null, label: 'Ngày tới khởi hành', color: ink, tint: paleTeal,
              )),
              const SizedBox(width: 9),
              const Expanded(child: GuideGlassMetric(
                key: ValueKey('completed'), icon: Icons.verified_outlined,
                value: 2, label: 'Tour đã hoàn thành', color: ink, tint: paleTeal,
              )),
            ],
          )),
        ]);
      })),
    ));
    expect(find.text('3'), findsOneWidget);
    await tester.pumpAndSettle();

    expect(find.text('3'), findsOneWidget);
    expect(find.text('—'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    final height = tester.getSize(find.byKey(const ValueKey('active'))).height;
    expect(tester.getSize(find.byKey(const ValueKey('departure'))).height, height);
    expect(tester.getSize(find.byKey(const ValueKey('completed'))).height, height);
    expect(find.byType(BackdropFilter), findsNothing);
    for (final key in ['active', 'departure', 'completed']) {
      final tile = find.byKey(ValueKey(key));
      final glass = tester.widgetList<GuideGlass>(
        find.descendant(of: tile, matching: find.byType(GuideGlass)),
      ).toList();
      expect(glass.length, 2);
      expect(glass.first.shadow, isTrue);
      expect(glass.first.blurSigma, 0);
      expect(glass.last.blurSigma, 0);
      expect(glass.last.shadow, isFalse);
    }
    update(() => value = 5);
    await tester.pumpAndSettle();
    expect(find.text('5'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
