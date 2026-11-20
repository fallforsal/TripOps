/// Client-side photo limits; server revalidates the actual bytes.
abstract final class CheckinPhotoLimits {
  static const maxFiles = 5;
  static const maxFileBytes = 5 * 1024 * 1024;
  static const maxTotalBytes = 20 * 1024 * 1024;
}

class CheckinPhoto {
  const CheckinPhoto({
    required this.path, required this.name,
    required this.mime, required this.bytes,
  });
  final String path;
  final String name;
  final String mime;
  final int bytes;

  static String? mimeForFileName(String name) {
    final extension = name.toLowerCase().split('.').last;
    return switch (extension) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => null,
    };
  }

  static String? validate(List<CheckinPhoto> photos) {
    if (photos.length > CheckinPhotoLimits.maxFiles) {
      return 'Chỉ được chọn tối đa 5 ảnh.';
    }
    if (photos.any((p) => mimeForFileName(p.name) != p.mime ||
        p.bytes <= 0 || p.bytes > CheckinPhotoLimits.maxFileBytes)) {
      return 'Chỉ nhận JPG/PNG/WebP, tối đa 5 MB mỗi ảnh.';
    }
    if (photos.fold<int>(0, (total, p) => total + p.bytes) >
        CheckinPhotoLimits.maxTotalBytes) {
      return 'Tổng dung lượng ảnh không vượt quá 20 MB.';
    }
    return null;
  }

}
