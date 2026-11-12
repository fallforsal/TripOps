import '../../../core/utils/tripops_dates.dart';

class BookingSummary {
  const BookingSummary({
    required this.id, required this.code, required this.name,
    required this.startDate, required this.status, required this.guestCount,
    this.customerName, this.contactPhone, this.thumbnailUrl,
  });
  final int id;
  final String code;
  final String name;
  final DateTime startDate;
  final String status;
  final int guestCount;
  final String? customerName;
  final String? contactPhone;
  final String? thumbnailUrl;

  bool get isCompleted => status == 'Completed';
  bool get isActive => const {'Confirmed', 'Paid', 'InProgress'}.contains(status);

  factory BookingSummary.fromJson(Map<String, dynamic> j) => BookingSummary(
    id: (j['id'] as num).toInt(),
    code: (j['bookingCode'] ?? '').toString(),
    name: (j['tourName'] ?? 'Tour chưa có tên').toString(),
    startDate: parseCalendarDate(j['startDate']),
    status: (j['status'] ?? '').toString(),
    guestCount: (j['totalGuests'] as num?)?.toInt() ?? 0,
    customerName: j['customerName']?.toString(),
    contactPhone: j['contactPhone']?.toString(),
    thumbnailUrl: j['thumbnailUrl']?.toString(),
  );
}

class BookingPage {
  const BookingPage({required this.items, required this.total});
  final List<BookingSummary> items;
  final int total;
  factory BookingPage.fromJson(Map<String, dynamic> j) => BookingPage(
    items: (j['items'] as List<dynamic>? ?? [])
        .map((e) => BookingSummary.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList(),
    total: (j['total'] as num?)?.toInt() ?? 0,
  );
}

class Passenger {
  const Passenger({required this.id, required this.name, required this.status, this.phone, this.recordStatus});
  final int id;
  final String name;
  final String status;
  final String? phone;
  final String? recordStatus;

  factory Passenger.fromJson(Map<String, dynamic> j) => Passenger(
    id: (j['id'] as num).toInt(),
    name: (j['fullName'] ?? '').toString(),
    status: (j['attendanceStatus'] ?? 'Pending').toString(),
    phone: j['phoneNumber']?.toString(),
    recordStatus: j['status']?.toString(),
  );
}

class TourStop {
  const TourStop({required this.id, required this.name, required this.status, this.time});
  final int id;
  final String name;
  final String status;
  final DateTime? time;
  factory TourStop.fromJson(Map<String, dynamic> j) => TourStop(
    id: (j['id'] as num).toInt(),
    name: (j['name'] ?? '').toString(),
    status: (j['attendanceStatus'] ?? 'Pending').toString(),
    time: j['time'] is String ? DateTime.tryParse(j['time'] as String) : null,
  );
}

class TourDay {
  const TourDay({required this.dayNumber, required this.title, required this.stops});
  final int dayNumber;
  final String title;
  final List<TourStop> stops;
  factory TourDay.fromJson(Map<String, dynamic> j) => TourDay(
    dayNumber: (j['dayNumber'] as num).toInt(),
    title: (j['title'] ?? '').toString(),
    stops: (j['locations'] as List<dynamic>? ?? [])
        .map((e) => TourStop.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
  );
}

class TourIncident {
  const TourIncident({required this.title, required this.description, required this.status});
  final String title;
  final String description;
  final String status;
  factory TourIncident.fromJson(Map<String, dynamic> j) => TourIncident(
    title: (j['title'] ?? '').toString(),
    description: (j['description'] ?? '').toString(),
    status: (j['status'] ?? '').toString(),
  );
}

class BookingDetail {
  const BookingDetail({
    required this.id, required this.code, required this.name, required this.status,
    required this.startDate, required this.endDate, required this.totalGuests,
    required this.passengers, required this.days, required this.incidents,
    this.customerName, this.contactPhone, this.agencyName,
    this.canRecordAttendance = false,
    this.attendanceDate,
    this.canCheckInLocations = false,
    this.nextLocationCheckInId,
  });
  final int id;
  final String code;
  final String name;
  final String status;
  final DateTime startDate;
  final DateTime endDate;
  final int totalGuests;
  final List<Passenger> passengers;
  final List<TourDay> days;
  final List<TourIncident> incidents;
  final String? customerName;
  final String? contactPhone;
  final String? agencyName;
  /// Backend-enforced departure/stage date in Vietnam.
  final bool canRecordAttendance;
  final DateTime? attendanceDate;
  /// Backend-enforced departure date and itinerary state.
  final bool canCheckInLocations;
  final int? nextLocationCheckInId;

  factory BookingDetail.fromJson(Map<String, dynamic> j) => BookingDetail(
    id: (j['id'] as num).toInt(),
    code: (j['bookingCode'] ?? '').toString(),
    name: (j['tourName'] ?? 'Tour chưa có tên').toString(),
    status: (j['status'] ?? '').toString(),
    startDate: parseCalendarDate(j['startDate']),
    endDate: parseCalendarDate(j['endDate']),
    totalGuests: (j['totalGuests'] as num?)?.toInt() ?? 0,
    customerName: j['customerName']?.toString(),
    contactPhone: j['contactPhone']?.toString(),
    agencyName: j['agencyName']?.toString(),
    canRecordAttendance: j['canRecordAttendance'] == true,
    attendanceDate: j['attendanceDate'] == null ? null : parseCalendarDate(j['attendanceDate']),
    canCheckInLocations: j['canCheckInLocations'] == true,
    nextLocationCheckInId: (j['nextLocationCheckInId'] as num?)?.toInt(),
    passengers: (j['participants'] as List<dynamic>? ?? [])
        .map((e) => Passenger.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
    days: (j['snapshotDays'] as List<dynamic>? ?? [])
        .map((e) => TourDay.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
    incidents: (j['incidents'] as List<dynamic>? ?? [])
        .map((e) => TourIncident.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
  );
}
