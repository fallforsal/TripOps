import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
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
        description: description.text.trim());
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
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
        children: [
          GuideHero(
            compact: true,
            label: 'AN TOÀN HÀNH TRÌNH',
            title: 'Báo cáo sự cố',
            subtitle: widget.detail.name,
          ),
          space(15),
          const GuideInfoBanner(
            icon: Icons.shield_outlined,
            message: 'Hãy báo cáo ngay các tình huống ảnh hưởng tới an toàn và lịch trình của đoàn. Nội dung được gửi trực tiếp đến backend.',
          ),
          space(22),
          if (widget.detail.incidents.isNotEmpty) ...[
            GuideSectionTitle(
              'Đã báo cáo (${widget.detail.incidents.length})',
            ),
            space(10),
            ...widget.detail.incidents.map((incident) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 8,
                ),
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF0E4),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: const Icon(Icons.report_problem_outlined,
                    color: alertOrange),
                ),
                title: Text(incident.title, style: const TextStyle(
                  color: ink, fontSize: 13, fontWeight: FontWeight.w800,
                )),
                subtitle: Text(incident.description, maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, color: muted)),
                trailing: GuideStatusPill(incident.status),
              )),
            )),
            space(15),
          ],
          const GuideSectionTitle('Tạo báo cáo mới'),
          space(12),
          const Text('Loại sự cố', style: TextStyle(
            fontWeight: FontWeight.w700, color: ink, fontSize: 12,
          )),
          space(7),
          TextFormField(
            controller: type, maxLength: 100,
            decoration: const InputDecoration(
              hintText: 'Ví dụ: TRANSPORT, HEALTH, OTHER',
              prefixIcon: Icon(Icons.category_outlined),
            ),
            validator: (v) => v == null || v.trim().isEmpty
                ? 'Nhập loại sự cố' : null,
          ),
          space(4),
          const Text('Tiêu đề', style: TextStyle(
            fontWeight: FontWeight.w700, color: ink, fontSize: 12,
          )),
          space(7),
          TextFormField(
            controller: title, maxLength: 255,
            decoration: const InputDecoration(
              hintText: 'Tóm tắt ngắn gọn tình huống',
              prefixIcon: Icon(Icons.title_outlined),
            ),
            validator: (v) => v == null || v.trim().isEmpty
                ? 'Nhập tiêu đề' : null,
          ),
          space(4),
          const Text('Mô tả chi tiết', style: TextStyle(
            fontWeight: FontWeight.w700, color: ink, fontSize: 12,
          )),
          space(7),
          TextFormField(
            controller: description,
            maxLines: 5, maxLength: 2000,
            decoration: const InputDecoration(
              hintText: 'Nêu rõ thời gian, địa điểm, diễn biến và cách xử lý...',
            ),
            validator: (v) => v == null || v.trim().isEmpty
                ? 'Nhập mô tả' : null,
          ),
          if (error != null) ...[
            GuideInfoBanner(
              message: error!, icon: Icons.error_outline, warning: true,
            ),
            space(10),
          ],
          FilledButton.icon(
            onPressed: busy ? null : submit,
            icon: busy ? const SizedBox(
              width: 15, height: 15,
              child: CircularProgressIndicator(strokeWidth: 2,
                color: Colors.white),
            ) : const Icon(Icons.send_rounded, size: 17),
            label: const Text('Gửi báo cáo sự cố'),
          ),
          space(12),
          const Text('Đính kèm ảnh chưa được backend hỗ trợ.',
            textAlign: TextAlign.center,
            style: TextStyle(color: muted, fontSize: 11)),
        ],
      ),
    ),
  );
}
