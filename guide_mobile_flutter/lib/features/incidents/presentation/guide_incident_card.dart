import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../location_checkin/presentation/location_evidence_gallery.dart';
import 'incident_glass_components.dart';

class GuideIncidentCard extends StatelessWidget {
  const GuideIncidentCard({super.key, required this.incident, required this.onTap});
  final TourIncident incident;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GuideGlass(
    radius: 26, blurSigma: 0, shadow: false,
    child: Material(
      type: MaterialType.transparency,
      child: InkWell(
        borderRadius: BorderRadius.circular(26),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            IncidentCategoryPill(code: incident.incidentType),
            const SizedBox(height: 8),
            Text(incident.title, style: const TextStyle(
              fontSize: 17, fontWeight: FontWeight.w700, color: ink,
            ), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 5),
            Text(incident.description, maxLines: 2, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: muted, height: 1.35)),
            const Divider(height: 22),
            Row(children: [
              const Icon(Icons.photo_library_outlined, size: 17, color: muted),
              const SizedBox(width: 6),
              Expanded(child: Text(incident.evidenceUrls.isEmpty ? 'Không có ảnh'
                : '${incident.evidenceUrls.length} ảnh minh chứng',
                style: const TextStyle(fontSize: 12, color: muted))),
              const Icon(Icons.chevron_right_rounded, color: deepTeal),
            ]),
          ]),
        ),
      ),
    ),
  );
}

Future<void> showIncidentDetail(BuildContext context, TourIncident incident,
    LocationPhotoCache cache) => showModalBottomSheet<void>(
  context: context, isScrollControlled: true, useSafeArea: true,
  backgroundColor: Colors.transparent,
  builder: (context) => SafeArea(
    top: false,
    child: GuideGlass(
      radius: 30, blurSigma: 0, shadow: false, tint: const Color(0xFFF0F7F7),
      padding: const EdgeInsets.fromLTRB(18, 10, 18, 16),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.86),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const IncidentSheetHandle(),
          Row(children: [
            const Expanded(child: Text('Chi tiết sự cố', style: TextStyle(
              fontSize: 22, fontWeight: FontWeight.w700, color: ink,
            ))),
            IconButton(tooltip: 'Đóng', onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close_rounded)),
          ]),
          Flexible(child: SingleChildScrollView(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Align(alignment: Alignment.centerLeft,
                child: IncidentCategoryPill(code: incident.incidentType)),
              const SizedBox(height: 12),
              Text(incident.title, style: const TextStyle(fontSize: 21,
                fontWeight: FontWeight.w700, color: ink)),
              const Divider(height: 24),
              const Text('Mô tả chi tiết', style: TextStyle(
                fontWeight: FontWeight.w700, color: ink)),
              const SizedBox(height: 8),
              SelectableText(incident.description, style: const TextStyle(
                fontSize: 14, color: ink, height: 1.5)),
              const Divider(height: 24),
              Text('Ảnh minh chứng · ${incident.evidenceUrls.length} ảnh',
                style: const TextStyle(fontWeight: FontWeight.w700, color: ink)),
              const SizedBox(height: 8),
              if (incident.evidenceUrls.isEmpty)
                const Text('Không có ảnh minh chứng', style: TextStyle(color: muted))
              else
                EvidencePhotoStrip(urls: incident.evidenceUrls, cache: cache,
                  title: 'Ảnh sự cố'),
            ]),
          )),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: FilledButton(
            onPressed: () => Navigator.pop(context), child: const Text('Đóng'),
          )),
        ]),
      ),
    ),
  ),
);
