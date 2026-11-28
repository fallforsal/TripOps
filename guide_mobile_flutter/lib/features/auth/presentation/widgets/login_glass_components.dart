import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/guide_glass.dart';

/// Static radial lighting, isolated from text entry and scrolling.
class LoginBackground extends StatelessWidget {
  const LoginBackground({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: [
      const RepaintBoundary(child: _AmbientMesh()),
      child,
    ],
  );
}

class _AmbientMesh extends StatelessWidget {
  const _AmbientMesh();

  @override
  Widget build(BuildContext context) => const DecoratedBox(
    decoration: BoxDecoration(color: Color(0xFFF1F8F7)),
    child: DecoratedBox(
      decoration: BoxDecoration(gradient: RadialGradient(
        center: Alignment(0.9, -0.85), radius: 1.05,
        colors: [Color(0xC4A6DCD5), Color(0x00A6DCD5)],
      )),
      child: DecoratedBox(
        decoration: BoxDecoration(gradient: RadialGradient(
          center: Alignment(-0.9, 0.05), radius: 0.95,
          colors: [Color(0xAAB9CEEC), Color(0x00B9CEEC)],
        )),
        child: DecoratedBox(
          decoration: BoxDecoration(gradient: RadialGradient(
            center: Alignment(0.8, 1), radius: 0.85,
            colors: [Color(0xA8B9E1D5), Color(0x00B9E1D5)],
          )),
        ),
      ),
    ),
  );
}

class LoginBrand extends StatelessWidget {
  const LoginBrand({super.key});

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      GuideGlass(
        radius: 26, blurSigma: 0, tint: const Color(0xD9D4EAE7),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 176),
          child: Image.asset(
            'assets/images/TripOps_logo_transparent.png',
            height: 58, fit: BoxFit.contain, semanticLabel: 'TripOps Logo',
          ),
        ),
      ),
      const SizedBox(height: 12),
      const GuideGlass(
        radius: 24, blurSigma: 0, shadow: false,
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Text('TOUR GUIDE', style: TextStyle(
          color: deepTeal, fontSize: 11, fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
        )),
      ),
    ],
  );
}

class LoginNotice extends StatelessWidget {
  const LoginNotice({
    super.key, required this.title, required this.message,
    required this.icon, this.color = deepTeal,
    this.tint = const Color(0xBFFFFFFF),
  });
  final String title, message;
  final IconData icon;
  final Color color, tint;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: GuideGlass(
      radius: 20, blurSigma: 0, shadow: false, tint: tint,
      padding: const EdgeInsets.all(12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 34, height: 34,
          decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xC9FFFFFF)),
          child: Icon(icon, size: 19, color: color),
        ),
        const SizedBox(width: 9),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13)),
          const SizedBox(height: 4),
          Text(message, style: const TextStyle(color: ink, fontSize: 12, height: 1.4)),
        ])),
      ]),
    ),
  );
}

class LoginGlassButton extends StatelessWidget {
  const LoginGlassButton({super.key, required this.busy, required this.onPressed});
  final bool busy;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(30),
      border: Border.all(color: const Color(0xA6FFFFFF)),
      gradient: LinearGradient(
        begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: onPressed == null
            ? const [Color(0xFF4D817D), Color(0xFF426D69)]
            : const [Color(0xFF197A73), Color(0xFF006B65)],
      ),
      boxShadow: const [BoxShadow(color: Color(0x22006B65), blurRadius: 12, offset: Offset(0, 5))],
    ),
    child: FilledButton(
      key: const ValueKey('login-submit'),
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: Colors.transparent, disabledBackgroundColor: Colors.transparent,
        foregroundColor: Colors.white, disabledForegroundColor: Colors.white,
        minimumSize: const Size(0, 54), shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        if (busy)
          const SizedBox.square(dimension: 18, child: CircularProgressIndicator(
            strokeWidth: 2, color: Colors.white,
          ))
        else
          const Icon(Icons.arrow_forward_rounded, size: 19),
        const SizedBox(width: 9),
        Flexible(child: Text(busy ? 'Đang đăng nhập...' : 'Đăng nhập',
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700))),
      ]),
    ),
  );
}

class BrandedSessionLoading extends StatelessWidget {
  const BrandedSessionLoading({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: LoginBackground(
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const LoginBrand(),
              const SizedBox(height: 28),
              const SizedBox.square(dimension: 28, child: CircularProgressIndicator(strokeWidth: 2.5)),
              const SizedBox(height: 14),
              Semantics(liveRegion: true, child: const Text(
                'Đang khôi phục phiên đăng nhập...', textAlign: TextAlign.center,
                style: TextStyle(color: muted, fontSize: 14),
              )),
            ]),
          ),
        ),
      ),
    ),
  );
}
