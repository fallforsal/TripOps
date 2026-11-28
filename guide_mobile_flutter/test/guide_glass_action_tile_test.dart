import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/core/widgets/guide_glass.dart';
import 'package:tripops_guide/core/widgets/guide_ui.dart';

void main() {
  testWidgets('quick actions use static glass, equal heights and remain tappable', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final tapped = <String>[];
    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      home: Scaffold(
        body: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            IntrinsicHeight(child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: GuideActionTile(
                  icon: Icons.fact_check_outlined,
                  title: 'Điểm danh', subtitle: 'Danh sách khách',
                  onTap: () => tapped.add('attendance'),
                )),
                const SizedBox(width: 9),
                Expanded(child: GuideActionTile(
                  icon: Icons.location_on_outlined,
                  title: 'Check-in', subtitle: 'Các điểm dừng',
                  accent: const Color(0xFF315F91),
                  tint: const Color(0xFFCFE0F7),
                  onTap: () => tapped.add('checkin'),
                )),
                const SizedBox(width: 9),
                Expanded(child: GuideActionTile(
                  icon: Icons.warning_amber_outlined,
                  title: 'Sự cố', subtitle: 'Gửi báo cáo',
                  accent: const Color(0xFF87601C),
                  tint: const Color(0xFFF2E1BE),
                  onTap: () => tapped.add('incident'),
                )),
              ],
            )),
          ],
        ),
      ),
    ));
    await tester.pumpAndSettle();

    final tiles = find.byType(GuideActionTile);
    expect(tiles, findsNWidgets(3));
    expect(find.byType(GuideStaticGlass), findsNWidgets(3));
    expect(find.byType(BackdropFilter), findsNothing);
    final height = tester.getSize(tiles.first).height;
    for (var i = 0; i < 3; i++) {
      expect(tester.getSize(tiles.at(i)).height, height);
      await tester.tap(tiles.at(i));
      await tester.pumpAndSettle();
    }
    expect(tapped, ['attendance', 'checkin', 'incident']);
    expect(tester.takeException(), isNull);
  });
}
