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


/// Decorative glass artwork. Unlike live glass, it never samples the scrolling
/// backdrop. Soft radial glows approximate the original blurred shapes.
class GuideStaticGlass extends StatelessWidget {
  const GuideStaticGlass({
    super.key,
    required this.child,
    required this.padding,
    required this.radius,
    this.tint = const Color(0xFFB9E1DE),
    this.glow = const Color(0x8870BFB8),
    this.compact = false,
    this.highlightTint = const Color(0xF2FFFFFF),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color tint;
  final Color glow;
  final bool compact;
  final Color highlightTint;

  @override
  Widget build(BuildContext context) => GuideGlass(
    radius: radius,
    blurSigma: 0,
    child: Stack(
      fit: StackFit.passthrough,
      children: [
        Positioned.fill(
          child: RepaintBoundary(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [const Color(0xFFF5FCFC), tint, const Color(0xFFDCE7F6)],
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: compact ? -34 : -50,
                    top: compact ? -40 : -75,
                    child: _SoftGlassGlow(
                      size: compact ? 124 : 230,
                      color: glow,
                    ),
                  ),
                  Positioned(
                    right: compact ? -12 : 0,
                    bottom: compact ? -42 : -80,
                    child: _SoftGlassGlow(
                      size: compact ? 120 : 210,
                      color: const Color(0x90FFFFFF),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        GuideGlass(
          radius: radius,
          blurSigma: 0,
          shadow: false,
          highlightTint: highlightTint,
          tint: const Color(0x60FFFFFF),
          padding: padding,
          child: child,
        ),
      ],
    ),
  );
}

class _SoftGlassGlow extends StatelessWidget {
  const _SoftGlassGlow({required this.size, required this.color});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: size,
    child: DecoratedBox(
      decoration: BoxDecoration(
        gradient: RadialGradient(
          colors: [color, color.withValues(alpha: 0)],
          stops: const [0.25, 1.0],
        ),
      ),
    ),
  );
}
