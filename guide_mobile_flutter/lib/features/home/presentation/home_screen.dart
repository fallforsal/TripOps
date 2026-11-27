import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../assigned_tours/presentation/tour_card.dart';
import '../../auth/domain/guide_account.dart';
import '../domain/home_trip_picker.dart';
import 'schedule_calendar_card.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.account,
    required this.bookings,
    required this.inProgressEndDates,
    required this.onOpenTour,
    required this.onTourTab,
  });

  final GuideAccount account;
  final List<BookingSummary> bookings;
  final Map<int, DateTime> inProgressEndDates;
  final ValueChanged<BookingSummary> onOpenTour;
  final VoidCallback onTourTab;

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final picked = selectHomeTrip(
      bookings, today, inProgressEndDates: inProgressEndDates,
    );
    final chosen = picked.tour;
    final nextTrips = selectNextHomeTrips(
      bookings, today, inProgressEndDates: inProgressEndDates, limit: 3,
    );
    final isUpcoming = picked.kind == HomeTripKind.upcoming;
    final active = bookings.where((b) => b.isActive).length;
    final completed = bookings.where((b) => b.isCompleted).length;
    final daysToGo = chosen == null ? null : DateTime(
      chosen.startDate.year, chosen.startDate.month, chosen.startDate.day,
    ).difference(DateTime(today.year, today.month, today.day)).inDays;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
      children: [
        Text('CHÀO MỪNG TRỞ LẠI', style: const TextStyle(
          fontSize: 10, fontWeight: FontWeight.w800,
          color: teal, letterSpacing: 1.1,
        )),
        space(5),
        Text('Xin chào, ${account.name}! 👋',
          style: const TextStyle(
            fontSize: 24, fontWeight: FontWeight.w900, color: ink,
          )),
        const SizedBox(height: 5),
        const Text('Chúc bạn một ngày làm việc thật hiệu quả.',
          style: TextStyle(fontSize: 12, color: muted)),
        space(20),
        GuideHero(
          label: chosen == null ? 'KHÔNG CÓ TOUR' :
            isUpcoming ? 'TOUR SẮP TỚI GẦN NHẤT' : 'HÀNH TRÌNH HÔM NAY',
          title: chosen?.name ?? 'Chưa có hành trình sắp tới',
          subtitle: chosen == null
            ? 'Các tour được phân công sẽ xuất hiện tại đây.'
            : '${chosen.code}  •  ${vnDate(chosen.startDate)}  •  ${chosen.guestCount} khách',
          actionLabel: chosen == null ? 'Xem tất cả tour' : 'Xem chi tiết tour',
          onTap: chosen == null ? onTourTab : () => onOpenTour(chosen),
        ),
        space(15),
        Row(children: [
          Expanded(child: GuideMetric(
            icon: Icons.route_outlined, value: '$active', label: 'Tour đang phụ trách',
          )),
          const SizedBox(width: 9),
          Expanded(child: GuideMetric(
            icon: Icons.event_outlined,
            value: daysToGo == null ? '—' :
              daysToGo > 0 ? '$daysToGo' : '0',
            label: isUpcoming ? 'Ngày tới khởi hành' : 'Cách ngày khởi hành',
            iconColor: const Color(0xFFB78330),
            tint: const Color(0xFFFFF3DF),
          )),
          const SizedBox(width: 9),
          Expanded(child: GuideMetric(
            icon: Icons.verified_outlined,
            value: '$completed', label: 'Tour đã hoàn thành',
            iconColor: const Color(0xFF477DB4),
            tint: const Color(0xFFEAF3FC),
          )),
        ]),
        space(22),
        const GuideSectionTitle('Lịch dẫn tour'),
        space(10),
        ScheduleCalendarCard(
          bookings: bookings,
          inProgressEndDates: inProgressEndDates,
          onOpenTour: onOpenTour,
          today: today,
        ),
        space(22),
        GuideSectionTitle('Lịch trình kế tiếp',
          trailing: 'Xem tất cả', onTap: onTourTab),
        space(10),
        if (nextTrips.isEmpty)
          const GuideEmptyState(
            title: 'Chưa có lịch trình kế tiếp',
            message: 'Khi Agency phân công tour, lịch trình sẽ hiển thị ở đây.',
          )
        else
          ...nextTrips.map((tour) => TourCard(
            tour: tour,
            onTap: () => onOpenTour(tour),
          )),
      ],
    );
  }
}
