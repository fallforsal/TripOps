import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/view_helpers.dart';
import '../domain/booking_models.dart';
import '../domain/tour_catalog.dart';

class TourCard extends StatelessWidget {
  const TourCard({super.key, required this.tour, required this.onTap, this.label});
  final BookingSummary tour;
  final VoidCallback onTap;
  final String? label;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 12),
    child: InkWell(borderRadius: BorderRadius.circular(20), onTap: onTap,
      child: Padding(padding: const EdgeInsets.all(18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (label != null) ...[
            Text(label!, style: const TextStyle(color: Color(0xFF087D82), fontWeight: FontWeight.bold)),
            space(8),
          ],
          Text(tour.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold, color: ink)),
          space(10),
          Text('${tour.code}  ·  ${bookingStatusLabel(tour.status)}', style: const TextStyle(color: muted)),
          space(8),
          Row(children: [
            const Icon(Icons.event_outlined, size: 18, color: muted),
            const SizedBox(width: 6),
            Expanded(child: Text('Khởi hành ${vnDate(tour.startDate)}')),
            const Icon(Icons.group_outlined, size: 18, color: muted),
            const SizedBox(width: 5),
            Text('${tour.guestCount} khách'),
          ]),
          space(12),
          const Align(alignment: Alignment.centerRight,
            child: Text('Xem chi tiết  ›',
              style: TextStyle(color: Color(0xFF087D82), fontWeight: FontWeight.bold))),
        ]),
      ),
    ),
  );
}
