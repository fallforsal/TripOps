import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
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
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
      children: [
        const Text('Những hành trình đã hoàn tất',
          style: TextStyle(color: ink, fontSize: 20,
            fontWeight: FontWeight.w900)),
        space(6),
        const Text('Lưu lại những chuyến đi và dấu ấn đã thực hiện.',
          style: TextStyle(color: muted, fontSize: 12)),
        space(17),
        Row(children: [
          Expanded(child: GuideMetric(
            icon: Icons.verified_outlined,
            value: '${history.length}', label: 'Tour hoàn thành',
          )),
          const SizedBox(width: 9),
          Expanded(child: GuideMetric(
            icon: Icons.groups_outlined,
            value: '$guests', label: 'Tổng lượt khách',
            iconColor: const Color(0xFF477DB4),
            tint: const Color(0xFFEAF3FC),
          )),
        ]),
        space(22),
        GuideSectionTitle('Lịch sử tour (${history.length})'),
        space(11),
        if (history.isEmpty)
          const GuideEmptyState(
            title: 'Chưa có lịch sử tour',
            message: 'Các chuyến đi hoàn thành sẽ xuất hiện ở đây.',
            icon: Icons.history_rounded,
          ),
        ...history.map((tour) => TourCard(
          tour: tour, onTap: () => onOpenTour(tour),
        )),
      ],
    );
  }
