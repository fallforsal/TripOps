import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';

/// Home-only metric widget; operational metrics elsewhere retain their layout.
class HomeMetricTile extends StatelessWidget {
  const HomeMetricTile({
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
        : const Duration(milliseconds: 420);
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
      child: GuideGlass(
        radius: 24,
        blurSigma: 0,
        shadow: false,
        highlightTint: const Color(0xF2FFFFFF),
        tint: tint,
        padding: const EdgeInsets.all(11),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: Container(
                width: 30,
                height: 30,
                decoration: const BoxDecoration(
                  color: Color(0xBFFFFFFF),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 17, color: color),
              ),
            ),
            const SizedBox(height: 4),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: value == null
                  ? Text('—', style: numberStyle)
                  : TweenAnimationBuilder<double>(
                      tween: Tween<double>(begin: 0, end: value!.toDouble()),
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
