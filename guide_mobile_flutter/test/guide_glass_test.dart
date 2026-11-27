import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/core/widgets/guide_glass.dart';
import 'package:tripops_guide/core/widgets/guide_ui.dart';

void main() {
  testWidgets('glass uses clipped blur and keeps its child interactive', (tester) async {
    var taps = 0;
    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      builder: (_, child) => GuideGlassBackground(child: child!),
      home: Scaffold(body: Center(child: GuideGlass(
        child: TextButton(onPressed: () => taps++, child: const Text('Mở tour')),
      ))),
    ));
    expect(find.byType(BackdropFilter), findsOneWidget);
    expect(find.ancestor(of: find.byType(BackdropFilter), matching: find.byType(ClipRRect)), findsWidgets);
    await tester.tap(find.text('Mở tour'));
    expect(taps, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('tint-only repeated surfaces avoid backdrop blur', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(
      body: GuideGlass(blurSigma: 0, child: Text('Điểm danh')),
    )));
    expect(find.byType(BackdropFilter), findsNothing);
    expect(find.text('Điểm danh'), findsOneWidget);
  });

  testWidgets('hero keeps tour action available on a small screen', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    var opened = false;
    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: Scaffold(body: ListView(padding: const EdgeInsets.all(16), children: [
        GuideHero(title: 'Hành trình khám phá Đà Lạt', label: 'Hành trình hôm nay',
          subtitle: 'BK-042 • 25 khách', actionLabel: 'Xem chi tiết tour', onTap: () => opened = true),
      ])),
    ));
    await tester.tap(find.text('Xem chi tiết tour'));
    expect(opened, isTrue);
    expect(tester.takeException(), isNull);
  });
}
