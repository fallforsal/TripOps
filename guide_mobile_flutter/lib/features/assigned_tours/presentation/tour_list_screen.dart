import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/guide_segmented_control.dart';
import '../../../core/widgets/guide_search_bar.dart';
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
      padding: EdgeInsets.fromLTRB(20, 16 + MediaQuery.paddingOf(context).top, 20, 25 + MediaQuery.paddingOf(context).bottom),
      children: [
        const Text('Các chuyến đi được giao', style: TextStyle(
          fontSize: 30, fontWeight: FontWeight.w700, letterSpacing: -0.7, color: ink,
        )),
        space(5),
        const Text('Theo dõi các tour và lịch trình bạn đang phụ trách.',
          style: TextStyle(fontSize: 14, color: muted)),
        space(17),
        GuideSearchBar(
          value: query,
          placeholder: 'Tìm kiếm tour',
          fieldKey: const ValueKey('tour-search'),
          onChanged: onQueryChanged,
        ),
        space(12),
        GuideSegmentedControl<TourFilter>(
          key: const ValueKey('tour-filter-segmented-control'),
          value: filter,
          labels: {
            for (final option in TourFilter.values)
              option: tourFilterLabel(option),
          },
          onChanged: onFilterChanged,
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
