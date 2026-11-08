import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/src/attendance_filter.dart';
import 'package:tripops_guide/src/models.dart';

void main() {
  final passengers = <Passenger>[
    const Passenger(id: 1, name: 'Nguyễn Văn An', status: 'Pending',
      phone: '0909000001', recordStatus: 'ACTIVE'),
    const Passenger(id: 2, name: 'Trần Thị Bình', status: 'CheckedIn',
      recordStatus: 'ACTIVE'),
    const Passenger(id: 3, name: 'Lê Anh Dũng', status: 'Absent',
      recordStatus: 'ACTIVE'),
    const Passenger(id: 4, name: 'Đã hủy', status: 'Pending',
      recordStatus: 'INACTIVE'),
  ];

  test('inactive passengers are excluded from displayed attendance', () {
    expect(filterPassengers(passengers).map((p) => p.id), [1, 2, 3]);
  });

  test('filter matches attendance statuses', () {
    expect(filterPassengers(passengers, filter: AttendanceFilter.pending)
        .map((p) => p.id), [1]);
    expect(filterPassengers(passengers, filter: AttendanceFilter.checkedIn)
        .map((p) => p.id), [2]);
    expect(filterPassengers(passengers, filter: AttendanceFilter.absent)
        .map((p) => p.id), [3]);
  });

  test('Vietnamese search ignores accent marks', () {
    expect(filterPassengers(passengers, query: 'nguyen van an')
        .map((p) => p.id), [1]);
    expect(filterPassengers(passengers, query: '0909000001')
        .map((p) => p.id), [1]);
  });
}
