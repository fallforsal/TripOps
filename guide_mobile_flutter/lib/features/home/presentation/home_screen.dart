import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../assigned_tours/presentation/tour_card.dart';
import '../../auth/domain/guide_account.dart';
import '../../invitations/presentation/invitation_notice.dart';
import '../domain/home_trip_picker.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.account,
    required this.bookings,
    required this.inProgressEndDates,
    required this.onOpenTour,
    required this.onTourTab,
    required this.onHistoryTab,
  });

  final GuideAccount account;
  final List<BookingSummary> bookings;
  final Map<int, DateTime> inProgressEndDates;
  final ValueChanged<BookingSummary> onOpenTour;
  final VoidCallback onTourTab;
  final VoidCallback onHistoryTab;

  @override
  Widget build(BuildContext context) {
    final chosen = selectHomeTrip(
      bookings, DateTime.now(), inProgressEndDates: inProgressEndDates,
    );
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        Text('Xin chào, ${account.name} 👋',
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: ink)),
        const Text('Chúc bạn có một hành trình tốt đẹp.',
          style: TextStyle(color: muted)),
        space(22),
        Text(chosen.kind == HomeTripKind.today ? 'Hành trình hôm nay'
          : chosen.kind == HomeTripKind.upcoming ? 'Hành trình sắp tới' : 'Hành trình của bạn',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: ink)),
        space(),
        if (chosen.tour != null)
          TourCard(
            tour: chosen.tour!,
            onTap: () => onOpenTour(chosen.tour!),
            label: chosen.kind == HomeTripKind.upcoming
              ? 'Tour gần nhất sắp tới' : 'Tour hôm nay',
          )
        else const Card(
          child: Padding(
            padding: EdgeInsets.all(22),
            child: Text('Hôm nay không có tour và chưa có tour sắp tới.'),
          ),
        ),
        space(24),
        const Text('Tác vụ của bạn',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: ink)),
        space(),
        Card(child: ListTile(
          leading: const Icon(Icons.route_outlined),
          title: const Text('Tour được phân công'),
          subtitle: Text('${bookings.where((b) => b.isActive).length} tour có hiệu lực'),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTourTab,
        )),
        Card(child: ListTile(
          leading: const Icon(Icons.history),
          title: const Text('Lịch sử tour'),
          trailing: const Icon(Icons.chevron_right),
          onTap: onHistoryTab,
        )),
        const InvitationNotice(),
      ],
    );
  }
}
