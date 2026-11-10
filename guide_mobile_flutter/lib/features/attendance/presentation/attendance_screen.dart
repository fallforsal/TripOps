import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../domain/attendance_filter.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key, required this.detail, required this.guides});
  final BookingDetail detail;
  final GuideRepository guides;
  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  late BookingDetail current = widget.detail;
  int? busy;
  String? error;
  String query = '';
  AttendanceFilter filter = AttendanceFilter.all;

  Future<void> update(Passenger passenger, String status) async {
    if (busy != null || !current.canRecordAttendance) return;
    setState(() { busy = passenger.id; error = null; });
    try {
      await widget.guides.attendance(current.id, passenger.id, status);
      final updated = await widget.guides.detail(current.id);
      if (mounted) setState(() => current = updated);
    } catch (e) {
      if (mounted) setState(() => error = readableError(e));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final all = filterPassengers(current.passengers);
    final passengers = filterPassengers(
      current.passengers, filter: filter, query: query,
    );
    final checked = all.where((p) => p.status == 'CheckedIn').length;
    final absent = all.where((p) => p.status == 'Absent').length;
    final pending = all.where((p) => p.status == 'Pending').length;
    final canRecord = current.canRecordAttendance;

    return Scaffold(
      appBar: AppBar(title: const Text('Điểm danh hành khách')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 26),
        children: [
          Text(current.name, style: const TextStyle(
            color: muted, fontSize: 12, fontWeight: FontWeight.w600,
          )),
          space(14),
          Row(children: [
            Expanded(child: GuideMetric(icon: Icons.groups_outlined,
              value: '${all.length}', label: 'Tổng hành khách')),
            const SizedBox(width: 9),
            Expanded(child: GuideMetric(icon: Icons.check_circle_outline,
              value: '$checked', label: 'Đã có mặt')),
            const SizedBox(width: 9),
            Expanded(child: GuideMetric(
              icon: Icons.hourglass_empty_rounded,
              value: '$pending', label: 'Chưa điểm danh',
              iconColor: const Color(0xFFB78330),
              tint: const Color(0xFFFFF3DF),
            )),
          ]),
          space(16),
          Card(child: Padding(
            padding: const EdgeInsets.all(15),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Expanded(child: Text('Tiến độ điểm danh',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800,
                    color: ink))),
                Text('$checked / ${all.length}', style: const TextStyle(
                  fontSize: 13, color: teal, fontWeight: FontWeight.w900,
                )),
              ]),
              space(12),
              LinearProgressIndicator(
                value: all.isEmpty ? 0 : checked / all.length,
                minHeight: 8,
                borderRadius: BorderRadius.circular(8),
                backgroundColor: paleTeal,
              ),
              space(9),
              Text('$absent khách vắng mặt', style: const TextStyle(
                fontSize: 11, color: muted,
              )),
            ]),
          )),
          space(14),
          if (!canRecord) ...[
            GuideInfoBanner(
              icon: Icons.lock_clock_outlined,
              warning: true,
              message: 'Chỉ được điểm danh vào ngày khởi hành '
                  '${vnDate(current.startDate)}. '
                  'Bạn vẫn có thể xem danh sách và trạng thái đã ghi nhận.',
            ),
            space(10),
          ],
          space(20),
          const GuideSectionTitle('Danh sách hành khách'),
          space(11),
          TextField(
            key: const ValueKey('passenger-search'),
            decoration: const InputDecoration(
              hintText: 'Tìm theo tên hoặc số điện thoại...',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (value) => setState(() => query = value),
          ),
          space(11),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: AttendanceFilter.values.map((option) =>
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(attendanceFilterLabel(option)),
                  selected: filter == option,
                  onSelected: (_) => setState(() => filter = option),
                ),
              ),
            ).toList()),
          ),
          space(13),
          if (error != null) ...[
            GuideInfoBanner(message: error!,
              icon: Icons.error_outline, warning: true),
            space(10),
          ],
          if (passengers.isEmpty)
            const GuideEmptyState(
              title: 'Không tìm thấy hành khách',
              message: 'Thử tìm kiếm hoặc chọn lại bộ lọc điểm danh.',
              icon: Icons.person_search_outlined,
            ),
          ...passengers.map((p) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Container(
                      height: 39, width: 39,
                      decoration: BoxDecoration(
                        color: paleTeal,
                        borderRadius: BorderRadius.circular(11),
                      ),
                      child: const Icon(Icons.person_outline, color: deepTeal),
                    ),
                    const SizedBox(width: 11),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(p.name, style: const TextStyle(
                          fontSize: 13, color: ink, fontWeight: FontWeight.w800,
                        )),
                        if (p.phone != null)
                          Text(p.phone!, style: const TextStyle(
                            fontSize: 11, color: muted,
                          )),
                      ],
                    )),
                    GuideStatusPill(
                      p.status == 'CheckedIn' ? 'Có mặt'
                        : p.status == 'Absent' ? 'Vắng' : 'Chưa rõ',
                      background: p.status == 'CheckedIn'
                        ? paleTeal : p.status == 'Absent'
                          ? const Color(0xFFFFE8E8)
                          : const Color(0xFFFFF3DF),
                      foreground: p.status == 'CheckedIn'
                        ? deepTeal : p.status == 'Absent'
                          ? const Color(0xFFC05F5F)
                          : const Color(0xFFB78330),
                    ),
                  ]),
                  space(12),
                  if (busy == p.id) ...[
                    const LinearProgressIndicator(),
                    space(9),
                  ],
                  Row(children: [
                    Expanded(child: OutlinedButton.icon(
                      onPressed: busy != null || !canRecord ? null :
                          () => update(p, 'CheckedIn'),
                      style: p.status == 'CheckedIn'
                          ? OutlinedButton.styleFrom(
                              backgroundColor: paleTeal,
                              foregroundColor: deepTeal,
                              side: const BorderSide(color: teal),
                            ) : null,
                      icon: const Icon(Icons.check_circle_outline, size: 16),
                      label: const Text('Có mặt'),
                    )),
                    const SizedBox(width: 9),
                    Expanded(child: OutlinedButton.icon(
                      onPressed: busy != null || !canRecord ? null :
                          () => update(p, 'Absent'),
                      style: p.status == 'Absent'
                          ? OutlinedButton.styleFrom(
                              backgroundColor: const Color(0xFFFFECEC),
                              foregroundColor: const Color(0xFFAE5151),
                            ) : null,
                      icon: const Icon(Icons.close_rounded, size: 16),
                      label: const Text('Vắng mặt'),
                    )),
                  ]),
                  if (p.status != 'Pending')
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: busy != null || !canRecord ? null :
                            () => update(p, 'Pending'),
                        child: const Text('Đặt lại: Chưa rõ'),
                      ),
                    ),
                ],
              ),
            )),
          )),
        ],
      ),
    );
  }
}
