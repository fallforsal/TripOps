import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../domain/tour_catalog.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../attendance/presentation/attendance_screen.dart';
import '../../incidents/presentation/incident_screen.dart';
import '../../location_checkin/presentation/location_screen.dart';
import '../data/guide_repository.dart';
import '../domain/booking_models.dart';

class TourDetailScreen extends StatefulWidget {
  const TourDetailScreen({super.key, required this.id, required this.guides, required this.onSessionExpired});
  final int id;
  final GuideRepository guides;
  final Future<void> Function() onSessionExpired;
  @override
  State<TourDetailScreen> createState() => _TourDetailScreenState();
}

class _TourDetailScreenState extends State<TourDetailScreen> {
  BookingDetail? detail;
  bool loading = true;
  bool acting = false;
  String? error;

  @override
  void initState() { super.initState(); refresh(); }

  Future<void> refresh() async {
    setState(() { loading = true; error = null; });
    try {
      final value = await widget.guides.detail(widget.id);
      if (mounted) setState(() { detail = value; loading = false; });
    } catch (e) {
      if (!mounted) return;
      if (e is ApiFailure && e.statusCode == 401) {
        await widget.onSessionExpired();
        if (mounted && Navigator.of(context).canPop()) Navigator.of(context).pop();
        return;
      }
      setState(() { error = readableError(e); loading = false; });
    }
  }

