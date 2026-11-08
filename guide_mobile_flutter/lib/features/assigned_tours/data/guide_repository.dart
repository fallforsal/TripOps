import '../../../core/network/api_client.dart';
import '../domain/booking_models.dart';

class GuideRepository {
  GuideRepository(this.api);
  final TripOpsApi api;

  /// Retrieves every page: picking the next upcoming trip from only page 1
  /// is incorrect because the backend's guide list is not date-ordered.
  Future<List<BookingSummary>> allBookings() async {
    const size = 100;
    final collected = <BookingSummary>[];
    for (var page = 1; page <= 100; page++) {
      final result = BookingPage.fromJson(await api.getMap(
        'guide/bookings',
        query: {'page': page, 'pageSize': size},
      ));
      collected.addAll(result.items);
      if (collected.length >= result.total) return collected;
      if (result.items.isEmpty) {
        throw const ApiFailure('Dữ liệu phân trang không đầy đủ. Vui lòng thử lại.');
      }
    }
    throw const ApiFailure('Danh sách tour quá lớn; chưa tải hết dữ liệu.');
  }

  Future<BookingDetail> detail(int id) async =>
      BookingDetail.fromJson(await api.getMap('guide/bookings/$id'));

  Future<BookingDetail> start(int id) async =>
      BookingDetail.fromJson(await api.postMap('guide/bookings/$id/start'));

  Future<BookingDetail> complete(int id) async =>
      BookingDetail.fromJson(await api.postMap('guide/bookings/$id/complete'));

  Future<void> attendance(int bookingId, int participantId, String status) async {
    await api.postMap('guide/bookings/$bookingId/attendance', {
      'participantId': participantId,
      'status': status,
    });
  }

  Future<BookingDetail> checkIn(
      int bookingId, int locationId, String status, String? note) async =>
      BookingDetail.fromJson(await api.postMap(
        'guide/bookings/$bookingId/locations/$locationId/check-in',
        {'status': status, 'note': note},
      ));

  Future<void> incident(int id, {required String type, required String title,
    required String description, String? severity}) async {
    await api.postMap('guide/bookings/$id/incidents', {
      'incidentType': type,
      'title': title,
      'description': description,
      'severity': severity,
    });
  }
}
