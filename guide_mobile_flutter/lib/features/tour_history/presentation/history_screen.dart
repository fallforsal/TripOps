import 'package:flutter/material.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../assigned_tours/domain/tour_catalog.dart';
import '../../assigned_tours/presentation/tour_card.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({
    super.key,
    required this.bookings,
    required this.onOpenTour,
  });

  final List<BookingSummary> bookings;
  final ValueChanged<BookingSummary> onOpenTour;

  @override
  Widget build(BuildContext context) {
    final history = filterBookings(
      bookings,
      filter: TourFilter.completed,
      today: DateTime.now(),
    );
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        if (history.isEmpty) const Text('Chưa có tour đã hoàn thành.'),
        ...history.map((tour) => TourCard(
          tour: tour, onTap: () => onOpenTour(tour),
        )),
      ],
    );
  }
}
