import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'guide_glass.dart';

/// iOS-inspired glass segmented control with a single sliding capsule.
/// Selection is controlled by the caller; the control owns no filter logic.
class GuideSegmentedControl<T> extends StatelessWidget {
  const GuideSegmentedControl({
    super.key,
    required this.value,
    required this.labels,
    required this.onChanged,
  });

  final T value;
  final Map<T, String> labels;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final options = labels.entries.toList(growable: false);
    assert(options.length >= 2);
    assert(labels.containsKey(value));
    final selectedIndex = options.indexWhere((entry) => entry.key == value);
    final animation = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 260);
    // Allow Vietnamese labels to wrap instead of hiding the last segment.
    final height = math.max(46.0, MediaQuery.textScalerOf(context).scale(13) * 2.4 + 10);
    final radius = (height + 8) / 2;

    return GuideGlass(
      radius: radius,
      blurSigma: 12,
      shadow: false,
      highlightTint: const Color(0x92E5EEEE),
      tint: const Color(0x706F9293),
      padding: const EdgeInsets.all(4),
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            AnimatedAlign(
              key: const ValueKey('guide-segment-thumb'),
              alignment: Alignment(
                -1 + 2 * selectedIndex / (options.length - 1),
                0,
              ),
              duration: animation,
              curve: Curves.easeOutCubic,
              child: FractionallySizedBox(
                widthFactor: 1 / options.length,
                heightFactor: 1,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(radius),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xF2FFFFFF), Color(0xC9F2FAF9)],
                    ),
                    border: Border.all(color: const Color(0xF2FFFFFF), width: 1.1),
                    boxShadow: const [
                      BoxShadow(color: Color(0x1F173E43), blurRadius: 8, offset: Offset(0, 2)),
                    ],
                  ),
                ),
              ),
            ),
            Material(
              type: MaterialType.transparency,
              child: Row(
                children: [
                  for (final option in options)
                    Expanded(
                      child: Semantics(
                        selected: option.key == value,
                        button: true,
                        label: option.value,
                        excludeSemantics: true,
                        onTap: () {
                          if (option.key != value) onChanged(option.key);
                        },
                        child: InkWell(
                          key: ValueKey(option.key),
                          borderRadius: BorderRadius.circular(radius),
                          onTap: () {
                            if (option.key != value) onChanged(option.key);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 4),
                            child: Center(
                              child: AnimatedDefaultTextStyle(
                                duration: animation,
                                style: TextStyle(
                                  fontSize: 13,
                                  height: 1.15,
                                  fontWeight: option.key == value ? FontWeight.w700 : FontWeight.w500,
                                  color: option.key == value ? ink : muted,
                                ),
                                child: Text(
                                  option.value,
                                  textAlign: TextAlign.center,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
