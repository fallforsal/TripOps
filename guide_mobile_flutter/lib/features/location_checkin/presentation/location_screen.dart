import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../domain/checkin_photo.dart';

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
  final picker = ImagePicker();
  final Map<String, Future<Uint8List>> photoDownloads = {};

  Future<void> refresh() async {
    if (busy != null) return;
    try {
      final updated = await widget.guides.detail(current.id);
      if (mounted) {
        setState(() {
          current = updated;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = readableError(e));
    }
  }

  Future<void> check(TourStop stop) async {
    if (busy != null ||
        !current.canCheckInLocations ||
        current.nextLocationCheckInId != stop.id ||
        stop.status == 'CheckedIn') {
      return;
    }

    final noteController = TextEditingController();
    final selected = <CheckinPhoto>[];
    String? photoError;
    var dialogOpen = true;

    Future<void> choosePhotos(ImageSource source, StateSetter redraw) async {
      try {
        final files = source == ImageSource.camera
            ? [
                if (await picker.pickImage(
                  source: ImageSource.camera,
                  maxWidth: 1800, maxHeight: 1800,
                  imageQuality: 78, requestFullMetadata: false,
                ) case final XFile image) image,
              ]
            : await picker.pickMultiImage(
                maxWidth: 1800, maxHeight: 1800,
                imageQuality: 78, requestFullMetadata: false,
                limit: CheckinPhotoLimits.maxFiles - selected.length,
              );
        if (!dialogOpen || !mounted) return;
        final additions = <CheckinPhoto>[];
        for (final image in files) {
          additions.add(CheckinPhoto(
            path: image.path, name: image.name,
            mime: CheckinPhoto.mimeForFileName(image.name) ?? '',
            bytes: await image.length(),
          ));
        }
        final validation = CheckinPhoto.validate([...selected, ...additions]);
        redraw(() {
          photoError = validation;
          if (validation == null) selected.addAll(additions);
        });
      } catch (_) {
        if (dialogOpen && mounted) {
          redraw(() => photoError = 'Không thể mở camera hoặc thư viện ảnh.');
        }
      }
    }

    final submission = await showDialog<({String note, List<CheckinPhoto> images})>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, redraw) => AlertDialog(
          title: Text('Check-in ${stop.name}'),
          content: SizedBox(
            width: 360,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Xác nhận đã đến địa điểm này. '
                      'Ảnh đính kèm không bắt buộc; chỉ được check-in '
                      'điểm kế tiếp trong lịch trình.'),
                  const SizedBox(height: 12),
                  TextField(
                    controller: noteController,
                    maxLines: 2, maxLength: 500,
                    decoration: const InputDecoration(
                      labelText: 'Ghi chú (không bắt buộc)',
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text('Ảnh minh chứng (tối đa 5)',
                    style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  const Text('JPG, PNG, WebP · tối đa 5 MB/ảnh, 20 MB tổng',
                    style: TextStyle(color: muted, fontSize: 11)),
                  const SizedBox(height: 10),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    if (selected.length < CheckinPhotoLimits.maxFiles) ...[
                      OutlinedButton.icon(
                        key: const ValueKey('pick-checkin-gallery'),
                        onPressed: () => choosePhotos(ImageSource.gallery, redraw),
                        icon: const Icon(Icons.photo_library_outlined, size: 17),
                        label: const Text('Thư viện'),
                      ),
                      OutlinedButton.icon(
                        key: const ValueKey('pick-checkin-camera'),
                        onPressed: () => choosePhotos(ImageSource.camera, redraw),
                        icon: const Icon(Icons.camera_alt_outlined, size: 17),
                        label: const Text('Chụp ảnh'),
                      ),
                    ],
                  ]),
                  if (selected.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(spacing: 8, runSpacing: 8, children: [
                      for (var index = 0; index < selected.length; index++)
                        Stack(clipBehavior: Clip.none, children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(
                              File(selected[index].path), width: 72, height: 72,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => const Icon(
                                Icons.broken_image_outlined, size: 65),
                            ),
                          ),
                          Positioned(top: -8, right: -8, child: IconButton.filledTonal(
                            tooltip: 'Bỏ ảnh này',
                            icon: const Icon(Icons.close, size: 14),
                            visualDensity: VisualDensity.compact,
                            onPressed: () => redraw(() {
                              selected.removeAt(index);
                              photoError = null;
                            }),
                          )),
                        ]),
                    ]),
                    const SizedBox(height: 7),
                    Text('${selected.length}/5 ảnh  •  '
                        '${(selected.fold<int>(0, (n, p) => n + p.bytes) / (1024 * 1024)).toStringAsFixed(1)} MB',
                        style: const TextStyle(color: muted, fontSize: 11)),
                  ],
                  if (photoError != null) ...[
                    const SizedBox(height: 8),
                    Text(photoError!, style: const TextStyle(color: Colors.red)),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Hủy'),
            ),
            FilledButton(
              key: const ValueKey('confirm-checkin'),
              onPressed: photoError != null ? null : () =>
                  Navigator.pop(dialogContext,
                    (note: noteController.text.trim(), images: List.of(selected))),
              child: const Text('Xác nhận check-in'),
            ),
          ],
        ),
      ),
    );
    dialogOpen = false;
    noteController.dispose();
    if (submission == null || !mounted) return;
    setState(() {
      busy = stop.id;
      error = null;
    });

    try {
      final note = submission.note.isEmpty ? null : submission.note;
      final updated = submission.images.isEmpty
          ? await widget.guides.checkIn(current.id, stop.id, 'CheckedIn', note)
          : await widget.guides.checkInWithImages(
              current.id, stop.id, note, submission.images);
      if (!mounted) return;
      setState(() => current = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check-in địa điểm thành công.')),
      );
    } catch (e) {
      // The backend checks actual eligibility again on each submission;
      // refresh server state when a predecessor/date changes during the call.
      if (e is ApiFailure && e.statusCode == 409) {
        try {
          final updated = await widget.guides.detail(current.id);
          if (mounted) setState(() => current = updated);
        } catch (_) {
          // Preserve the original validation error.
        }
      }
      if (mounted) setState(() => error = readableError(e));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stops = current.days.expand((d) => d.stops).toList();
    final checked = stops.where((s) => s.status == 'CheckedIn').length;
    final nextId = current.nextLocationCheckInId;
    final enabledByDate = current.canCheckInLocations;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Check-in địa điểm'),
        actions: [
          IconButton(
            tooltip: 'Tải lại trạng thái từ backend',
            onPressed: busy == null ? refresh : null,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
        children: [
          Text(current.name, style: const TextStyle(
            color: muted, fontSize: 12, fontWeight: FontWeight.w600,
          )),
          space(15),
          Row(children: [
            Expanded(child: GuideMetric(
              icon: Icons.place_outlined, value: '${stops.length}',
              label: 'Tổng điểm dừng',
            )),
            const SizedBox(width: 9),
            Expanded(child: GuideMetric(
              icon: Icons.check_circle_outline, value: '$checked',
              label: 'Đã check-in',
            )),
            const SizedBox(width: 9),
            Expanded(child: GuideMetric(
              icon: Icons.schedule_outlined,
              value: '${stops.length - checked}',
              label: 'Chưa check-in',
              iconColor: const Color(0xFFB78330),
              tint: const Color(0xFFFFF3DF),
            )),
          ]),
          space(15),
          GuideInfoBanner(
            icon: enabledByDate ? Icons.route_outlined : Icons.lock_clock_outlined,
            warning: !enabledByDate,
            message: enabledByDate
                ? 'Đã đến ngày khởi hành. Chỉ được check-in điểm kế tiếp '
                  'theo thứ tự lịch trình; không cần bật GPS.'
                : 'Chưa đến ngày khởi hành hoặc tour không còn cho phép check-in.',
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
          if (stops.isEmpty)
            const GuideEmptyState(
              title: 'Chưa có điểm dừng',
              message: 'Backend chưa trả về lịch trình check-in.',
            ),
          ...current.days.map((day) => Padding(
            padding: const EdgeInsets.only(bottom: 17),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
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
                ...day.stops.map((stop) {
                  final done = stop.status == 'CheckedIn';
                  final isNext = nextId == stop.id && !done;
                  final canCheck = enabledByDate && isNext && busy == null;
                  final blockedReason = done
                      ? 'Đã hoàn thành'
                      : !enabledByDate
                          ? 'Chưa đến ngày khởi hành'
                          : !isNext
                              ? 'Cần check-in điểm trước đó'
                              : 'Sẵn sàng check-in';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Card(child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Container(
                              height: 39, width: 39,
                              decoration: BoxDecoration(
                                color: done ? paleTeal : const Color(0xFFEEF2F8),
                                borderRadius: BorderRadius.circular(11),
                              ),
                              child: Icon(
                                done ? Icons.check_circle_outline :
                                    Icons.location_on_outlined,
                                size: 21, color: done ? teal : muted,
                              ),
                            ),
                            const SizedBox(width: 11),
                            Expanded(child: Text(stop.name,
                              style: const TextStyle(
                                fontSize: 13, color: ink,
                                fontWeight: FontWeight.w800,
                              ))),
                            GuideStatusPill(done ? 'Đã check-in' :
                                isNext ? 'Đến lượt' : 'Đang khóa',
                              background: done ? paleTeal :
                                  const Color(0xFFEEF2F8),
                              foreground: done ? deepTeal : muted),
                          ]),
                          space(10),
                          Text(blockedReason, style: const TextStyle(
                            fontSize: 11, color: muted,
                          )),
                          if (stop.photoUrls.isNotEmpty) ...[
                            space(8),
                            const Text('Ảnh check-in đã gửi',
                              style: TextStyle(fontSize: 11,
                                color: ink, fontWeight: FontWeight.w700)),
                            space(6),
                            Wrap(spacing: 7, runSpacing: 7, children: [
                              for (final url in stop.photoUrls)
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(9),
                                  child: FutureBuilder<Uint8List>(
                                    future: photoDownloads.putIfAbsent(url,
                                        () => widget.guides.imageBytes(url)),
                                    builder: (context, snapshot) =>
                                        snapshot.hasData
                                            ? Image.memory(snapshot.data!,
                                                width: 69, height: 69,
                                                fit: BoxFit.cover)
                                            : Container(
                                                width: 69, height: 69,
                                                color: paleTeal,
                                                child: Icon(
                                                  snapshot.hasError
                                                      ? Icons.broken_image_outlined
                                                      : Icons.hourglass_bottom_outlined,
                                                  color: muted),
                                              ),
                                  ),
                                ),
                            ]),
                          ],
                          if (busy == stop.id) ...[
                            space(9),
                            const LinearProgressIndicator(),
                          ],
                          space(10),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              key: ValueKey('checkin-${stop.id}'),
                              onPressed: canCheck ? () => check(stop) : null,
                              icon: const Icon(Icons.check_circle_outline, size: 17),
                              label: const Text('Check-in điểm đến'),
                            ),
                          ),
                        ],
                      ),
                    )),
                  );
                }),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
