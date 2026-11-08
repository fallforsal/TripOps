import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
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
    if (busy != null) return;
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
    final passengers = filterPassengers(current.passengers,
        filter: filter, query: query);
    final checked = all.where((p) => p.status == 'CheckedIn').length;
    return Scaffold(appBar: AppBar(title: const Text('Điểm danh hành khách')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text('$checked / ${all.length} khách đã có mặt',
          style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
        space(),
        LinearProgressIndicator(
          value: all.isEmpty ? 0 : checked / all.length,
          minHeight: 7,
          borderRadius: BorderRadius.circular(10),
        ),
        space(14),
        TextField(
          key: const ValueKey('passenger-search'),
          decoration: const InputDecoration(
            hintText: 'Tìm tên hoặc số điện thoại hành khách',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (value) => setState(() => query = value),
        ),
        space(10),
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
            )).toList()),
        ),
        if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
        if (passengers.isEmpty) const Padding(
          padding: EdgeInsets.symmetric(vertical: 30),
          child: Center(child: Text('Không tìm thấy hành khách phù hợp.')),
        ),
        ...passengers.map((p) => Card(child: Padding(padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            if (p.phone != null) Text(p.phone!, style: const TextStyle(color: muted)),
            space(8),
            if (busy == p.id) const LinearProgressIndicator(),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'Pending', label: Text('Chưa rõ')),
                ButtonSegment(value: 'CheckedIn', label: Text('Có mặt')),
                ButtonSegment(value: 'Absent', label: Text('Vắng')),
              ],
              selected: {p.status},
              onSelectionChanged: busy != null ? null : (v) => update(p, v.first),
            ),
          ]),
        ))),
      ]),
    );
  }
}
