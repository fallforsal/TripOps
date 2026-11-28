import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../../core/widgets/tour_thumbnail.dart';
import '../domain/booking_models.dart';
import 'tour_status_pill.dart';

class TourCard extends StatelessWidget {
  const TourCard({
    super.key, required this.tour, required this.onTap,
    this.label, this.featured = false,
  });

  final BookingSummary tour;
  final VoidCallback onTap;
  final String? label;
  final bool featured;

  @override
  Widget build(BuildContext context) {
    final date = tour.endDate != null && vnDate(tour.endDate!) != vnDate(tour.startDate)
        ? '${vnDate(tour.startDate)} – ${vnDate(tour.endDate!)}'
        : vnDate(tour.startDate);

    // Tint-only glass avoids a separate backdrop blur for every tour in a list.
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GuideGlass(
        radius: 25,
        blurSigma: 0,
        shadow: false,
        highlightTint: const Color(0xF0FFFFFF),
        tint: featured ? const Color(0xD6E8F5F2) : const Color(0xB8FFFFFF),
        child: Material(
          type: MaterialType.transparency,
          child: Semantics(
            button: true,
            child: InkWell(
              key: ValueKey('tour-card-${tour.id}'),
              onTap: onTap,
              borderRadius: BorderRadius.circular(25),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final narrow = constraints.maxWidth < 300;
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        TourThumbnail(
                          thumbnailUrl: tour.thumbnailUrl,
                          width: narrow ? 70 : 84,
                          height: narrow ? 96 : 112,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              TourStatusPill(status: tour.status),
                              const SizedBox(height: 6),
                              Text(
                                tour.name,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 18, height: 1.2,
                                  fontWeight: FontWeight.w700, color: ink,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(tour.code, style: const TextStyle(
                                fontSize: 12, color: muted, fontWeight: FontWeight.w500,
                              )),
                              const SizedBox(height: 8),
                              _TourMeta(icon: Icons.calendar_today_outlined, text: date),
                              const SizedBox(height: 4),
                              _TourMeta(icon: Icons.groups_outlined, text: '${tour.guestCount} khách'),
                              if (label != null) ...[
                                const SizedBox(height: 6),
                                Text(label!, style: const TextStyle(
                                  fontSize: 12, color: deepTeal, fontWeight: FontWeight.w600,
                                )),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.chevron_right_rounded, color: muted, size: 20),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TourMeta extends StatelessWidget {
  const _TourMeta({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.only(top: 2),
        child: Icon(icon, size: 15, color: muted),
      ),
      const SizedBox(width: 6),
      Expanded(child: Text(text, style: const TextStyle(
        color: muted, fontSize: 13, height: 1.25,
      ))),
    ],
  );
}
