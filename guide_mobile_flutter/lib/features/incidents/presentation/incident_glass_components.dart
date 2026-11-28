import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';
import '../domain/incident_categories.dart';

typedef IncidentCategoryStyle = ({String label, IconData icon, Color color, Color tint});

IncidentCategoryStyle incidentCategoryStyle(String? code) {
  final (icon, color, tint) = switch (code) {
    'HEALTH' => (Icons.monitor_heart_outlined, const Color(0xFF963F48), const Color(0xFFF2CDD2)),
    'VEHICLE' => (Icons.directions_bus_outlined, const Color(0xFF87601C), const Color(0xFFF2E1BE)),
    'WEATHER' => (Icons.cloud_outlined, const Color(0xFF315F91), const Color(0xFFCFE0F7)),
    'CUSTOMER' => (Icons.groups_outlined, deepTeal, const Color(0xFFB9E1DE)),
    'SECURITY' => (Icons.shield_outlined, const Color(0xFF963F48), const Color(0xFFF2CDD2)),
    'SERVICE_PROVIDER' => (Icons.storefront_outlined, const Color(0xFF65528E), const Color(0xFFE5DDF4)),
    'SCHEDULE' => (Icons.schedule_outlined, const Color(0xFF315F91), const Color(0xFFCFE0F7)),
    _ => (Icons.more_horiz_rounded, muted, const Color(0xFFDCE5EA)),
  };
  var label = 'Chưa rõ loại sự cố';
  for (final category in incidentCategories) {
    if (category.code == code) {
      label = category.label;
      break;
    }
  }
  return (label: label, icon: icon, color: color, tint: tint);
}

class IncidentCategoryPill extends StatelessWidget {
  const IncidentCategoryPill({super.key, required this.code});
  final String? code;
  @override
  Widget build(BuildContext context) {
    final style = incidentCategoryStyle(code);
    return GuideGlass(
      radius: 24, blurSigma: 0, shadow: false,
      tint: style.tint,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(style.icon, color: style.color, size: 16),
        const SizedBox(width: 5),
        Flexible(child: Text(style.label, style: TextStyle(
          fontSize: 12, fontWeight: FontWeight.w600, color: style.color,
        ))),
      ]),
    );
  }
}

Future<String?> showIncidentCategorySheet(BuildContext context, String? selected) =>
    showModalBottomSheet<String>(
      context: context, isScrollControlled: true, useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => SafeArea(
        top: false,
        child: GuideGlass(
          radius: 30, blurSigma: 0, shadow: false,
          tint: const Color(0xFFF0F7F7),
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.82),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const IncidentSheetHandle(),
              Row(children: [
                const Expanded(child: Text('Loại sự cố', style: TextStyle(
                  color: ink, fontSize: 22, fontWeight: FontWeight.w700,
                ))),
                IconButton(tooltip: 'Đóng', onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded)),
              ]),
              Flexible(child: Material(
                type: MaterialType.transparency,
                child: ListView.separated(
                  shrinkWrap: true, padding: EdgeInsets.zero,
                  itemCount: incidentCategories.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final option = incidentCategories[index];
                    final style = incidentCategoryStyle(option.code);
                    return ListTile(
                      key: ValueKey('incident-category-${option.code}'),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      leading: CircleAvatar(backgroundColor: style.tint,
                        child: Icon(style.icon, color: style.color)),
                      title: Text(option.label, style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600, color: ink,
                      )),
                      trailing: option.code == selected
                          ? const Icon(Icons.check_rounded, color: deepTeal) : null,
                      onTap: () => Navigator.pop(context, option.code),
                    );
                  },
                ),
              )),
            ]),
          ),
        ),
      ),
    );

class IncidentSheetHandle extends StatelessWidget {
  const IncidentSheetHandle({super.key});
  @override
  Widget build(BuildContext context) => Center(child: Container(
    width: 36, height: 4,
    decoration: BoxDecoration(color: const Color(0xFFB6C7C8),
      borderRadius: BorderRadius.circular(8)),
  ));
}

class IncidentGlassBanner extends StatelessWidget {
  const IncidentGlassBanner({super.key, required this.message, this.warning = false,
    this.icon = Icons.shield_outlined});
  final String message;
  final bool warning;
  final IconData icon;
  @override
  Widget build(BuildContext context) {
    final color = warning ? const Color(0xFF963F48) : const Color(0xFF87601C);
    return GuideGlass(
      radius: 20, blurSigma: 0, shadow: false,
      tint: warning ? const Color(0xD9F2CDD2) : const Color(0xD9F2E1BE),
      padding: const EdgeInsets.all(12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: color, size: 21),
        const SizedBox(width: 9),
        Expanded(child: Text(message, style: TextStyle(
          color: color, fontSize: 13, height: 1.35,
        ))),
      ]),
    );
  }
}
