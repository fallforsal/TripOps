import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_theme.dart';
import '../domain/checkin_photo.dart';

typedef CheckinSubmission = ({String note, List<CheckinPhoto> images});

/// Owns its TextEditingController for the *entire* dialog route lifetime.
///
/// A showDialog Future completes as soon as Navigator.pop is called, while
/// the route can still animate out. Disposing the controller from the caller
/// at that moment can invalidate an active TextField and cause framework
/// deactivation assertions (_dependents.isEmpty).
class CheckinPhotoDialog extends StatefulWidget {
  const CheckinPhotoDialog({
    super.key,
    required this.stopName,
    this.imagePicker,
    this.isCheckout = false,
    this.isSkip = false,
  });

  final String stopName;
  final ImagePicker? imagePicker;
  final bool isCheckout;
  final bool isSkip;

  @override
  State<CheckinPhotoDialog> createState() => _CheckinPhotoDialogState();
}

class _CheckinPhotoDialogState extends State<CheckinPhotoDialog> {
  final _noteController = TextEditingController();
  final _selected = <CheckinPhoto>[];
  String? _photoError;
  bool _picking = false;

  ImagePicker get _picker => widget.imagePicker ?? _defaultPicker;
  late final ImagePicker _defaultPicker = ImagePicker();

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _choosePhotos(ImageSource source) async {
    if (_picking || _selected.length >= CheckinPhotoLimits.maxFiles) return;
    setState(() {
      _picking = true;
      _photoError = null;
    });
    try {
      final picked = source == ImageSource.camera
          ? [
              await _picker.pickImage(
                source: ImageSource.camera,
                maxWidth: 1800,
                maxHeight: 1800,
                imageQuality: 78,
                requestFullMetadata: false,
              ),
            ].whereType<XFile>().toList()
          : await _picker.pickMultiImage(
              maxWidth: 1800,
              maxHeight: 1800,
              imageQuality: 78,
              requestFullMetadata: false,
            );
      if (!mounted || picked.isEmpty) return;

      final additions = <CheckinPhoto>[];
      for (final photo in picked) {
        additions.add(CheckinPhoto(
          path: photo.path,
          name: photo.name,
          mime: CheckinPhoto.mimeForFileName(photo.name) ?? '',
          bytes: await photo.length(),
        ));
      }
      if (!mounted) return;

      final validation = CheckinPhoto.validate([..._selected, ...additions]);
      setState(() {
        _photoError = validation;
        if (validation == null) _selected.addAll(additions);
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _photoError = source == ImageSource.camera
              ? 'Không thể mở camera để chụp ảnh.'
              : 'Không thể mở thư viện ảnh trên máy.';
        });
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  void _submit() {
    if (_picking || _photoError != null || _selected.isEmpty) return;
    Navigator.of(context).pop<CheckinSubmission>((
      note: _noteController.text.trim(),
      images: List<CheckinPhoto>.unmodifiable(_selected),
    ));
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.isCheckout
        ? 'Check-out ${widget.stopName}'
        : widget.isSkip
            ? 'Bỏ qua · ${widget.stopName}'
            : 'Check-in ${widget.stopName}'),
    content: SizedBox(
      width: 360,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.isCheckout
                ? 'Chụp hoặc chọn ảnh khi rời điểm này. Sau check-out mới được check-in điểm tiếp theo.'
                : widget.isSkip
                    ? 'Chụp hoặc chọn ảnh làm minh chứng khi bỏ qua điểm này.'
                    : 'Chụp hoặc chọn ảnh minh chứng khi đến điểm này.'),
            const SizedBox(height: 12),
            TextField(
              key: const ValueKey('checkin-note-field'),
              controller: _noteController,
              maxLines: 2,
              maxLength: 500,
              decoration: InputDecoration(
                labelText: widget.isSkip
                    ? 'Lý do bỏ qua (không bắt buộc)'
                    : 'Ghi chú (không bắt buộc)',
              ),
            ),
            const SizedBox(height: 8),
            const Text('Ảnh minh chứng (bắt buộc, tối đa 5)',
              style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text('JPG, PNG, WebP · tối đa 5 MB/ảnh, 20 MB tổng',
              style: TextStyle(color: muted, fontSize: 11)),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (_selected.length < CheckinPhotoLimits.maxFiles) ...[
                OutlinedButton.icon(
                  key: const ValueKey('pick-checkin-camera'),
                  onPressed: _picking
                      ? null
                      : () => _choosePhotos(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_outlined, size: 17),
                  label: const Text('Chụp ảnh'),
                ),
                OutlinedButton.icon(
                  key: const ValueKey('pick-checkin-gallery'),
                  onPressed: _picking
                      ? null
                      : () => _choosePhotos(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_outlined, size: 17),
                  label: const Text('Chọn từ thư viện'),
                ),
              ],
            ]),
            if (_selected.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (var index = 0; index < _selected.length; index++)
                  Stack(clipBehavior: Clip.none, children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        File(_selected[index].path),
                        width: 72,
                        height: 72,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const Icon(Icons.broken_image_outlined, size: 65),
                      ),
                    ),
                    Positioned(
                      top: -8,
                      right: -8,
                      child: IconButton.filledTonal(
                        tooltip: 'Bỏ ảnh này',
                        icon: const Icon(Icons.close, size: 14),
                        visualDensity: VisualDensity.compact,
                        onPressed: _picking ? null : () => setState(() {
                          _selected.removeAt(index);
                          _photoError = null;
                        }),
                      ),
                    ),
                  ]),
              ]),
              const SizedBox(height: 7),
              Text('${_selected.length}/5 ảnh  •  '
                  '${(_selected.fold<int>(0, (n, p) => n + p.bytes) / (1024 * 1024)).toStringAsFixed(1)} MB',
                style: const TextStyle(color: muted, fontSize: 11)),
            ],
            if (_photoError != null) ...[
              const SizedBox(height: 8),
              Text(_photoError!, style: const TextStyle(color: Colors.red)),
            ],
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: _picking ? null : () => Navigator.pop(context),
        child: const Text('Hủy'),
      ),
      FilledButton(
        key: const ValueKey('confirm-checkin'),
        onPressed: _picking || _photoError != null || _selected.isEmpty ? null : _submit,
        child: Text(widget.isCheckout
            ? 'Xác nhận check-out'
            : widget.isSkip
                ? 'Xác nhận bỏ qua'
                : 'Xác nhận check-in'),
      ),
    ],
  );
}
