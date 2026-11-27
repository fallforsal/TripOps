import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';
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
    this.initialSubmission,
  });

  final String stopName;
  final ImagePicker? imagePicker;
  final bool isCheckout;
  final bool isSkip;
  final CheckinSubmission? initialSubmission;

  @override
  State<CheckinPhotoDialog> createState() => _CheckinPhotoDialogState();
}

class _CheckinPhotoDialogState extends State<CheckinPhotoDialog> {
  late final _noteController = TextEditingController(text: widget.initialSubmission?.note ?? '');
  late final _selected = <CheckinPhoto>[...?widget.initialSubmission?.images];
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
    final validation = CheckinPhoto.validate(_selected);
    if (validation != null) {
      setState(() => _photoError = validation);
      return;
    }
    if (_selected.any((photo) => !File(photo.path).existsSync())) {
      setState(() => _photoError = 'Ảnh tạm không còn trên thiết bị. Hãy bỏ ảnh lỗi và thêm lại.');
      return;
    }
    Navigator.of(context).pop<CheckinSubmission>((
      note: _noteController.text.trim(),
      images: List<CheckinPhoto>.unmodifiable(_selected),
    ));
  }

  String get _title => widget.isCheckout
      ? 'Check-out ${widget.stopName}'
      : widget.isSkip ? 'Bỏ qua · ${widget.stopName}' : 'Check-in ${widget.stopName}';

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    final accent = widget.isCheckout ? const Color(0xFF315F91)
        : widget.isSkip ? const Color(0xFF87601C) : deepTeal;
    final canSubmit = !_picking && _photoError == null && _selected.isNotEmpty;
    return PopScope(
      canPop: !_picking,
      child: Padding(
        padding: EdgeInsets.only(bottom: keyboard),
        child: SafeArea(
          top: false,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: (size.height * 0.91 - keyboard).clamp(0.0, size.height).toDouble(),
            ),
            child: GuideGlass(
              radius: 30, blurSigma: 0, shadow: false,
              tint: const Color(0xFFF0F7F7),
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 14),
              child: Material(
                type: MaterialType.transparency,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(child: Container(width: 36, height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFB6C7C8),
                        borderRadius: BorderRadius.circular(8),
                      ))),
                    const SizedBox(height: 8),
                    Row(children: [
                      Expanded(child: Text(_title, style: const TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w700, color: ink,
                      ))),
                      IconButton(
                        tooltip: 'Đóng', onPressed: _picking ? null : () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded),
                        style: IconButton.styleFrom(backgroundColor: const Color(0xBFFFFFFF)),
                      ),
                    ]),
                    const SizedBox(height: 8),
                    Flexible(
                      child: SingleChildScrollView(
                        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(widget.isCheckout
                              ? 'Thêm ảnh minh chứng khi rời điểm này. Sau check-out mới được check-in điểm tiếp theo.'
                              : widget.isSkip
                                  ? 'Thêm ảnh minh chứng khi bỏ qua điểm này.'
                                  : 'Thêm ảnh minh chứng khi đến địa điểm.',
                            style: const TextStyle(color: muted, fontSize: 13)),
                          if (widget.initialSubmission != null) ...[
                            const SizedBox(height: 10),
                            const Text('Đã khôi phục ảnh và ghi chú từ lần gửi trước.',
                              style: TextStyle(color: deepTeal, fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                          const SizedBox(height: 16),
                          Row(children: [
                            const Expanded(child: Text('Ảnh minh chứng (bắt buộc)',
                              style: TextStyle(fontWeight: FontWeight.w700, color: ink))),
                            Text('${_selected.length}/5 ảnh', style: TextStyle(
                              color: accent, fontWeight: FontWeight.w700)),
                          ]),
                          const SizedBox(height: 8),
                          if (_selected.isNotEmpty)
                            Wrap(spacing: 8, runSpacing: 8, children: [
                              for (var index = 0; index < _selected.length; index++)
                                Stack(children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(14),
                                    child: Image.file(
                                      File(_selected[index].path),
                                      key: ValueKey('selected-proof-$index'),
                                      width: 86, height: 86, fit: BoxFit.cover,
                                      cacheWidth: (86 * MediaQuery.devicePixelRatioOf(context) * 2).ceil(),
                                      errorBuilder: (_, _, _) => const SizedBox(
                                        width: 86, height: 86,
                                        child: Icon(Icons.broken_image_outlined, color: muted),
                                      ),
                                    ),
                                  ),
                                  Positioned(top: 0, right: 0, child: IconButton(
                                    tooltip: 'Bỏ ảnh này',
                                    style: IconButton.styleFrom(
                                      backgroundColor: const Color(0xE6FFFFFF),
                                      minimumSize: const Size(40, 40),
                                    ),
                                    icon: const Icon(Icons.close_rounded, size: 18),
                                    onPressed: _picking ? null : () => setState(() {
                                      _selected.removeAt(index);
                                      _photoError = null;
                                    }),
                                  )),
                                ]),
                            ]),
                          const SizedBox(height: 10),
                          if (_selected.length < CheckinPhotoLimits.maxFiles)
                            Row(children: [
                              Expanded(child: FilledButton.icon(
                                key: const ValueKey('pick-checkin-camera'),
                                onPressed: _picking ? null : () => _choosePhotos(ImageSource.camera),
                                style: FilledButton.styleFrom(
                                  backgroundColor: accent, foregroundColor: Colors.white,
                                  minimumSize: const Size(0, 48),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                                ),
                                icon: const Icon(Icons.camera_alt_outlined, size: 18),
                                label: const Text('Chụp ảnh', textAlign: TextAlign.center),
                              )),
                              const SizedBox(width: 8),
                              Expanded(child: OutlinedButton.icon(
                                key: const ValueKey('pick-checkin-gallery'),
                                onPressed: _picking ? null : () => _choosePhotos(ImageSource.gallery),
                                style: OutlinedButton.styleFrom(
                                  backgroundColor: const Color(0xBFFFFFFF),
                                  foregroundColor: accent, minimumSize: const Size(0, 48),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                                  side: const BorderSide(color: Colors.white),
                                ),
                                icon: const Icon(Icons.photo_library_outlined, size: 18),
                                label: const Text('Thư viện', textAlign: TextAlign.center),
                              )),
                            ]),
                          const SizedBox(height: 8),
                          const Text('JPG, PNG, WebP · tối đa 5 MB/ảnh, 20 MB tổng',
                            style: TextStyle(color: muted, fontSize: 12)),
                          if (_selected.isNotEmpty)
                            Text('Đã chọn ${(_selected.fold<int>(0, (n, p) => n + p.bytes) / (1024 * 1024)).toStringAsFixed(1)} MB',
                              style: const TextStyle(color: muted, fontSize: 12)),
                          if (_picking) ...[
                            const SizedBox(height: 8),
                            const LinearProgressIndicator(minHeight: 3),
                          ],
                          if (_photoError != null) ...[
                            const SizedBox(height: 8),
                            Text(_photoError!, style: const TextStyle(color: Color(0xFF963F48))),
                          ],
                          const SizedBox(height: 18),
                          Text(widget.isSkip ? 'Lý do bỏ qua' : 'Ghi chú',
                            style: const TextStyle(color: ink, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          TextField(
                            key: const ValueKey('checkin-note-field'),
                            controller: _noteController,
                            maxLines: 2, maxLength: 500,
                            decoration: InputDecoration(
                              hintText: widget.isSkip ? 'Lý do (không bắt buộc)' : 'Nhập ghi chú (không bắt buộc)',
                              filled: true, fillColor: const Color(0xD9FFFFFF),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(18),
                                borderSide: const BorderSide(color: Colors.white)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18),
                                borderSide: const BorderSide(color: Colors.white)),
                            ),
                          ),
                        ]),
                      ),
                    ),
                    const SizedBox(height: 10),
                    FilledButton(
                      key: const ValueKey('confirm-checkin'),
                      onPressed: canSubmit ? _submit : null,
                      style: FilledButton.styleFrom(backgroundColor: accent,
                        foregroundColor: Colors.white, minimumSize: const Size(0, 50),
                        shape: const StadiumBorder()),
                      child: Text(widget.isCheckout ? 'Xác nhận check-out'
                          : widget.isSkip ? 'Xác nhận bỏ qua' : 'Xác nhận check-in'),
                    ),
                    TextButton(
                      onPressed: _picking ? null : () => Navigator.pop(context),
                      child: const Text('Hủy'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
