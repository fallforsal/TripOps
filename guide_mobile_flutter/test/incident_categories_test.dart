import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/incidents/domain/incident_categories.dart';
import 'package:tripops_guide/features/incidents/presentation/incident_screen.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';

class _StubGuideRepository implements GuideRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('dropdown has exactly the eight canonical incident categories', () {
    expect(incidentCategories.map((item) => item.code).toList(), [
      'HEALTH', 'VEHICLE', 'WEATHER', 'CUSTOMER', 'SECURITY',
      'SERVICE_PROVIDER', 'SCHEDULE', 'OTHER',
    ]);
    expect(incidentCategories.map((item) => item.code).toSet().length, 8);
    expect(incidentCategories.every((item) => item.label.isNotEmpty), isTrue);
    expect(incidentCategories.singleWhere(
      (item) => item.code == 'SERVICE_PROVIDER').label,
      'Dịch vụ & Nhà cung cấp');
  });

  testWidgets('incident report requires choosing a category from dropdown',
      (tester) async {
    final booking = BookingDetail.fromJson({
      'id': 18, 'bookingCode': 'INC-TEST', 'tourName': 'Tour thử nghiệm',
      'startDate': '2026-11-14', 'endDate': '2026-11-14',
      'totalGuests': 1, 'status': 'InProgress',
    });
    await tester.pumpWidget(MaterialApp(
      home: IncidentScreen(detail: booking, guides: _StubGuideRepository()),
    ));

    expect(find.byKey(const ValueKey('incident-type-dropdown')), findsOneWidget);
    expect(find.text('Chọn loại sự cố'), findsOneWidget);
    expect(find.text('Mức độ ảnh hưởng'), findsNothing);

    await tester.ensureVisible(find.byKey(const ValueKey('incident-submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('incident-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Vui lòng chọn loại sự cố'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const ValueKey('incident-type-dropdown')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('incident-type-dropdown')));
    await tester.pumpAndSettle();
    expect(find.text('Dịch vụ & Nhà cung cấp'), findsWidgets);
    await tester.tap(find.text('Dịch vụ & Nhà cung cấp').last);
    await tester.pumpAndSettle();
    expect(find.text('Vui lòng chọn loại sự cố'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
