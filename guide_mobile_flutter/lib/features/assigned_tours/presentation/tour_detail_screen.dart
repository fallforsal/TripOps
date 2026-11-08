import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
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
      appBar: AppBar(title: const Text('Chi tiết tour'),
        actions: [IconButton(onPressed: acting ? null : refresh, icon: const Icon(Icons.refresh))]),
      body: loading ? const Center(child: CircularProgressIndicator())
        : error != null ? ErrorState(message: error!, onRetry: refresh)
        : d == null ? const Center(child: Text('Không tìm thấy tour.'))
        : ListView(padding: const EdgeInsets.all(18), children: [
          Text(d.name, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: ink)),
          space(),
          Text('${d.code}  ·  ${d.status}', style: const TextStyle(color: muted)),
          Text('${vnDate(d.startDate)} – ${vnDate(d.endDate)}'),
          Text('${d.totalGuests} hành khách  ·  ${d.agencyName ?? "Agency"}'),
          space(20),
          if (acting) const LinearProgressIndicator(),
          if ((d.status == 'Confirmed' || d.status == 'Paid') &&
              !d.startDate.isAfter(DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day)))
            FilledButton.icon(onPressed: acting ? null : () => mutate(() => widget.guides.start(d.id)),
              icon: const Icon(Icons.play_arrow), label: const Text('Bắt đầu tour')),
          if (d.status == 'InProgress')
            FilledButton.icon(onPressed: acting ? null : () => confirmComplete(d),
              icon: const Icon(Icons.check_circle_outline), label: const Text('Hoàn tất tour')),
          space(8),
          _action(Icons.fact_check_outlined, 'Điểm danh hành khách', '${d.passengers.length} hành khách',
            () => open(AttendanceScreen(detail: d, guides: widget.guides))),
          _action(Icons.location_on_outlined, 'Check-in địa điểm', '${d.days.length} ngày lịch trình',
            () => open(LocationScreen(detail: d, guides: widget.guides))),
          _action(Icons.report_problem_outlined, 'Báo cáo sự cố', '${d.incidents.length} sự cố đã ghi nhận',
            () => open(IncidentScreen(detail: d, guides: widget.guides))),
          space(14),
          const Text('Thông tin đoàn', style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
          Card(child: Column(children: [
            ListTile(title: const Text('Khách hàng'), subtitle: Text(d.customerName ?? 'Không có dữ liệu')),
            ListTile(title: const Text('Liên hệ'), subtitle: Text(d.contactPhone ?? 'Không có dữ liệu')),
            ListTile(title: const Text('Số ngày'), subtitle: Text('${d.days.length} ngày theo lịch trình')),
          ])),
          space(),
          const Text('Lịch trình', style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
          ...d.days.map((day) => Card(child: ListTile(
            title: Text('Ngày ${day.dayNumber} · ${day.title}'),
            subtitle: Text(day.stops.map((s) => s.name).join(' • ')),
          ))),
        ]),
    );
  }

  Widget _action(IconData icon, String title, String subtitle, VoidCallback onTap) =>
    Card(child: ListTile(leading: Icon(icon, color: const Color(0xFF087D82)),
      title: Text(title), subtitle: Text(subtitle), trailing: const Icon(Icons.chevron_right), onTap: onTap));

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
