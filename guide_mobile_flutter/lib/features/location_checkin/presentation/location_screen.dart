import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
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
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Check-in địa điểm')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      const Text('Check-in ghi nhận trạng thái trên backend; API hiện không xác thực GPS.',
        style: TextStyle(color: muted)),
      if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
      ...current.days.map((day) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        space(18),
        Text('Ngày ${day.dayNumber} · ${day.title}',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        ...day.stops.map((stop) => Card(child: Padding(padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ListTile(contentPadding: EdgeInsets.zero, leading: const Icon(Icons.place_outlined),
              title: Text(stop.name), subtitle: Text('Trạng thái: ${stop.status}')),
            if (busy == stop.id) const LinearProgressIndicator(),
            Wrap(spacing: 8, children: [
              OutlinedButton(onPressed: busy != null ? null : () => check(stop, 'CheckedIn'),
                child: const Text('Đã đến')),
              OutlinedButton(onPressed: busy != null ? null : () => check(stop, 'Skipped'),
                child: const Text('Bỏ qua')),
            ]),
          ]),
        ))),
      ])),
    ]),
  );
}
