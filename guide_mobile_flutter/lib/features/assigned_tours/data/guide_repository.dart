import 'package:dio/dio.dart';
import 'dart:typed_data';
import '../../../core/network/api_client.dart';
import '../../location_checkin/domain/checkin_photo.dart';
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

  Future<BookingDetail> checkInWithImages(
    int bookingId, int locationId, String? note, List<CheckinPhoto> photos,
  ) async {
    final validation = CheckinPhoto.validate(photos);
    if (photos.isEmpty || validation != null) {
      throw ApiFailure(validation ?? 'Vui lòng chọn ảnh.');
    }
    final form = FormData();
    form.fields.add(const MapEntry('Status', 'CheckedIn'));
    if (note != null && note.trim().isNotEmpty) {
      form.fields.add(MapEntry('Note', note.trim()));
    }
    for (final photo in photos) {
      final part = await MultipartFile.fromFile(
        photo.path,
        filename: photo.name,
        contentType: DioMediaType.parse(photo.mime),
      );
      form.files.add(MapEntry('Images', part));
    }
    return BookingDetail.fromJson(await api.postForm(
      'guide/bookings/$bookingId/locations/$locationId/check-in-with-images',
      form,
    ));
  }

  Future<Uint8List> imageBytes(String url) => api.imageBytes(url);

  Future<void> incident(int id, {required String type, required String title,
    required String description, List<CheckinPhoto> images = const []}) async {
    final validation = CheckinPhoto.validate(images);
    if (validation != null) throw ApiFailure(validation);
    // The single incident API accepts multipart/form-data even without photos.
    final form = FormData();
    form.fields.addAll([
      MapEntry('IncidentType', type),
      MapEntry('Title', title),
      MapEntry('Description', description),
    ]);
    for (final photo in images) {
      form.files.add(MapEntry('Images', await MultipartFile.fromFile(
        photo.path, filename: photo.name,
        contentType: DioMediaType.parse(photo.mime),
      )));
    }
    await api.postForm('guide/bookings/$id/incidents', form);
  }
}
