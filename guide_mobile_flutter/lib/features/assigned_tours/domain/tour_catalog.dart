import '../../../core/utils/search_normalizer.dart';
import 'booking_models.dart';

enum TourFilter { upcoming, inProgress, completed, all }

String tourFilterLabel(TourFilter filter) => switch (filter) {
  TourFilter.upcoming => 'Sắp tới',
  TourFilter.inProgress => 'Đang diễn ra',
  TourFilter.completed => 'Hoàn thành',
  TourFilter.all => 'Tất cả',
};

String bookingStatusLabel(String status) => switch (status) {
  'Pending' => 'Chờ xử lý',
  'Deposited' => 'Đã đặt cọc',
  'Confirmed' => 'Đã xác nhận',
  'Paid' => 'Đã thanh toán',
  'InProgress' => 'Đang diễn ra',
  'Completed' => 'Hoàn thành',
  'Cancelled' => 'Đã hủy',
  'Rejected' => 'Bị từ chối',
  _ => status,
};

/// Search display-only fields. Normalization supports Vietnamese accents and
/// is independent of API data; no server-side search endpoint is assumed.

List<BookingSummary> filterBookings(
  List<BookingSummary> bookings, {
  required TourFilter filter,
  required DateTime today,
  String query = '',
}) {
  final date = DateTime(today.year, today.month, today.day);
  final search = normalizedSearch(query);
  final matched = bookings.where((booking) {
    final start = DateTime(
      booking.startDate.year, booking.startDate.month, booking.startDate.day,
    );
    final statusMatch = switch (filter) {
      TourFilter.upcoming =>
        (booking.status == 'Confirmed' || booking.status == 'Paid') &&
        !start.isBefore(date),
      TourFilter.inProgress => booking.status == 'InProgress',
      TourFilter.completed => booking.status == 'Completed',
      TourFilter.all => true,
    };
    if (!statusMatch) return false;
    if (search.isEmpty) return true;
    return normalizedSearch(
      '${booking.name} ${booking.code} ${booking.customerName ?? ''}',
    ).contains(search);
  }).toList();

  matched.sort((a, b) {
    final byDate = filter == TourFilter.upcoming
        ? a.startDate.compareTo(b.startDate)
        : b.startDate.compareTo(a.startDate);
    return byDate != 0 ? byDate : a.id.compareTo(b.id);
  });
  return matched;
}
