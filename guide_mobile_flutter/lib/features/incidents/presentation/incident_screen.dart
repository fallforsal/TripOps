import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../location_checkin/domain/checkin_photo.dart';
import '../domain/incident_categories.dart';

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
  final ImagePicker _picker = ImagePicker();
  final List<CheckinPhoto> _selectedPhotos = [];
  final Map<String, Future<Uint8List>> _photoDownloads = {};
  bool _picking = false;
  String? incidentType;
  String? _photoError;
  bool busy = false;
  String? error;

  @override
  void dispose() {
    title.dispose();
    description.dispose();
    super.dispose();
  }

  Future<void> _pickPhotos(ImageSource source) async {
    if (_picking || busy) return;
    setState(() {
      _picking = true;
      _photoError = null;
    });
    try {
      final picked = source == ImageSource.camera
          ? [await _picker.pickImage(source: ImageSource.camera, imageQuality: 85)]
              .whereType<XFile>()
              .toList()
          : await _picker.pickMultiImage(imageQuality: 85);
      if (!mounted || picked.isEmpty) return;

      final additions = <CheckinPhoto>[];
      for (final file in picked) {
        additions.add(CheckinPhoto(
          path: file.path,
          name: file.name,
          mime: CheckinPhoto.mimeForFileName(file.name) ?? '',
          bytes: await file.length(),
        ));
      }
      if (!mounted) return;

      final validation = CheckinPhoto.validate([..._selectedPhotos, ...additions]);
      setState(() {
        _photoError = validation;
        if (validation == null) _selectedPhotos.addAll(additions);
      });
    } catch (_) {
      if (mounted) {
        setState(() => _photoError = 'Không thể mở camera hoặc thư viện ảnh.');
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  Future<void> submit() async {
    if (busy || _picking || !form.currentState!.validate()) return;
    final validation = _selectedPhotos.isEmpty
        ? null
        : CheckinPhoto.validate(_selectedPhotos);
    if (validation != null) {
      setState(() => _photoError = validation);
      return;
    }
    setState(() { busy = true; error = null; });
    try {
      await widget.guides.incident(
        widget.detail.id,
        type: incidentType!,
        title: title.text.trim(),
        description: description.text.trim(),
        photos: List<CheckinPhoto>.unmodifiable(_selectedPhotos),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã gửi báo cáo sự cố thành công.')));
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
            message: 'Hãy báo cáo ngay các tình huống ảnh hưởng tới an toàn và lịch trình của đoàn. Báo cáo sẽ được gửi đến đơn vị phụ trách.',
          ),
          space(22),
          if (widget.detail.incidents.isNotEmpty) ...[
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: const Text('Lịch sử báo cáo'),
              subtitle: Text('${widget.detail.incidents.length} báo cáo đã gửi'),
              children: [
            GuideSectionTitle(
              'Đã báo cáo (${widget.detail.incidents.length})',
            ),
            space(10),
            ...widget.detail.incidents.map((incident) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 10,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF0E4),
                            borderRadius: BorderRadius.circular(11),
                          ),
                          child: const Icon(Icons.report_problem_outlined,
                            color: alertOrange),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(incident.title, style: const TextStyle(
                                color: ink, fontSize: 13, fontWeight: FontWeight.w800,
                              )),
                              const SizedBox(height: 3),
                              Text(incident.description, maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 14, color: muted)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (incident.evidenceUrls.isNotEmpty) ...[
                      space(10),
                      Wrap(spacing: 7, runSpacing: 7, children: [
                        for (final url in incident.evidenceUrls)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(9),
                            child: FutureBuilder<Uint8List>(
                              future: _photoDownloads.putIfAbsent(
                                url, () => widget.guides.imageBytes(url)),
                              builder: (context, snapshot) => snapshot.hasData
                                  ? Image.memory(
                                      snapshot.data!,
                                      width: 64, height: 64, fit: BoxFit.cover,
                                    )
                                  : Container(
                                      width: 64, height: 64, color: paleTeal,
                                      alignment: Alignment.center,
                                      child: const Icon(
                                        Icons.image_outlined, size: 20, color: teal,
                                      ),
                                    ),
                            ),
                          ),
                      ]),
                    ],
                  ],
                ),
              )),
            )),
            space(15),
              ],
            ),
          ],
          const GuideSectionTitle('Tạo báo cáo mới'),
          space(12),
          const Text('Loại sự cố', style: TextStyle(
            fontWeight: FontWeight.w700, color: ink, fontSize: 12,
          )),
          space(7),
          DropdownButtonFormField<String>(
            key: const ValueKey('incident-type-dropdown'),
            initialValue: incidentType,
            isExpanded: true,
            autovalidateMode: AutovalidateMode.onUserInteraction,
            decoration: const InputDecoration(
              hintText: 'Chọn loại sự cố',
              prefixIcon: Icon(Icons.category_outlined),
            ),
            items: incidentCategories.map((category) =>
              DropdownMenuItem(value: category.code, child: Text(category.label))
            ).toList(),
            onChanged: busy ? null : (value) => setState(() => incidentType = value),
            validator: (value) => value == null || value.isEmpty
                ? 'Vui lòng chọn loại sự cố' : null,
          ),
          space(12),
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
          space(8),
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
          space(10),
          const Text('Ảnh minh chứng (tối đa 5 ảnh, không bắt buộc)',
            style: TextStyle(fontWeight: FontWeight.w700, color: ink, fontSize: 12)),
          space(8),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: busy || _picking
                    ? null
                    : () => _pickPhotos(ImageSource.camera),
                icon: const Icon(Icons.camera_alt_outlined, size: 17),
                label: const Text('Chụp ảnh'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: busy || _picking
                    ? null
                    : () => _pickPhotos(ImageSource.gallery),
                icon: const Icon(Icons.photo_library_outlined, size: 17),
                label: const Text('Chọn từ máy'),
              ),
            ),
          ]),
          if (_photoError != null) ...[
            space(8),
            GuideInfoBanner(
              message: _photoError!, icon: Icons.warning_amber_rounded, warning: true,
            ),
          ],
          if (_selectedPhotos.isNotEmpty) ...[
            space(10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var i = 0; i < _selectedPhotos.length; i++)
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(
                          File(_selectedPhotos[i].path),
                          width: 74,
                          height: 74,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: -6,
                        right: -6,
                        child: InkWell(
                          onTap: busy
                              ? null
                              : () => setState(() {
                                    _selectedPhotos.removeAt(i);
                                    _photoError = null;
                                  }),
                          child: Container(
                            width: 22,
                            height: 22,
                            decoration: const BoxDecoration(
                              color: Colors.black87,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.close,
                              size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ],
          space(16),
          if (error != null) ...[
            GuideInfoBanner(
              message: error!, icon: Icons.error_outline, warning: true,
            ),
            space(10),
          ],
          FilledButton.icon(
            key: const ValueKey('incident-submit'),
            onPressed: busy ? null : submit,
            icon: busy ? const SizedBox(
              width: 15, height: 15,
              child: CircularProgressIndicator(strokeWidth: 2,
                color: Colors.white),
            ) : const Icon(Icons.send_rounded, size: 17),
            label: const Text('Gửi báo cáo sự cố'),
          ),
        ],
      ),
    ),
  );
}
