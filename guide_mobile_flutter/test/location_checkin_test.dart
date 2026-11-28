import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';
import 'package:tripops_guide/features/location_checkin/presentation/location_screen.dart';

class _FakeGuides implements GuideRepository {
  String? lastStatus;
  String? lastNote;
  int? lastLocationId;

  @override
  Future<BookingDetail> checkIn(
    int bookingId,
    int locationId,
    String status,
    String? note,
  ) async {
    lastLocationId = locationId;
    lastStatus = status;
    lastNote = note;
    return BookingDetail(
      id: bookingId,
      code: 'BK-123',
      name: 'Tour Vũng Tàu',
      status: 'Confirmed',
      startDate: DateTime(2026, 11, 12),
      endDate: DateTime(2026, 11, 14),
      totalGuests: 1,
      passengers: const [],
      incidents: const [],
      canCheckInLocations: true,
      nextLocationCheckInId: 2,
      days: [
        TourDay(dayNumber: 1, title: 'Ngày 1', stops: [
          TourStop(
            id: 1,
            name: 'Điểm A',
            status: status,
            checkinNote: note,
          ),
          const TourStop(id: 2, name: 'Điểm B', status: 'Pending'),
        ]),
        TourDay(dayNumber: 2, title: 'Ngày 2', stops: [
          const TourStop(id: 3, name: 'Điểm C', status: 'Pending'),
        ]),
      ],
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

BookingDetail _detail({
  required bool dateAllowed,
  int? nextId = 1,
}) => BookingDetail(
  id: 123,
  code: 'BK-123',
  name: 'Tour Vũng Tàu',
  status: 'Confirmed',
  startDate: DateTime(2026, 11, 12),
  endDate: DateTime(2026, 11, 14),
  totalGuests: 1,
  passengers: const [],
  incidents: const [],
  canCheckInLocations: dateAllowed,
  nextLocationCheckInId: nextId,
  days: [
    TourDay(dayNumber: 1, title: 'Ngày 1', stops: [
      const TourStop(id: 1, name: 'Điểm A', status: 'Pending'),
      const TourStop(id: 2, name: 'Điểm B', status: 'Pending'),
    ]),
    TourDay(dayNumber: 2, title: 'Ngày 2', stops: [
      const TourStop(id: 3, name: 'Điểm C', status: 'Pending'),
    ]),
  ],
);

Future<void> showScreen(WidgetTester tester, BookingDetail detail) async {
  tester.view.physicalSize = const Size(430, 1700);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
  await tester.pumpWidget(MaterialApp(
    home: LocationScreen(detail: detail, guides: _FakeGuides()),
  ));
}

void main() {
  testWidgets('before departure all check-in actions are disabled', (tester) async {
    await showScreen(tester, _detail(dateAllowed: false));
    expect(find.byKey(const ValueKey('checkin-1')), findsNothing);
    expect(find.byKey(const ValueKey('checkin-2')), findsNothing);
    expect(find.textContaining('Chưa đến ngày khởi hành'), findsWidgets);
  });

  testWidgets('on departure date pending stops show only checkin and skip',
      (tester) async {
    await showScreen(tester, _detail(dateAllowed: true));
    expect(tester.widget<TextButton>(
      find.byKey(const ValueKey('checkin-1'))).onPressed, isNotNull);
    expect(tester.widget<TextButton>(
      find.byKey(const ValueKey('skip-1'))).onPressed, isNotNull);
    expect(find.byKey(const ValueKey('checkin-2')), findsNothing);
    expect(find.byKey(const ValueKey('skip-2')), findsNothing);
    expect(find.byKey(const ValueKey('checkout-1')), findsNothing);
    expect(find.byKey(const ValueKey('checkout-2')), findsNothing);
    expect(find.text('Cần check-out điểm trước đó'), findsWidgets);
    expect(find.textContaining('Phạm vi GPS'), findsNothing);
  });

  testWidgets('server advancement unlocks the next stop even without GPS',
      (tester) async {
    await showScreen(tester, _detail(dateAllowed: true, nextId: 2));
    expect(find.byKey(const ValueKey('checkin-1')), findsNothing);
    expect(tester.widget<TextButton>(
      find.byKey(const ValueKey('checkin-2'))).onPressed, isNotNull);
  });

  testWidgets('later-day stop unlocks only when earlier stops completed',
      (tester) async {
    await showScreen(tester, _detail(dateAllowed: true, nextId: 3));
    expect(tester.widget<TextButton>(
      find.byKey(const ValueKey('checkin-3'))).onPressed, isNotNull);
    expect(find.byKey(const ValueKey('checkin-1')), findsNothing);
  });

  testWidgets('older backend without permission flag disables check-in',
      (tester) async {
    final dto = BookingDetail.fromJson({
      'id': 123, 'bookingCode': 'BK-123',
      'tourName': 'Tour Demo', 'status': 'Confirmed',
      'startDate': '2026-11-12', 'endDate': '2026-11-13',
      'snapshotDays': [
        {'dayNumber': 1, 'title': 'Ngày 1', 'locations': [
          {'id': 1, 'name': 'Điểm A', 'attendanceStatus': 'Pending'}
        ]}
      ]
    });
    await showScreen(tester, dto);
    expect(find.byKey(const ValueKey('checkin-1')), findsNothing);
  });
  testWidgets('check-in offers camera and gallery photo options',
      (tester) async {
    await showScreen(tester, _detail(dateAllowed: true, nextId: 1));
    await tester.tap(find.byKey(const ValueKey('checkin-1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('pick-checkin-gallery')), findsOneWidget);
    expect(find.byKey(const ValueKey('pick-checkin-camera')), findsOneWidget);
    expect(find.textContaining('20 MB'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byKey(const ValueKey('confirm-checkin'))).onPressed, isNull);
    await tester.tap(find.text('Hủy'));
    await tester.pumpAndSettle();
  });

  testWidgets('checked-in point hides checkin/skip and shows checkout', (tester) async {
    final booking = _detail(dateAllowed: true);
    final active = BookingDetail(
      id: booking.id, code: booking.code, name: booking.name,
      status: booking.status, startDate: booking.startDate,
      endDate: booking.endDate, totalGuests: booking.totalGuests,
      passengers: booking.passengers, incidents: booking.incidents,
      canCheckInLocations: true, nextLocationCheckInId: 1,
      days: [TourDay(dayNumber: 1, title: 'Ngày 1', stops: [
        const TourStop(id: 1, name: 'Điểm A', status: 'CheckedIn'),
        const TourStop(id: 2, name: 'Điểm B', status: 'Pending'),
      ])],
    );
    await showScreen(tester, active);
    expect(find.byKey(const ValueKey('checkin-1')), findsNothing);
    expect(find.byKey(const ValueKey('skip-1')), findsNothing);
    expect(tester.widget<TextButton>(
      find.byKey(const ValueKey('checkout-1'))).onPressed, isNotNull);
    expect(find.byKey(const ValueKey('checkin-2')), findsNothing);
    expect(find.byKey(const ValueKey('skip-2')), findsNothing);
    expect(find.byKey(const ValueKey('checkout-2')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('checkout-1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('pick-checkin-gallery')), findsOneWidget);
    expect(find.byKey(const ValueKey('pick-checkin-camera')), findsOneWidget);
    expect(find.text('Xác nhận check-out'), findsOneWidget);
    await tester.tap(find.text('Hủy'));
    await tester.pumpAndSettle();
  });

  testWidgets('skip active stop requires camera photo and hides actions once skipped or checked out',
      (tester) async {
    final booking = _detail(dateAllowed: true);
    final finished = BookingDetail(
      id: booking.id, code: booking.code, name: booking.name,
      status: booking.status, startDate: booking.startDate,
      endDate: booking.endDate, totalGuests: booking.totalGuests,
      passengers: booking.passengers, incidents: booking.incidents,
      canCheckInLocations: true, nextLocationCheckInId: 3,
      days: [TourDay(dayNumber: 1, title: 'Ngày 1', stops: [
        const TourStop(
          id: 1, name: 'Điểm A', status: 'CheckedOut',
          checkinNote: 'Đã tới', checkoutNote: 'Đã rời',
        ),
        const TourStop(
          id: 2, name: 'Điểm B', status: 'Skipped',
          checkinNote: 'Đường sạt lở',
        ),
        const TourStop(id: 3, name: 'Điểm C', status: 'Pending'),
      ])],
    );
    await showScreen(tester, finished);
    expect(find.byKey(const ValueKey('checkin-1')), findsNothing);
    expect(find.byKey(const ValueKey('checkout-1')), findsNothing);
    expect(find.byKey(const ValueKey('skip-1')), findsNothing);
    expect(find.byKey(const ValueKey('checkin-2')), findsNothing);
    expect(find.byKey(const ValueKey('checkout-2')), findsNothing);
    expect(find.byKey(const ValueKey('skip-2')), findsNothing);
    expect(find.text('Ghi chú check-in: Đã tới'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('proof-toggle-1')));
    await tester.pumpAndSettle();
    expect(find.text('Ghi chú check-in: Đã tới'), findsOneWidget);
    expect(find.text('Ghi chú check-out: Đã rời'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('proof-toggle-2')));
    await tester.tap(find.byKey(const ValueKey('proof-toggle-2')));
    await tester.pumpAndSettle();
    expect(find.text('Lý do bỏ qua: Đường sạt lở'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const ValueKey('skip-3')));
    await tester.tap(find.byKey(const ValueKey('skip-3')));
    await tester.pumpAndSettle();
    expect(find.text('Bỏ qua · Điểm C'), findsOneWidget);
    expect(find.byKey(const ValueKey('pick-checkin-gallery')), findsOneWidget);
    expect(find.byKey(const ValueKey('pick-checkin-camera')), findsOneWidget);
    expect(find.text('Xác nhận bỏ qua'), findsOneWidget);
    expect(tester.widget<FilledButton>(
      find.byKey(const ValueKey('confirm-checkin'))).onPressed, isNull);
    await tester.tap(find.text('Hủy'));
    await tester.pumpAndSettle();
  });
}
