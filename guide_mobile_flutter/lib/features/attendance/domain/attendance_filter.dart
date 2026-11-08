import '../../assigned_tours/domain/booking_models.dart';
import '../../../core/utils/search_normalizer.dart';

enum AttendanceFilter { all, pending, checkedIn, absent }

String attendanceFilterLabel(AttendanceFilter filter) => switch (filter) {
  AttendanceFilter.all => 'Tất cả',
  AttendanceFilter.pending => 'Chưa điểm danh',
  AttendanceFilter.checkedIn => 'Có mặt',
  AttendanceFilter.absent => 'Vắng',
};

List<Passenger> filterPassengers(
  List<Passenger> passengers, {
  AttendanceFilter filter = AttendanceFilter.all,
  String query = '',
}) {
  final search = normalizedSearch(query);
  return passengers.where((p) {
    if (p.recordStatus?.toUpperCase() == 'INACTIVE') return false;
    final statusMatch = switch (filter) {
      AttendanceFilter.all => true,
      AttendanceFilter.pending => p.status == 'Pending',
      AttendanceFilter.checkedIn => p.status == 'CheckedIn',
      AttendanceFilter.absent => p.status == 'Absent',
    };
    if (!statusMatch) return false;
    if (search.isEmpty) return true;
    return normalizedSearch('${p.name} ${p.phone ?? ''}').contains(search);
  }).toList();
}
