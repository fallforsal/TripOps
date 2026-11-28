import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../location_checkin/domain/checkin_photo.dart';
import '../../location_checkin/presentation/location_evidence_gallery.dart';
import 'incident_glass_components.dart';

class IncidentPhotoPicker extends StatelessWidget {
  const IncidentPhotoPicker({super.key, required this.photos, required this.locked,
    required this.picking, required this.onPick, required this.onRemove, this.error});
  final List<CheckinPhoto> photos;
  final bool locked, picking;
  final ValueChanged<ImageSource> onPick;
  final ValueChanged<int> onRemove;
  final String? error;

  void _preview(BuildContext context, int index) {
    final paths = photos.map((photo) => photo.path).toList(growable: false);
    final cache = LocationPhotoCache((path) => File(path).readAsBytes());
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (context) => LocationPhotoViewer(
        urls: paths, initialIndex: index, cache: cache, title: 'Ảnh đã chọn',
      ),
    )).whenComplete(cache.clear);
  }

  @override
  Widget build(BuildContext context) {
    final total = photos.fold<int>(0, (sum, photo) => sum + photo.bytes);
    final canAdd = !locked && !picking && photos.length < CheckinPhotoLimits.maxFiles;
    return GuideGlass(
      radius: 26, blurSigma: 0, shadow: false,
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Expanded(child: Text('Ảnh minh chứng', style: TextStyle(
            fontSize: 17, fontWeight: FontWeight.w700, color: ink,
          ))),
          Text('${photos.length}/${CheckinPhotoLimits.maxFiles} ảnh',
            style: const TextStyle(color: deepTeal, fontWeight: FontWeight.w600)),
        ]),
        const SizedBox(height: 5),
        const Text('Không bắt buộc · JPG, PNG, WebP · 5 MB/ảnh',
          style: TextStyle(fontSize: 12, color: muted)),
        if (photos.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (var i = 0; i < photos.length; i++)
              SizedBox(width: 86, child: Column(children: [
                Stack(children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: GestureDetector(
                      onTap: locked || picking ? null : () => _preview(context, i),
                      child: Image.file(File(photos[i].path),
                        key: ValueKey('incident-photo-$i'),
                        width: 86, height: 86, fit: BoxFit.cover,
                        cacheWidth: (86 * MediaQuery.devicePixelRatioOf(context) * 2).ceil(),
                        errorBuilder: (context, error, stackTrace) => const SizedBox(
                          width: 86, height: 86,
                          child: Icon(Icons.broken_image_outlined, color: muted),
                        )),
                    ),
                  ),
                  Positioned(top: 0, right: 0, child: IconButton(
                    key: ValueKey('incident-remove-photo-$i'),
                    tooltip: 'Bỏ ảnh này',
                    onPressed: locked || picking ? null : () => onRemove(i),
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xEFFFFFFF),
                      foregroundColor: const Color(0xFF963F48),
                      minimumSize: const Size(48, 48),
                    ),
                    icon: const Icon(Icons.close_rounded, size: 18),
                  )),
                ]),
                Text('${(photos[i].bytes / (1024 * 1024)).toStringAsFixed(1)} MB',
                  style: const TextStyle(fontSize: 11, color: muted)),
              ])),
          ]),
        ],
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: FilledButton.icon(
            key: const ValueKey('incident-camera'),
            onPressed: canAdd ? () => onPick(ImageSource.camera) : null,
            icon: const Icon(Icons.camera_alt_outlined, size: 18),
            label: const Text('Chụp ảnh', textAlign: TextAlign.center),
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10)),
          )),
          const SizedBox(width: 8),
          Expanded(child: OutlinedButton.icon(
            key: const ValueKey('incident-gallery'),
            onPressed: canAdd ? () => onPick(ImageSource.gallery) : null,
            icon: const Icon(Icons.photo_library_outlined, size: 18),
            label: const Text('Thư viện', textAlign: TextAlign.center),
            style: OutlinedButton.styleFrom(backgroundColor: const Color(0xBFFFFFFF),
              side: const BorderSide(color: Colors.white),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10)),
          )),
        ]),
        const SizedBox(height: 10),
        LinearProgressIndicator(
          value: total / CheckinPhotoLimits.maxTotalBytes,
          minHeight: 6, borderRadius: BorderRadius.circular(8),
          color: deepTeal, backgroundColor: paleTeal,
        ),
        const SizedBox(height: 5),
        Text('${(total / (1024 * 1024)).toStringAsFixed(1)} / 20 MB',
          style: const TextStyle(color: muted, fontSize: 12)),
        if (picking) ...[
          const SizedBox(height: 8),
          const LinearProgressIndicator(minHeight: 3),
        ],
        if (error != null) ...[
          const SizedBox(height: 8),
          IncidentGlassBanner(message: error!, warning: true, icon: Icons.error_outline),
        ],
      ]),
    );
  }
}
