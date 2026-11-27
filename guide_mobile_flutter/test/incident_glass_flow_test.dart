import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/incidents/presentation/guide_incident_card.dart';
import 'package:tripops_guide/features/incidents/presentation/incident_screen.dart';
import 'package:tripops_guide/features/location_checkin/domain/checkin_photo.dart';
import 'package:tripops_guide/features/location_checkin/presentation/location_evidence_gallery.dart';

const _oldReport = TourIncident(
  incidentType: 'VEHICLE', title: 'Sự cố xe',
  description: 'Nội dung chi tiết của báo cáo đã gửi.',
  evidenceUrls: ['https://example.com/proof.png'],
);

BookingDetail _booking(List<TourIncident> reports) => BookingDetail(
  id: 18, code: 'BK18', name: 'Tour thử nghiệm', status: 'InProgress',
  startDate: DateTime(2026, 11, 14), endDate: DateTime(2026, 11, 14),
  totalGuests: 1, passengers: const [], days: const [], incidents: reports,
);

class _Repo implements GuideRepository {
  List<TourIncident> reports = [_oldReport];
  int sends = 0, reads = 0, downloads = 0;
  bool fail = true;
  bool recordBeforeFailure = false;
  Completer<void>? gate;
  String? lastType, lastTitle, lastDescription, lastSeverity;
  List<CheckinPhoto>? lastPhotos;

  @override
  Future<BookingDetail> detail(int id) async {
    reads++;
    return _booking(List.of(reports));
  }

  @override
  Future<void> incident(int id, {
    String type = 'OTHER', required String title, required String description,
    String? severity, List<CheckinPhoto> photos = const [],
  }) async {
    sends++;
    lastType = type;
    lastTitle = title;
    lastDescription = description;
    lastSeverity = severity;
    lastPhotos = photos;
    await gate?.future;
    if (!fail || recordBeforeFailure) {
      reports = [...reports, TourIncident(incidentType: type, title: title, description: description)];
    }
    if (fail) throw StateError('Network unavailable');
  }

  @override
  Future<Uint8List> imageBytes(String url) async {
    downloads++;
    return base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2YQAAAAASUVORK5CYII=');
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _open(WidgetTester tester, _Repo repo) async {
  tester.view.physicalSize = const Size(430, 1000);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
  await tester.pumpWidget(MaterialApp(theme: TripOpsTheme.light,
    home: Scaffold(body: Builder(builder: (context) => TextButton(
      onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(
        builder: (context) => IncidentScreen(detail: _booking(List.of(repo.reports)), guides: repo),
      )),
      child: const Text('Mở báo cáo'),
    ))),
  ));
  await tester.tap(find.text('Mở báo cáo'));
  await tester.pumpAndSettle();
}

Future<void> _fill(WidgetTester tester) async {
  final picker = find.byKey(const ValueKey('incident-type-dropdown'));
  await tester.ensureVisible(picker);
  await tester.tap(picker);
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const ValueKey('incident-category-HEALTH')));
  await tester.pumpAndSettle();
  final fields = find.byType(TextFormField);
  await tester.ensureVisible(fields.at(0));
  await tester.enterText(fields.at(0), 'Hành khách bị mệt');
  await tester.ensureVisible(fields.at(1));
  await tester.enterText(fields.at(1), 'Đã hỗ trợ nghỉ ngơi.');
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('tabs preserve draft, history loads evidence only on detail, exit asks first', (tester) async {
    final repo = _Repo();
    await _open(tester, repo);
    await _fill(tester);
    await tester.tap(find.text('Lịch sử (1)'));
    await tester.pumpAndSettle();
    expect(find.byType(GuideIncidentCard), findsOneWidget);
    expect(find.byKey(const ValueKey('incident-submit')), findsNothing);
    expect(repo.downloads, 0);
    await tester.tap(find.byKey(const ValueKey('incident-history-0')));
    await tester.pumpAndSettle();
    expect(find.text('Nội dung chi tiết của báo cáo đã gửi.'), findsWidgets);
    expect(find.byType(EvidencePhotoStrip), findsOneWidget);
    expect(repo.downloads, 1);
    await tester.tap(find.widgetWithText(FilledButton, 'Đóng'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tạo báo cáo'));
    await tester.pumpAndSettle();
    expect(find.text('Hành khách bị mệt'), findsOneWidget);
    expect(find.text('Đã hỗ trợ nghỉ ngơi.'), findsOneWidget);
    expect(find.text('Y tế & Sức khỏe'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded));
    await tester.pumpAndSettle();
    expect(find.text('Bỏ bản nháp?'), findsOneWidget);
    await tester.tap(find.text('Tiếp tục nhập'));
    await tester.pumpAndSettle();
    expect(find.text('Hành khách bị mệt'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Bỏ bản nháp'));
    await tester.pumpAndSettle();
    expect(find.text('Mở báo cáo'), findsOneWidget);
    expect(repo.sends, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('failure checks history, preserves draft, retry requires confirmation', (tester) async {
    final repo = _Repo()..recordBeforeFailure = true;
    await _open(tester, repo);
    await _fill(tester);
    final submit = find.byKey(const ValueKey('incident-submit'));
    repo.gate = Completer<void>();
    await tester.tap(submit);
    await tester.pump();
    expect(repo.sends, 1);
    expect(tester.widget<FilledButton>(submit).onPressed, isNull);
    expect(repo.lastPhotos, isEmpty);
    expect(repo.lastSeverity, isNull);
    repo.gate!.complete();
    await tester.pumpAndSettle();
    expect(repo.reads, 1);
    expect(find.text('Lịch sử (2)'), findsOneWidget);
    expect(find.textContaining('Lịch sử có thêm báo cáo cùng nội dung'), findsOneWidget);
    expect(find.text('Hành khách bị mệt'), findsOneWidget);
    await tester.tap(submit);
    await tester.pumpAndSettle();
    expect(repo.reads, 2);
    expect(find.text('Xác nhận gửi lại'), findsOneWidget);
    expect(find.textContaining('Lịch sử có báo cáo cùng nội dung'), findsOneWidget);
    await tester.tap(find.text('Hủy'));
    await tester.pumpAndSettle();
    expect(repo.sends, 1);
    repo.fail = false;
    repo.recordBeforeFailure = false;
    repo.gate = null;
    await tester.tap(submit);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Vẫn gửi lại'));
    await tester.pumpAndSettle();
    expect(repo.sends, 2);
    expect(repo.lastType, 'HEALTH');
    expect(repo.lastTitle, 'Hành khách bị mệt');
    expect(repo.lastDescription, 'Đã hỗ trợ nghỉ ngơi.');
    expect(repo.lastPhotos, isEmpty);
    expect(repo.lastSeverity, isNull);
    expect(find.text('Mở báo cáo'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
