import 'package:flutter/material.dart';
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
      bookings,
      filter: filter,
      today: DateTime.now(),
      query: query,
    );
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        TextFormField(
          key: const ValueKey('tour-search'),
          initialValue: query,
          decoration: const InputDecoration(
            hintText: 'Tìm tour, mã booking hoặc tên khách',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: onQueryChanged,
        ),
        space(),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: TourFilter.values.map((value) =>
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(tourFilterLabel(value)),
                selected: filter == value,
                onSelected: (_) => onFilterChanged(value),
              ),
            ),
          ).toList()),
        ),
        space(),
        if (visible.isEmpty)
          const Card(child: Padding(
            padding: EdgeInsets.all(20),
            child: Text('Không tìm thấy tour phù hợp với bộ lọc.'),
          )),
        ...visible.map((tour) => TourCard(tour: tour,
          onTap: () => onOpenTour(tour))),
      ],
    );
  }
}
