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
  String? selectedIncidentType;
  final picker = ImagePicker();
  final List<CheckinPhoto> photos = [];
  final Map<String, Future<Uint8List>> downloads = {};
  bool busy = false;
  bool picking = false;
  String? error;

  @override
  void dispose() {
    title.dispose();
    description.dispose();
    super.dispose();
  }

  Future<void> pickPhotos(ImageSource source) async {
    if (busy || picking || photos.length >= CheckinPhotoLimits.maxFiles) return;
    setState(() { picking = true; error = null; });
    try {
      final List<XFile> files;
      if (source == ImageSource.camera) {
        final photo = await picker.pickImage(
          source: ImageSource.camera,
          maxWidth: 1800, maxHeight: 1800,
          imageQuality: 78, requestFullMetadata: false,
        );
        files = photo == null ? [] : [photo];
      } else {
        files = await picker.pickMultiImage(
          limit: CheckinPhotoLimits.maxFiles - photos.length,
          maxWidth: 1800, maxHeight: 1800,
          imageQuality: 78, requestFullMetadata: false,
        );
      }
      final additions = <CheckinPhoto>[];
      for (final file in files) {
        additions.add(CheckinPhoto(
          path: file.path, name: file.name,
          mime: CheckinPhoto.mimeForFileName(file.name) ?? '',
          bytes: await file.length(),
        ));
      }
      if (!mounted) return;
      final failure = CheckinPhoto.validate([...photos, ...additions]);
      setState(() {
        error = failure;
        if (failure == null) photos.addAll(additions);
      });
    } catch (_) {
      if (mounted) setState(() => error = 'Không thể mở camera hoặc thư viện ảnh.');
    } finally {
      if (mounted) setState(() => picking = false);
    }
  }

  Future<void> submit() async {
    if (busy || picking) return;
    // ListView can dispose form fields outside the viewport; validate the
    // backing state too, so an unselected dropdown never reaches the API.
    if (selectedIncidentType == null) {
      setState(() => error = 'Vui lòng chọn loại sự cố');
      return;
    }
    if (title.text.trim().isEmpty || description.text.trim().isEmpty) {
      setState(() => error = 'Vui lòng nhập tiêu đề và mô tả sự cố');
      return;
    }
    if (!(form.currentState?.validate() ?? false)) return;
    final failure = CheckinPhoto.validate(photos);
    if (failure != null) {
      setState(() => error = failure);
      return;
    }
    setState(() { busy = true; error = null; });
    try {
      await widget.guides.incident(widget.detail.id,
        type: selectedIncidentType!,
        title: title.text.trim(),
        description: description.text.trim(),
        images: List.of(photos),
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

  Widget historyPhoto(String url) => ClipRRect(
    borderRadius: BorderRadius.circular(8),
    child: FutureBuilder<Uint8List>(
      future: downloads.putIfAbsent(url, () => widget.guides.imageBytes(url)),
      builder: (context, snapshot) => snapshot.hasData
          ? Image.memory(snapshot.data!, width: 76, height: 76, fit: BoxFit.cover)
          : Container(
              width: 76, height: 76,
              color: paleTeal,
              child: Icon(snapshot.hasError
                  ? Icons.broken_image_outlined
                  : Icons.image_outlined, color: muted),
            ),
    ),
  );

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
            message: 'Hãy báo cáo các tình huống ảnh hưởng tới an toàn hoặc lịch trình. Agency sẽ thấy báo cáo trong chi tiết booking.',
          ),
          space(22),
          if (widget.detail.incidents.isNotEmpty) ...[
            GuideSectionTitle('Đã báo cáo (${widget.detail.incidents.length})'),
            space(10),
            ...widget.detail.incidents.map((incident) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        const Icon(Icons.report_problem_outlined, color: alertOrange),
                        const SizedBox(width: 9),
                        Expanded(child: Text(incident.title,
                          style: const TextStyle(fontWeight: FontWeight.w800, color: ink))),
                        GuideStatusPill(incident.status),
                      ]),
                      space(6),
                      Text(incident.description,
                        style: const TextStyle(fontSize: 12, color: muted)),
                      if (incident.photoUrls.isNotEmpty) ...[
                        space(10),
                        const Text('Ảnh minh chứng',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                        space(6),
                        Wrap(spacing: 8, runSpacing: 8,
                          children: incident.photoUrls.map(historyPhoto).toList()),
                      ],
                    ],
                  ),
                ),
              ),
            )),
            space(15),
          ],
          const GuideSectionTitle('Tạo báo cáo mới'),
          space(12),
          const Text('Loại sự cố', style: TextStyle(
            fontWeight: FontWeight.w700, color: ink, fontSize: 12)),
          space(7),
          DropdownButtonFormField<String>(
            key: const ValueKey('incident-type-dropdown'),
            initialValue: selectedIncidentType,
            isExpanded: true,
            decoration: const InputDecoration(
              hintText: 'Chọn loại sự cố',
              prefixIcon: Icon(Icons.category_outlined)),
            items: incidentCategories.map((category) =>
              DropdownMenuItem<String>(
                value: category.code,
                child: Text(category.label, overflow: TextOverflow.ellipsis),
              ),
            ).toList(),
            onChanged: busy || picking
                ? null
                : (value) => setState(() {
                    selectedIncidentType = value;
                    error = null;
                  }),
            validator: (value) => value == null
                ? 'Vui lòng chọn loại sự cố' : null,
          ),
          space(4),
          const Text('Tiêu đề', style: TextStyle(
            fontWeight: FontWeight.w700, color: ink, fontSize: 12)),
          space(7),
          TextFormField(
            controller: title, maxLength: 255,
            decoration: const InputDecoration(
              hintText: 'Tóm tắt ngắn gọn tình huống',
              prefixIcon: Icon(Icons.title_outlined)),
            validator: (value) => value == null || value.trim().isEmpty
                ? 'Nhập tiêu đề' : null,
          ),
          space(4),
          const Text('Mô tả chi tiết', style: TextStyle(
            fontWeight: FontWeight.w700, color: ink, fontSize: 12)),
          space(7),
          TextFormField(
            controller: description, maxLines: 5, maxLength: 2000,
            decoration: const InputDecoration(
              hintText: 'Nêu rõ thời gian, địa điểm, diễn biến và cách xử lý...'),
            validator: (value) => value == null || value.trim().isEmpty
                ? 'Nhập mô tả' : null,
          ),
          space(12),
          const Text('Ảnh minh chứng (không bắt buộc)', style: TextStyle(
            fontWeight: FontWeight.w700, color: ink, fontSize: 12)),
          space(4),
          const Text('1–5 ảnh JPG, PNG, WebP · 5 MB/ảnh · 20 MB tổng',
            style: TextStyle(color: muted, fontSize: 11)),
          space(8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (photos.length < CheckinPhotoLimits.maxFiles) ...[
              OutlinedButton.icon(
                key: const ValueKey('incident-gallery'),
                onPressed: busy || picking ? null : () => pickPhotos(ImageSource.gallery),
                icon: const Icon(Icons.photo_library_outlined),
                label: const Text('Thư viện'),
              ),
              OutlinedButton.icon(
                key: const ValueKey('incident-camera'),
                onPressed: busy || picking ? null : () => pickPhotos(ImageSource.camera),
                icon: const Icon(Icons.camera_alt_outlined),
                label: const Text('Chụp ảnh'),
              ),
            ],
          ]),
          if (photos.isNotEmpty) ...[
            space(10),
            Wrap(spacing: 9, runSpacing: 9, children: [
              for (var index = 0; index < photos.length; index++)
                Stack(clipBehavior: Clip.none, children: [
                  ClipRRect(borderRadius: BorderRadius.circular(8),
                    child: Image.file(File(photos[index].path),
                      width: 76, height: 76, fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          const Icon(Icons.broken_image_outlined, size: 60))),
                  Positioned(top: -9, right: -9, child: IconButton.filledTonal(
                    tooltip: 'Bỏ ảnh', icon: const Icon(Icons.close, size: 16),
                    visualDensity: VisualDensity.compact,
                    onPressed: busy || picking ? null : () => setState(() => photos.removeAt(index)),
                  )),
                ]),
            ]),
            space(8),
            Text('${photos.length}/5 ảnh · ${(photos.fold<int>(0, (n, p) => n + p.bytes) / (1024 * 1024)).toStringAsFixed(1)} MB',
              style: const TextStyle(color: muted, fontSize: 11)),
          ],
          if (error != null) ...[
            space(12),
            GuideInfoBanner(message: error!, icon: Icons.error_outline, warning: true),
          ],
          space(18),
          FilledButton.icon(
            key: const ValueKey('incident-submit'),
            onPressed: busy || picking ? null : submit,
            icon: busy
                ? const SizedBox(width: 15, height: 15,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send_rounded, size: 17),
            label: Text(busy ? 'Đang gửi báo cáo…' : 'Gửi báo cáo sự cố'),
          ),
        ],
      ),
    ),
  );
}