  Future<void> mutate(Future<dynamic> Function() action) async {
    if (acting) return;
    setState(() => acting = true);
    try {
      await action();
      if (!mounted) return;
      await refresh(); // backend is the source of truth
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Backend đã xác nhận thành công.')));
    } catch (e) {
      if (!mounted) return;
      if (e is ApiFailure && e.statusCode == 401) {
        await widget.onSessionExpired();
        if (mounted && Navigator.of(context).canPop()) Navigator.of(context).pop();
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(readableError(e))),
      );
    } finally {
      if (mounted) setState(() => acting = false);
    }
  }

  void open(Widget screen) async {
    await Navigator.push(context, MaterialPageRoute<void>(builder: (_) => screen));
    if (mounted) await refresh();
  }

  @override
  Widget build(BuildContext context) {
    final d = detail;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết tour'),
        actions: [
          IconButton(
            tooltip: 'Tải lại dữ liệu từ backend',
            onPressed: acting ? null : refresh,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? ErrorState(message: error!, onRetry: refresh)
              : d == null
                  ? const Center(child: Text('Không tìm thấy tour.'))
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
                      children: [
                        GuideHero(
                          title: d.name,
                          label: bookingStatusLabel(d.status),
                          subtitle: '${d.code}  •  ${vnDate(d.startDate)} – ${vnDate(d.endDate)}',
                        ),
                        space(14),
                        Row(children: [
                          Expanded(child: GuideMetric(
                            icon: Icons.groups_outlined,
                            value: '${d.totalGuests}',
                            label: 'Hành khách',
                          )),
                          const SizedBox(width: 9),
                          Expanded(child: GuideMetric(
                            icon: Icons.route_outlined,
                            value: '${d.days.length}',
                            label: 'Ngày lịch trình',
                            iconColor: const Color(0xFF477DB4),
                            tint: const Color(0xFFEAF3FC),
                          )),
                          const SizedBox(width: 9),
                          Expanded(child: GuideMetric(
                            icon: Icons.report_problem_outlined,
                            value: '${d.incidents.length}',
                            label: 'Sự cố đã báo',
                            iconColor: alertOrange,
                            tint: const Color(0xFFFFF0E3),
                          )),
                        ]),
                        space(19),
                        if (acting) ...[
                          const LinearProgressIndicator(),
                          space(10),
                        ],
                        if ((d.status == 'Confirmed' || d.status == 'Paid') &&
                            !d.startDate.isAfter(DateTime(
                              DateTime.now().year, DateTime.now().month, DateTime.now().day)))
                          FilledButton.icon(
                            onPressed: acting ? null :
                                () => mutate(() => widget.guides.start(d.id)),
                            icon: const Icon(Icons.play_arrow_rounded),
                            label: const Text('Bắt đầu tour'),
                          ),
                        if (d.status == 'InProgress')
                          FilledButton.icon(
                            onPressed: acting ? null : () => confirmComplete(d),
                            icon: const Icon(Icons.check_circle_outline_rounded),
                            label: const Text('Hoàn tất tour'),
                          ),
                        space(20),
                        const GuideSectionTitle('Thao tác nhanh'),
                        space(10),
                        Row(children: [
                          Expanded(child: GuideActionTile(
                            icon: Icons.fact_check_outlined,
                            title: 'Điểm danh',
                            subtitle: 'Danh sách khách',
                            onTap: () => open(AttendanceScreen(
                              detail: d, guides: widget.guides,
                            )),
                          )),
                          const SizedBox(width: 9),
                          Expanded(child: GuideActionTile(
                            icon: Icons.location_on_outlined,
                            title: 'Check-in',
                            subtitle: 'Các điểm dừng',
                            onTap: () => open(LocationScreen(
                              detail: d, guides: widget.guides,
                            )),
                          )),
                          const SizedBox(width: 9),
                          Expanded(child: GuideActionTile(
                            icon: Icons.warning_amber_outlined,
                            title: 'Sự cố',
                            subtitle: 'Gửi báo cáo',
                            onTap: () => open(IncidentScreen(
                              detail: d, guides: widget.guides,
                            )),
                          )),
                        ]),
                        space(22),
                        const GuideSectionTitle('Thông tin đoàn'),
                        space(10),
                        Card(child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 5,
                          ),
                          child: Column(children: [
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.person_outline, color: teal),
                              title: const Text('Khách hàng',
                                style: TextStyle(color: muted, fontSize: 11)),
                              subtitle: Text(d.customerName ?? 'Không có dữ liệu',
                                style: const TextStyle(color: ink,
                                  fontWeight: FontWeight.w700)),
                            ),
                            const Divider(height: 1),
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.phone_outlined, color: teal),
                              title: const Text('Liên hệ',
                                style: TextStyle(color: muted, fontSize: 11)),
                              subtitle: Text(d.contactPhone ?? 'Không có dữ liệu',
                                style: const TextStyle(color: ink,
                                  fontWeight: FontWeight.w700)),
                            ),
                            const Divider(height: 1),
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.business_outlined, color: teal),
                              title: const Text('Đơn vị phụ trách',
                                style: TextStyle(color: muted, fontSize: 11)),
                              subtitle: Text(d.agencyName ?? 'Chưa cập nhật',
                                style: const TextStyle(color: ink,
                                  fontWeight: FontWeight.w700)),
                            ),
                          ]),
                        )),
                        space(21),
                        GuideSectionTitle('Lịch trình (${d.days.length} ngày)'),
                        space(10),
                        if (d.days.isEmpty)
                          const GuideEmptyState(
                            title: 'Chưa có lịch trình',
                            message: 'Lịch trình sẽ xuất hiện khi backend cung cấp dữ liệu.',
                            icon: Icons.event_note_outlined,
                          ),
                        ...d.days.map((day) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Card(child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 43, height: 43,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: paleTeal,
                                    borderRadius: BorderRadius.circular(11),
                                  ),
                                  child: Text('${day.dayNumber}',
                                    style: const TextStyle(
                                      fontSize: 19, fontWeight: FontWeight.w900,
                                      color: deepTeal)),
                                ),
                                const SizedBox(width: 12),
                                Expanded(child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(day.title, style: const TextStyle(
                                      color: ink, fontWeight: FontWeight.w800,
                                      fontSize: 14)),
                                    const SizedBox(height: 5),
                                    Text(day.stops.isEmpty
                                        ? 'Chưa có điểm tham quan'
                                        : day.stops.map((s) => s.name).join(' • '),
                                      style: const TextStyle(
                                        fontSize: 11, color: muted, height: 1.5)),
                                  ],
                                )),
                              ],
                            ),
                          )),
                        )),
                      ],
                    ),
    );
  }

  Future<void> confirmComplete(BookingDetail d) async {
    final approved = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Hoàn tất tour?'),
      content: const Text('Tour sẽ được chuyển sang trạng thái Completed trên server.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Xác nhận')),
      ],
    ));
    if (approved == true) await mutate(() => widget.guides.complete(d.id));
  }
}
