import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'guide_glass.dart';

/// Shared static-glass KPI tile for guide dashboards and tour operations.
class GuideGlassMetric extends StatelessWidget {
  const GuideGlassMetric({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
    required this.tint,
  });

  final IconData icon;
  final int? value;
  final String label;
  final Color color;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 280);
    final numberStyle = TextStyle(
      fontSize: 34,
      fontWeight: FontWeight.w700,
      height: 1.05,
      letterSpacing: -1.2,
      color: color,
    );

    return Semantics(
      label: '$label: ${value ?? "—"}',
      excludeSemantics: true,
      child: GuideStaticGlass(
        radius: 28,
        compact: true,
        tint: tint,
        glow: color.withValues(alpha: 0.22),
        highlightTint: const Color(0xE6FFFFFF),
        padding: const EdgeInsets.fromLTRB(11, 12, 11, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: Color(0xD9FFFFFF),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 17, color: color),
              ),
            ),
            const SizedBox(height: 5),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: value == null
                  ? Text('—', style: numberStyle)
                  : TweenAnimationBuilder<double>(
                      tween: Tween<double>(
                        begin: value!.toDouble(), end: value!.toDouble(),
                      ),
                      duration: duration,
                      curve: Curves.easeOutCubic,
                      builder: (context, animated, _) =>
                          Text('${animated.round()}', style: numberStyle),
                    ),
            ),
            const SizedBox(height: 7),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                height: 1.25,
                color: ink,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
