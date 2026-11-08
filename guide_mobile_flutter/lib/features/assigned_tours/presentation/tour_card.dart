import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/guide_ui.dart';
import '../domain/booking_models.dart';
import '../domain/tour_catalog.dart';

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
    final inProgress = tour.status == 'InProgress';
    final completed = tour.status == 'Completed';
    final statusColor = inProgress ? const Color(0xFF137F78)
        : completed ? const Color(0xFF427AB4) : const Color(0xFF9B7126);
    final statusBg = inProgress ? paleTeal
        : completed ? const Color(0xFFEAF2FD) : const Color(0xFFFFF4DF);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('tour-card-${tour.id}'),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(tour.code,
                style: const TextStyle(color: teal,
                  fontSize: 11, fontWeight: FontWeight.w800))),
              GuideStatusPill(bookingStatusLabel(tour.status),
                background: statusBg, foreground: statusColor),
            ]),
            const SizedBox(height: 12),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 56, height: 58,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F6F4),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(Icons.landscape_outlined, color: deepTeal, size: 27),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tour.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 15,
                      fontWeight: FontWeight.w900, color: ink)),
                  const SizedBox(height: 6),
                  Row(children: [
                    const Icon(Icons.calendar_today_outlined, size: 13, color: muted),
                    const SizedBox(width: 5),
                    Flexible(child: Text(vnDate(tour.startDate),
                      style: const TextStyle(color: muted, fontSize: 12))),
                    const SizedBox(width: 12),
                    const Icon(Icons.groups_outlined, size: 14, color: muted),
                    const SizedBox(width: 4),
                    Text('${tour.guestCount} khách',
                      style: const TextStyle(color: muted, fontSize: 12)),
                  ]),
                ])),
            ]),
            if (label != null || featured) ...[
              const SizedBox(height: 13),
              Divider(height: 1, color: line),
              const SizedBox(height: 10),
              Row(children: [
                if (label != null)
                  Expanded(child: Text(label!, style: const TextStyle(
                    fontSize: 11, color: deepTeal, fontWeight: FontWeight.w700))),
                if (label == null) const Spacer(),
                const Text('Xem chi tiết  ›', style: TextStyle(
                  color: teal, fontWeight: FontWeight.w800, fontSize: 12)),
              ]),
            ] else ...[
              const SizedBox(height: 12),
              const Align(alignment: Alignment.centerRight,
                child: Text('Xem chi tiết  ›', style: TextStyle(
                  color: teal, fontWeight: FontWeight.w800, fontSize: 12))),
            ],
            // Keep a tappable text label for the existing widget contract.
          ]),
        ),
      ),
    );
  }
}
