import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';

class LocationScreen extends StatefulWidget {
  const LocationScreen({super.key, required this.detail, required this.guides});
  final BookingDetail detail;
  final GuideRepository guides;
  @override
  State<LocationScreen> createState() => _LocationScreenState();
}

class _LocationScreenState extends State<LocationScreen> {
  late BookingDetail current = widget.detail;
  int? busy;
  String? error;

  Future<void> check(TourStop stop, String status) async {
    if (busy != null) return;
    final noteController = TextEditingController();
    final note = await showDialog<String>(context: context, builder: (context) => AlertDialog(
      title: Text(status == 'CheckedIn' ? 'Check-in ${stop.name}' : 'Bỏ qua ${stop.name}'),
      content: TextField(controller: noteController, maxLines: 2,
        decoration: const InputDecoration(labelText: 'Ghi chú (không bắt buộc)')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
        FilledButton(onPressed: () => Navigator.pop(context, noteController.text.trim()),
          child: const Text('Gửi backend')),
      ],
    ));
    noteController.dispose();
    if (note == null || !mounted) return;
    setState(() { busy = stop.id; error = null; });
    try {
      final updated = await widget.guides.checkIn(current.id, stop.id, status, note.isEmpty ? null : note);
      if (mounted) setState(() => current = updated);
    } catch (e) {
      if (mounted) setState(() => error = readableError(e));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final allStops = current.days.expand((d) => d.stops).toList();
    final visited = allStops.where((s) => s.status == 'CheckedIn').length;
    return Scaffold(
      appBar: AppBar(title: const Text('Check-in địa điểm')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
        children: [
          Text(current.name, style: const TextStyle(
            color: muted, fontSize: 12, fontWeight: FontWeight.w600,
          )),
          space(15),
          Row(children: [
            Expanded(child: GuideMetric(
              icon: Icons.place_outlined,
              value: '${allStops.length}', label: 'Tổng điểm dừng',
            )),
            const SizedBox(width: 9),
            Expanded(child: GuideMetric(
              icon: Icons.check_circle_outline,
              value: '$visited', label: 'Đã check-in',
            )),
            const SizedBox(width: 9),
            Expanded(child: GuideMetric(
              icon: Icons.schedule_outlined,
              value: '${allStops.length - visited}',
              label: 'Chưa check-in',
              iconColor: const Color(0xFFB78330),
              tint: const Color(0xFFFFF3DF),
            )),
          ]),
          space(15),
          const GuideInfoBanner(
            icon: Icons.info_outline,
            message: 'Check-in ghi nhận trạng thái và ghi chú trên hệ thống. API hiện chưa xác minh vị trí GPS.',
          ),
          if (error != null) ...[
            space(10),
            GuideInfoBanner(
              message: error!, icon: Icons.error_outline, warning: true,
            ),
          ],
          space(22),
          GuideSectionTitle('Lịch trình (${current.days.length} ngày)'),
          space(10),
          if (current.days.isEmpty)
            const GuideEmptyState(
              title: 'Chưa có điểm dừng',
              message: 'Backend chưa trả về lịch trình check-in.',
            ),
          ...current.days.map((day) => Padding(
            padding: const EdgeInsets.only(bottom: 17),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Container(
                    alignment: Alignment.center,
                    height: 32, width: 32,
                    decoration: BoxDecoration(
                      color: paleTeal,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text('${day.dayNumber}', style: const TextStyle(
                      color: deepTeal, fontWeight: FontWeight.w900,
                    )),
                  ),
                  const SizedBox(width: 9),
                  Expanded(child: Text(day.title, style: const TextStyle(
                    fontSize: 14, color: ink, fontWeight: FontWeight.w800,
                  ))),
                ]),
                space(12),
                ...day.stops.map((stop) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Card(child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Container(
                            height: 39, width: 39,
                            decoration: BoxDecoration(
                              color: stop.status == 'CheckedIn'
                                ? paleTeal : const Color(0xFFEEF2F8),
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: Icon(Icons.location_on_outlined,
                              size: 21, color: stop.status == 'CheckedIn'
                                ? teal : muted),
                          ),
                          const SizedBox(width: 11),
                          Expanded(child: Text(stop.name,
                            style: const TextStyle(
                              fontSize: 13, color: ink,
                              fontWeight: FontWeight.w800,
                            ))),
                          GuideStatusPill(
                            stop.status == 'CheckedIn' ? 'Đã check-in'
                              : stop.status == 'Skipped' ? 'Bỏ qua' : 'Chưa đến',
                            background: stop.status == 'CheckedIn'
                              ? paleTeal : const Color(0xFFEEF2F8),
                            foreground: stop.status == 'CheckedIn'
                              ? deepTeal : muted,
                          ),
                        ]),
                        if (busy == stop.id) ...[
                          space(9),
                          const LinearProgressIndicator(),
                        ],
                        space(11),
                        Row(children: [
                          Expanded(child: FilledButton.icon(
                            onPressed: busy != null ? null :
                              () => check(stop, 'CheckedIn'),
                            icon: const Icon(Icons.check, size: 17),
                            label: const Text('Đã đến nơi'),
                          )),
                          const SizedBox(width: 9),
                          OutlinedButton(
                            onPressed: busy != null ? null :
                              () => check(stop, 'Skipped'),
                            child: const Text('Bỏ qua'),
                          ),
                        ]),
                      ],
                    ),
                  )),
                )),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
