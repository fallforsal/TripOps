import 'api.dart';
import 'models.dart';

class AuthRepository {
  AuthRepository(this.api);
  final TripOpsApi api;

  Future<GuideAccount> login(String email, String password) async {
    final json = await api.postMap('auth/login', {
      'email': email.trim(),
      'password': password,
    });
    final account = GuideAccount.fromJson(json);
    if (account.role != 'guide') {
      await api.logout();
      throw const ApiFailure('Ứng dụng này chỉ dành cho tài khoản Hướng dẫn viên (guide).', statusCode: 403);
    }
    return account;
  }

  Future<GuideAccount?> restore() async {
    try {
      final account = GuideAccount.fromJson(await api.getMap('auth/me'));
      if (account.role != 'guide') {
        await api.discardSession();
        return null;
      }
      return account;
    } on ApiFailure catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        await api.discardSession();
        return null;
      }
      rethrow;
    }
  }

  Future<void> logout() => api.logout();
}

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
