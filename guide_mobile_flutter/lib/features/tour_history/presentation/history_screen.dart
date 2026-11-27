import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/guide_glass_metric.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../assigned_tours/domain/tour_catalog.dart';
import '../../assigned_tours/presentation/tour_card.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({
    super.key, required this.bookings, required this.onOpenTour,
  });

  final List<BookingSummary> bookings;
  final ValueChanged<BookingSummary> onOpenTour;

  @override
  Widget build(BuildContext context) {
    final history = filterBookings(
      bookings, filter: TourFilter.completed, today: DateTime.now(),
    );
    final guests = history.fold<int>(0, (total, b) => total + b.guestCount);
    final header = <Widget>[
        const Text('Những hành trình đã hoàn tất',
          style: TextStyle(color: ink, fontSize: 30, letterSpacing: -0.7,
            fontWeight: FontWeight.w700)),
        space(6),
        const Text('Lưu lại những chuyến đi và dấu ấn đã thực hiện.',
          style: TextStyle(color: muted, fontSize: 14)),
        space(17),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: GuideGlassMetric(
                key: const ValueKey('history-completed-metric'),
                icon: Icons.verified_outlined,
                value: history.length,
                label: 'Tour hoàn thành',
                color: const Color(0xFF315F91),
                tint: const Color(0xFFCFE0F7),
              )),
              const SizedBox(width: 9),
              Expanded(child: GuideGlassMetric(
                key: const ValueKey('history-guests-metric'),
                icon: Icons.groups_outlined,
                value: guests,
                label: 'Tổng lượt khách',
                color: deepTeal,
                tint: const Color(0xFFB9E1DE),
              )),
            ],
          ),
        ),
        space(22),
        GuideSectionTitle('Lịch sử tour (${history.length})'),
        space(11),
        if (history.isEmpty)
          const GuideEmptyState(
            title: 'Chưa có lịch sử tour',
            message: 'Các chuyến đi hoàn thành sẽ xuất hiện ở đây.',
            icon: Icons.history_rounded,
          ),
    ];
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(20, 16 + MediaQuery.paddingOf(context).top, 20, 28 + MediaQuery.paddingOf(context).bottom),
      itemCount: header.length + history.length,
      itemBuilder: (context, index) {
        if (index < header.length) return header[index];
        final tour = history[index - header.length];
        return TourCard(key: ValueKey(tour.id), tour: tour, onTap: () => onOpenTour(tour));
      },
    );
  }
}
