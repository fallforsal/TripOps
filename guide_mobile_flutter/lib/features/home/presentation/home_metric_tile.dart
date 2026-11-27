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
        radius: 28,
        blurSigma: 0,
        padding: EdgeInsets.zero,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFFF5FCFC),
                  tint,
                  const Color(0xFFDCE7F6),
                ],
              ),
            ),
            child: Stack(
              fit: StackFit.passthrough,
              children: [
                Positioned(
                  right: -30,
                  top: -36,
                  child: Container(
                    width: 108,
                    height: 108,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: color.withValues(alpha: 0.22),
                    ),
                  ),
                ),
                Positioned(
                  right: -8,
                  bottom: -38,
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0x90FFFFFF),
                    ),
                  ),
                ),
                // Like GuideHero, blur the tinted shapes behind the inner glass.
                // Only these three home tiles use this additional blur.
                GuideGlass(
                  radius: 28,
                  blurSigma: 12,
                  shadow: false,
                  highlightTint: const Color(0xE6FFFFFF),
                  tint: const Color(0x60FFFFFF),
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
                                  begin: 0, end: value!.toDouble(),
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}
