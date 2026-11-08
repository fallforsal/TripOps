import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';

class IncidentScreen extends StatefulWidget {
  const IncidentScreen({super.key, required this.detail, required this.guides});
  final BookingDetail detail;
  final GuideRepository guides;
  @override
  State<IncidentScreen> createState() => _IncidentScreenState();
}

class _IncidentScreenState extends State<IncidentScreen> {
  final form = GlobalKey<FormState>();
  final title = TextEditingController();
  final description = TextEditingController();
  final type = TextEditingController(text: 'OTHER');
  String severity = 'Medium';
  bool busy = false;
  String? error;

  @override
  void dispose() {
    title.dispose(); description.dispose(); type.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() { busy = true; error = null; });
    try {
      await widget.guides.incident(widget.detail.id,
        type: type.text.trim(), title: title.text.trim(),
        description: description.text.trim(), severity: severity);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Backend đã tiếp nhận báo cáo sự cố.')));
      Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => error = readableError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Báo cáo sự cố')),
    body: Form(key: form, child: ListView(padding: const EdgeInsets.all(18), children: [
      if (widget.detail.incidents.isNotEmpty) ...[
        const Text('Sự cố đã báo cáo',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
        space(8),
        ...widget.detail.incidents.map((incident) => Card(
          child: ListTile(
            leading: const Icon(Icons.report_problem_outlined),
            title: Text(incident.title),
            subtitle: Text(incident.description, maxLines: 2,
              overflow: TextOverflow.ellipsis),
            trailing: Text(incident.status),
          ),
        )),
        space(16),
      ],
      const Text('Tạo báo cáo mới',
          style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
      space(8),
      Text(widget.detail.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
      space(16),
      TextFormField(controller: type, maxLength: 100,
        decoration: const InputDecoration(labelText: 'Loại sự cố'),
        validator: (v) => v == null || v.trim().isEmpty ? 'Nhập loại sự cố' : null),
      space(),
      TextFormField(controller: title, maxLength: 255,
        decoration: const InputDecoration(labelText: 'Tiêu đề'),
        validator: (v) => v == null || v.trim().isEmpty ? 'Nhập tiêu đề' : null),
      space(),
      TextFormField(controller: description, maxLines: 5, maxLength: 2000,
        decoration: const InputDecoration(labelText: 'Mô tả chi tiết'),
        validator: (v) => v == null || v.trim().isEmpty ? 'Nhập mô tả' : null),
      space(),
      DropdownButtonFormField<String>(
        initialValue: severity,
        decoration: const InputDecoration(labelText: 'Mức độ'),
        items: const [
          DropdownMenuItem(value: 'Low', child: Text('Thấp')),
          DropdownMenuItem(value: 'Medium', child: Text('Trung bình')),
          DropdownMenuItem(value: 'High', child: Text('Cao')),
          DropdownMenuItem(value: 'Critical', child: Text('Khẩn cấp')),
        ],
        onChanged: (v) { if (v != null) setState(() => severity = v); },
      ),
      space(20),
      if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
      FilledButton(onPressed: busy ? null : submit,
        child: busy ? const CircularProgressIndicator() : const Text('Gửi báo cáo')),
      space(),
      const Text('Backend hiện chưa hỗ trợ đính kèm ảnh qua API này.',
        style: TextStyle(color: muted)),
    ])),
  );
}
