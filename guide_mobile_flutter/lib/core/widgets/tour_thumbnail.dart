import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/tour_image_url.dart';

/// Tour image with consistent loading/error/absent fallback.
/// No extra API call is made: the image URL comes from BookingListItem.
class TourThumbnail extends StatelessWidget {
  const TourThumbnail({
    super.key,
    required this.thumbnailUrl,
    this.width = 56,
    this.height = 58,
  });

  final String? thumbnailUrl;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    final url = resolveTourImageUrl(thumbnailUrl);
    final fallback = Container(
      width: width,
      height: height,
      color: const Color(0xFFE8F6F4),
      alignment: Alignment.center,
      child: const Icon(Icons.landscape_outlined, color: deepTeal, size: 27),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(13),
      child: SizedBox(
        width: width,
        height: height,
        child: url == null
            ? fallback
            : Image.network(
                url,
                fit: BoxFit.cover,
                width: width,
                height: height,
                errorBuilder: (context, error, stackTrace) => fallback,
                loadingBuilder: (context, child, progress) =>
                    progress == null ? child : fallback,
              ),
      ),
    );
  }
}
