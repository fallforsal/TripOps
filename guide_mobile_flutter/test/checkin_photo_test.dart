import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/features/location_checkin/domain/checkin_photo.dart';
import 'package:tripops_guide/features/assigned_tours/domain/booking_models.dart';

CheckinPhoto image(int index, {int bytes = 2048, String ext = 'jpg'}) =>
    CheckinPhoto(path: '/tmp/photo_$index.$ext', name: 'photo_$index.$ext',
        mime: CheckinPhoto.mimeForFileName('photo.$ext') ?? '', bytes: bytes);

void main() {
  test('photo limits accept one or five valid images', () {
    expect(CheckinPhoto.validate([image(0)]), isNull);
    expect(CheckinPhoto.validate(List.generate(5, (i) => image(i))), isNull);
  });

  test('reject six images, unsupported format and oversized images', () {
    expect(CheckinPhoto.validate(List.generate(6, (i) => image(i))),
        contains('5 ảnh'));
    expect(CheckinPhoto.validate([image(0, ext: 'heic')]), isNotNull);
    expect(CheckinPhoto.validate([image(0, bytes: 5 * 1024 * 1024 + 1)]),
        contains('5 MB'));
  });

  test('reject over 20 MB total', () {
    final photos = List.generate(5,
        (i) => image(i, bytes: 4 * 1024 * 1024 + 1));
    expect(CheckinPhoto.validate(photos), contains('20 MB'));
  });

  test('tour stop parses all proof photo URLs or defaults empty', () {
    final payload = {
      'id': 2, 'name': 'Địa điểm 2', 'attendanceStatus': 'CheckedIn',
      'photoUrls': ['https://example.com/a.jpg', 'https://example.com/b.jpg']
    };
    expect(TourStop.fromJson(payload).photoUrls.length, 2);
    payload.remove('photoUrls');
    expect(TourStop.fromJson(payload).photoUrls, isEmpty);
  });
}
