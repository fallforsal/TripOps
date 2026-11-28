import 'package:flutter/material.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/guide_glass_metric.dart';
import '../domain/tour_catalog.dart';
import 'tour_status_pill.dart';
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
        backgroundColor: Colors.transparent,
        flexibleSpace: const GuideGlass(radius: 0, shadow: false, blurSigma: 12, child: SizedBox.expand()),
        leading: Navigator.canPop(context) ? IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () => Navigator.maybePop(context),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        ) : null,
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
                          labelWidget: TourStatusPill(status: d.status),
                          subtitle: vnDate(d.startDate) == vnDate(d.endDate)
                              ? '${d.code}  •  ${vnDate(d.startDate)}'
                              : '${d.code}  •  ${vnDate(d.startDate)} – ${vnDate(d.endDate)}',
                        ),
                        space(14),
                        IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Expanded(child: GuideGlassMetric(
                                icon: Icons.groups_outlined,
                                value: d.totalGuests,
                                label: 'Hành khách',
                                color: deepTeal,
                                tint: const Color(0xFFB9E1DE),
                              )),
                              const SizedBox(width: 9),
                              Expanded(child: GuideGlassMetric(
                                icon: Icons.route_outlined,
                                value: d.days.length,
                                label: 'Ngày lịch trình',
                                color: const Color(0xFF315F91),
                                tint: const Color(0xFFCFE0F7),
                              )),
                              const SizedBox(width: 9),
                              Expanded(child: GuideGlassMetric(
                                icon: Icons.report_problem_outlined,
                                value: d.incidents.length,
                                label: 'Sự cố đã báo',
                                color: const Color(0xFF87601C),
                                tint: const Color(0xFFF2E1BE),
                              )),
                            ],
                          ),
                        ),
                        space(22),
                        if (acting) ...[
                          const LinearProgressIndicator(),
                          space(10),
                        ],
                        if (d.canStartTour)
                          FilledButton.icon(
                            onPressed: acting ? null :
                                () => mutate(() => widget.guides.start(d.id)),
                            icon: const Icon(Icons.play_arrow_rounded),
                            label: const Text('Bắt đầu tour'),
                          ),
                        space(20),
                        const GuideSectionTitle('Thao tác nhanh'),
                        space(10),
                        IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
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
                                accent: const Color(0xFF315F91),
                                tint: const Color(0xFFCFE0F7),
                                onTap: () => open(LocationScreen(
                                  detail: d, guides: widget.guides,
                                )),
                              )),
                              const SizedBox(width: 9),
                              Expanded(child: GuideActionTile(
                                icon: Icons.warning_amber_outlined,
                                title: 'Sự cố',
                                subtitle: 'Gửi báo cáo',
                                accent: const Color(0xFF87601C),
                                tint: const Color(0xFFF2E1BE),
                                onTap: () => open(IncidentScreen(
                                  detail: d, guides: widget.guides,
                                )),
                              )),
                            ],
                          ),
                        ),
                        space(26),
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
                                style: TextStyle(color: muted, fontSize: 12)),
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
                      ],
                    ),
    );
  }

}
