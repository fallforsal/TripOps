import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/utils/tour_image_url.dart';
import 'package:tripops_guide/core/widgets/tour_thumbnail.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';

void main() {
  test('resolve backend-uploaded relative tour image against API origin', () {
    expect(
      resolveTourImageUrl(
        '/api/v1/files/tours/agency1/12345678901234567890123456789012.jpg',
        apiBaseUrl: 'http://10.0.2.2:5080',
      ),
      'http://10.0.2.2:5080/api/v1/files/tours/agency1/12345678901234567890123456789012.jpg',
    );
  });

  test('preserve HTTPS image from cloud media provider', () {
    expect(
      resolveTourImageUrl(' https://res.cloudinary.com/demo/image/upload/tour.jpg '),
      'https://res.cloudinary.com/demo/image/upload/tour.jpg',
    );
  });

  test('reject missing, unknown, and unsafe image URL forms', () {
    expect(resolveTourImageUrl(null), isNull);
    expect(resolveTourImageUrl(''), isNull);
    expect(resolveTourImageUrl('javascript:alert(1)'), isNull);
    expect(resolveTourImageUrl('file:///etc/passwd'), isNull);
    expect(resolveTourImageUrl('/images/unknown.jpg'), isNull);
  });

  test('booking list maps optional thumbnail without breaking old API', () {
    final base = {
      'id': 15,
      'bookingCode': 'BK-15',
      'tourName': 'Đà Lạt',
      'startDate': '2026-11-10T00:00:00',
      'status': 'Confirmed',
      'totalGuests': 4,
    };
    expect(BookingSummary.fromJson(base).thumbnailUrl, isNull);
    expect(BookingSummary.fromJson({
      ...base,
      'thumbnailUrl': 'https://example.com/dalat.jpg',
    }).thumbnailUrl, 'https://example.com/dalat.jpg');
  });

  testWidgets('empty tour image displays stable placeholder', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: TourThumbnail(thumbnailUrl: null)),
      ),
    );
    expect(find.byIcon(Icons.landscape_outlined), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });
}
