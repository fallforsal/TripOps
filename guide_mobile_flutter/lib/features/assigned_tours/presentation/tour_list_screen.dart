import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../domain/booking_models.dart';
import '../domain/tour_catalog.dart';
import 'tour_card.dart';

class TourListScreen extends StatelessWidget {
  const TourListScreen({
    super.key,
    required this.bookings,
    required this.filter,
    required this.query,
    required this.onFilterChanged,
    required this.onQueryChanged,
    required this.onOpenTour,
  });

  final List<BookingSummary> bookings;
  final TourFilter filter;
  final String query;
  final ValueChanged<TourFilter> onFilterChanged;
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<BookingSummary> onOpenTour;

  @override
  Widget build(BuildContext context) {
    final visible = filterBookings(
      bookings, filter: filter, today: DateTime.now(), query: query,
    );
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 25),
      children: [
        const Text('Các chuyến đi được giao', style: TextStyle(
          fontSize: 20, fontWeight: FontWeight.w900, color: ink,
        )),
        space(5),
        const Text('Theo dõi các tour và lịch trình bạn đang phụ trách.',
          style: TextStyle(fontSize: 12, color: muted)),
        space(17),
        TextFormField(
          key: const ValueKey('tour-search'),
          initialValue: query,
          decoration: const InputDecoration(
            hintText: 'Tìm tên tour, mã booking, tên khách...',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: onQueryChanged,
        ),
        space(12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: TourFilter.values.map((option) => Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(tourFilterLabel(option)),
              selected: filter == option,
              onSelected: (_) => onFilterChanged(option),
            ),
          )).toList()),
        ),
        space(20),
        GuideSectionTitle('Danh sách tour (${visible.length})'),
        space(13),
        if (visible.isEmpty)
          const GuideEmptyState(
            title: 'Không tìm thấy tour',
            message: 'Hãy thử từ khóa hoặc bộ lọc trạng thái khác.',
            icon: Icons.search_off_outlined,
          ),
        ...visible.map((tour) => TourCard(
          tour: tour, onTap: () => onOpenTour(tour),
        )),
      ],
    );
  }
}
