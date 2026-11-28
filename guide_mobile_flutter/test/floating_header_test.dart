import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/app/guide_shell.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/core/widgets/guide_glass.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/auth/domain/guide_account.dart';

class _FakeGuides implements GuideRepository {
  @override
  Future<List<BookingSummary>> allBookings() async => [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('floating glass header overlays scrollable content without hiding its initial title', (tester) async {
    tester.view.physicalSize = const Size(390, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(MaterialApp(
      theme: TripOpsTheme.light,
      builder: (_, child) => GuideGlassBackground(child: child!),
      home: GuideShell(
        account: const GuideAccount(id: '1', name: 'Guide', email: 'guide@example.com', role: 'Guide'),
        guides: _FakeGuides(),
        onLogout: () async {},
        onSessionExpired: () async {},
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.byType(BackdropFilter), findsNWidgets(2));
    final header = find.byKey(const ValueKey('floating-guide-header'));
    final list = find.byType(ListView);
    final greeting = find.text('CHÀO MỪNG TRỞ LẠI');
    final headerRect = tester.getRect(header);
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.extendBodyBehindAppBar, isTrue);
    expect(tester.getTopLeft(list).dy, lessThan(headerRect.top));
    expect(tester.getTopLeft(greeting).dy, greaterThanOrEqualTo(headerRect.bottom));

    final scrollable = find.descendant(of: list, matching: find.byType(Scrollable)).first;
    final position = tester.state<ScrollableState>(scrollable).position;
    expect(position.maxScrollExtent, greaterThan(80));
    position.jumpTo(80);
    await tester.pumpAndSettle();

    expect(tester.getRect(header), headerRect);
    expect(tester.getTopLeft(greeting).dy, lessThan(headerRect.bottom));
    expect(tester.takeException(), isNull);

    // Dispose GuideShell to cancel its periodic notification timer.
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
