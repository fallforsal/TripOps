import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

/// A bounded, cross-platform approximation of frosted Liquid Glass.
/// Blur is reserved for prominent controls; repeated list cards use tint only.
class GuideGlass extends StatelessWidget {
  const GuideGlass({
    super.key,
    required this.child,
    this.radius = 28,
    this.blurSigma = 18,
    this.shadow = true,
    this.padding = EdgeInsets.zero,
    this.tint = const Color(0xBFFFFFFF),
    this.highlightTint = const Color(0xF2FFFFFF),
  });

  final Widget child;
  final double radius;
  final double blurSigma;
  final bool shadow;
  final EdgeInsetsGeometry padding;
  final Color tint;
  final Color highlightTint;

  @override
  Widget build(BuildContext context) {
    final corners = BorderRadius.circular(radius);
    final surface = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: corners,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [highlightTint, tint],
        ),
        border: Border.all(color: const Color(0xE6FFFFFF), width: 1.2),
      ),
      child: Padding(padding: padding, child: child),
    );
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: corners,
        boxShadow: shadow
            ? const [
                BoxShadow(color: Color(0x241C4150), blurRadius: 25, offset: Offset(0, 9)),
                BoxShadow(color: Color(0x0D182B38), blurRadius: 5, offset: Offset(0, 2)),
              ]
            : const [],
      ),
      child: ClipRRect(
        borderRadius: corners,
        child: blurSigma > 0
            ? BackdropFilter(
                filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
                child: surface,
              )
            : surface,
      ),
    );
  }
}

/// Stable background behind the navigator; no animated full-screen blur.
class GuideGlassBackground extends StatelessWidget {
  const GuideGlassBackground({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF9FCFD), Color(0xFFE3F2F3), Color(0xFFF1F2F8), Color(0xFFEDF6F4)],
        stops: [0, 0.35, 0.72, 1],
      ),
    ),
    child: child,
  );
}
