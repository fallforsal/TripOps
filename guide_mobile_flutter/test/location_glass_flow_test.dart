import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/location_checkin/domain/checkin_photo.dart';
import 'package:tripops_guide/features/location_checkin/presentation/checkin_photo_dialog.dart';
import 'package:tripops_guide/features/location_checkin/presentation/guide_stop_card.dart';
import 'package:tripops_guide/features/location_checkin/presentation/location_evidence_gallery.dart';
import 'package:tripops_guide/features/location_checkin/presentation/location_screen.dart';

BookingDetail _booking({String firstStatus = 'CheckedIn', int? next = 1, bool allowed = true}) => BookingDetail(
  id: 123, code: 'BK123', name: 'Tour', status: 'Confirmed',
  startDate: DateTime(2026, 11, 12), endDate: DateTime(2026, 11, 14),
  totalGuests: 1, passengers: const [], incidents: const [],
  canCheckInLocations: allowed, nextLocationCheckInId: next,
  days: [TourDay(dayNumber: 1, title: 'Ngày 1', stops: [
    TourStop(id: 1, name: 'Điểm A', status: firstStatus,
      photoUrls: const ['https://example.com/a.png']),
    const TourStop(id: 2, name: 'Điểm B', status: 'Pending'),
    const TourStop(id: 3, name: 'Điểm C', status: 'Pending'),
  ])],
);

class _Repo implements GuideRepository {
  BookingDetail state = _booking();
  Completer<void> gate = Completer<void>();
  int calls = 0;
  int downloads = 0;
  bool fail = true;
  String? lastNote;
  List<CheckinPhoto>? lastImages;

  @override
  Future<BookingDetail> detail(int id) async => state;

  @override
  Future<Uint8List> imageBytes(String url) async {
    downloads++;
    return base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2YQAAAAASUVORK5CYII=');
  }

  @override
  Future<BookingDetail> checkOutWithImages(
      int bookingId, int locationId, String? note, List<CheckinPhoto> photos) async {
    calls++;
    lastNote = note;
    lastImages = photos;
    await gate.future;
    if (fail) throw StateError('Network unavailable');
    state = _booking(firstStatus: 'CheckedOut', next: 2);
    return state;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

const _photo = CheckinPhoto(path: '/tmp/proof.png', name: 'proof.png', mime: 'image/png', bytes: 1024);
const CheckinSubmission _submission = (note: 'Ghi chú thử lại', images: [_photo]);

Future<void> _show(WidgetTester tester, _Repo repo, {double height = 1200}) async {
  tester.view.physicalSize = Size(430, height);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
  await tester.pumpWidget(MaterialApp(home: LocationScreen(detail: repo.state, guides: repo)));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('completed evidence is collapsed and loaded only when requested', (tester) async {
    final repo = _Repo()..state = _booking(firstStatus: 'CheckedOut', next: 2);
    await _show(tester, repo);
    expect(repo.downloads, 0);
    expect(find.byType(LocationEvidenceGallery), findsNothing);
    expect(find.byKey(const ValueKey('checkout-1')), findsNothing);
    final toggle = find.byKey(const ValueKey('proof-toggle-1'));
    await tester.ensureVisible(toggle);
    await tester.tap(toggle);
    await tester.pumpAndSettle();
    expect(repo.downloads, 1);
    expect(find.byType(LocationEvidenceGallery), findsOneWidget);
    await tester.tap(toggle);
    await tester.pumpAndSettle();
    expect(find.byType(LocationEvidenceGallery), findsNothing);
    await tester.tap(toggle);
    await tester.pumpAndSettle();
    expect(repo.downloads, 1);
  });

  testWidgets('failed checkout keeps submission and only advances after confirmed success', (tester) async {
    final repo = _Repo();
    await _show(tester, repo);
    final checkout = find.byKey(const ValueKey('checkout-1'));
    await tester.ensureVisible(checkout);
    await tester.tap(checkout);
    await tester.pumpAndSettle();
    expect(find.byType(BottomSheet), findsOneWidget);
    Navigator.of(tester.element(find.byType(CheckinPhotoDialog))).pop<CheckinSubmission>(_submission);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(repo.calls, 1);
    expect(find.text('Đang gửi minh chứng…'), findsOneWidget);
    expect(find.byKey(const ValueKey('checkin-2')), findsNothing);
    repo.gate.complete();
    await tester.pumpAndSettle();
    final retry = find.byKey(const ValueKey('retry-1'));
    await tester.ensureVisible(retry);
    await tester.tap(retry);
    await tester.pumpAndSettle();
    final sheet = find.byType(CheckinPhotoDialog);
    expect(tester.widget<CheckinPhotoDialog>(sheet).initialSubmission, _submission);
    expect(tester.widget<TextField>(find.byKey(const ValueKey('checkin-note-field'))).controller!.text,
      _submission.note);
    expect(find.text('1/5 ảnh'), findsOneWidget);
    repo.fail = false;
    repo.gate = Completer<void>();
    Navigator.of(tester.element(sheet)).pop<CheckinSubmission>(_submission);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    repo.gate.complete();
    await tester.pumpAndSettle();
    expect(repo.calls, 2);
    expect(repo.lastNote, _submission.note);
    expect(repo.lastImages, _submission.images);
    expect(find.byKey(const ValueKey('checkout-1')), findsNothing);
    expect(tester.widget<TextButton>(find.byKey(const ValueKey('checkin-2'))).onPressed, isNotNull);
    expect(tester.widgetList<GuideStopCard>(find.byType(GuideStopCard))
      .where((card) => card.stop.id == 1).every((card) => !card.expanded), isTrue);
    expect(tester.takeException(), isNull);
  });
}
