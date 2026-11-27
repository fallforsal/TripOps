import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../attendance/presentation/attendance_screen.dart';
import '../../location_checkin/presentation/location_screen.dart';
import '../../incidents/presentation/incident_screen.dart';
import '../../assigned_tours/presentation/tour_card.dart';
import '../../auth/domain/guide_account.dart';
import '../domain/home_trip_picker.dart';
import 'schedule_calendar_card.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.account,
    required this.guides,
    required this.bookings,
    required this.inProgressEndDates,
    required this.onOpenTour,
    required this.onTourTab,
  });

  final GuideAccount account;
  final GuideRepository guides;
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
          fontSize: 12, fontWeight: FontWeight.w800,
          color: teal, letterSpacing: 1.1,
        )),
        space(5),
        Text('Xin chào, ${account.name}! 👋',
          style: const TextStyle(
            fontSize: 24, fontWeight: FontWeight.w900, color: ink,
          )),
        const SizedBox(height: 5),
        const Text('Chúc bạn một ngày làm việc thật hiệu quả.',
          style: TextStyle(fontSize: 14, color: muted)),
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
        if (chosen != null) ...[
          space(14),
          _HomeOperations(key: ValueKey(chosen.id), tour: chosen, guides: guides),
        ],
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


class _HomeOperations extends StatefulWidget {
  const _HomeOperations({super.key, required this.tour, required this.guides});
  final BookingSummary tour;
  final GuideRepository guides;
  @override
  State<_HomeOperations> createState() => _HomeOperationsState();
}

class _HomeOperationsState extends State<_HomeOperations> {
  late Future<BookingDetail> _detail;
  @override
  void initState() {
    super.initState();
    _detail = widget.guides.detail(widget.tour.id);
  }

  Future<void> _open(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
    if (mounted) setState(() => _detail = widget.guides.detail(widget.tour.id));
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<BookingDetail>(
    future: _detail,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Card(child: ListTile(
          title: const Text('Chưa tải được tiến độ tour'),
          trailing: TextButton(onPressed: () => setState(() => _detail = widget.guides.detail(widget.tour.id)), child: const Text('Thử lại')),
        ));
      }
      final d = snapshot.data;
      if (d == null) return const LinearProgressIndicator();
      final stops = d.days.expand((day) => day.stops).toList();
      final done = stops.where((s) => s.status == 'CheckedOut' || s.status == 'Skipped').length;
      final pending = d.passengers.where((p) => p.status == 'Pending').length;
      final candidates = stops.where((s) => s.id == d.nextLocationCheckInId);
      final next = candidates.isEmpty ? null : candidates.first;
      final checkout = next?.status == 'CheckedIn';
      final canLocation = d.canCheckInLocations && next != null;
      final canAttendance = d.canRecordAttendance && pending > 0;
      final action = d.canStartTour ? 'Mở chi tiết để bắt đầu tour'
          : canAttendance ? 'Điểm danh $pending khách còn lại'
          : canLocation ? '${checkout ? "Check-out" : "Check-in"} · ${next?.name ?? ''}'
          : 'Xem thông tin và lịch trình tour';
      return Card(child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('TIẾN ĐỘ HÀNH TRÌNH', style: TextStyle(color: deepTeal, fontSize: 12, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('$done/${stops.length} điểm đã xử lý', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: ink)),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: stops.isEmpty ? 0 : done / stops.length, minHeight: 8),
          const SizedBox(height: 14),
          Text(action, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: ink)),
          const SizedBox(height: 10),
          if (!d.canStartTour && (canAttendance || canLocation))
            SizedBox(width: double.infinity, child: FilledButton.icon(
              onPressed: () => _open(canAttendance ? AttendanceScreen(detail: d, guides: widget.guides) : LocationScreen(detail: d, guides: widget.guides)),
              icon: Icon(canAttendance ? Icons.fact_check_outlined : Icons.camera_alt_outlined),
              label: Text(canAttendance ? 'Điểm danh ngay' : checkout ? 'Check-out' : 'Check-in'),
            )),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            OutlinedButton.icon(onPressed: () => _open(AttendanceScreen(detail: d, guides: widget.guides)), icon: const Icon(Icons.groups_outlined), label: const Text('Điểm danh')),
            OutlinedButton.icon(onPressed: () => _open(LocationScreen(detail: d, guides: widget.guides)), icon: const Icon(Icons.route_outlined), label: const Text('Lịch trình')),
            OutlinedButton.icon(onPressed: () => _open(IncidentScreen(detail: d, guides: widget.guides)), icon: const Icon(Icons.warning_amber_outlined), label: const Text('Báo sự cố')),
          ]),
        ]),
      ));
    },
  );
}
