import '../../assigned_tours/domain/booking_models.dart';

enum HomeTripKind { today, upcoming, none }

class HomeTrip {
  const HomeTrip(this.kind, [this.tour]);
  final HomeTripKind kind;
  final BookingSummary? tour;
}

/// Uses only assigned, operationally meaningful bookings. InProgress bookings
/// starting on a previous day require a detail endDate from the server.
HomeTrip selectHomeTrip(
  List<BookingSummary> items,
  DateTime now, {
  Map<int, DateTime> inProgressEndDates = const {},
}) {
  final today = DateTime(now.year, now.month, now.day);
  DateTime day(DateTime d) => DateTime(d.year, d.month, d.day);
  final possible = items.where((b) => b.isActive).toList();

  final todayTours = possible.where((b) {
    if (day(b.startDate) == today) return true;
    final endDate = b.endDate ?? inProgressEndDates[b.id];
    if (day(b.startDate).isAfter(today)) return false;
    if (b.status == 'InProgress') {
      return endDate != null && !day(endDate).isBefore(today);
    }
    return b.endDate != null && !day(b.endDate!).isBefore(today);
  }).toList();

  if (todayTours.isNotEmpty) {
    // Tour already in progress wins; then nearest start, then stable id.
    int rank(BookingSummary b) => switch (b.status) {
      'InProgress' => 0,
      'Paid' => 1,
      'Confirmed' => 2,
      _ => 3,
    };
    todayTours.sort((a, b) {
      final r = rank(a).compareTo(rank(b));
      if (r != 0) return r;
      final d = b.startDate.compareTo(a.startDate);
      return d != 0 ? d : a.id.compareTo(b.id);
    });
    return HomeTrip(HomeTripKind.today, todayTours.first);
  }

  final next = items.where((b) =>
      (b.status == 'Confirmed' || b.status == 'Paid') &&
      day(b.startDate).isAfter(today)).toList()
    ..sort((a, b) {
      final byDate = a.startDate.compareTo(b.startDate);
      return byDate != 0 ? byDate : a.id.compareTo(b.id);
    });

  return next.isEmpty ? const HomeTrip(HomeTripKind.none)
      : HomeTrip(HomeTripKind.upcoming, next.first);
}

/// Returns up to [limit] active assigned schedules from today onward, nearest first.
List<BookingSummary> selectNextHomeTrips(
  List<BookingSummary> items,
  DateTime now, {
  Map<int, DateTime> inProgressEndDates = const {},
  int limit = 3,
}) {
  final today = DateTime(now.year, now.month, now.day);
  DateTime day(DateTime d) => DateTime(d.year, d.month, d.day);

  final upcoming = items.where((b) {
    if (!b.isActive) return false;
    final endDate = b.endDate ?? inProgressEndDates[b.id];
    if (!day(b.startDate).isBefore(today)) return true;
    return endDate != null && !day(endDate).isBefore(today);
  }).toList()
    ..sort((a, b) {
      final byDate = a.startDate.compareTo(b.startDate);
      return byDate != 0 ? byDate : a.id.compareTo(b.id);
    });

  return upcoming.take(limit).toList();
}

/// Returns assigned bookings (active or completed) whose stage covers [date].
List<BookingSummary> bookingsForCalendarDay(
  List<BookingSummary> items,
  DateTime date, {
  Map<int, DateTime> inProgressEndDates = const {},
}) {
  final target = DateTime(date.year, date.month, date.day);
  DateTime day(DateTime d) => DateTime(d.year, d.month, d.day);

  return items.where((b) {
    if (!b.isActive && !b.isCompleted) return false;
    final start = day(b.startDate);
    final rawEnd = b.endDate ?? inProgressEndDates[b.id] ?? start;
    final end = day(rawEnd).isBefore(start) ? start : day(rawEnd);
    return !target.isBefore(start) && !target.isAfter(end);
  }).toList()
    ..sort((a, b) {
      final byDate = a.startDate.compareTo(b.startDate);
      return byDate != 0 ? byDate : a.id.compareTo(b.id);
    });
}
