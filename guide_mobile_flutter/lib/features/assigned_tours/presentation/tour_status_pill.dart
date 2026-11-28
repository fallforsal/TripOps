import 'package:flutter/material.dart';

import '../domain/tour_catalog.dart';

/// Tour status capsule with a static glass highlight. A single decoration
/// keeps long tour lists cheap to paint; no blur or animation is needed.
class TourStatusPill extends StatelessWidget {
  const TourStatusPill({super.key, required this.status});

  final String status;

  static (Color, Color) _palette(String status) => switch (status) {
    'Confirmed' || 'Paid' || 'Deposited' => (
      const Color(0xFF87601C), const Color(0xFFF0D8A4),
    ),
    'InProgress' => (const Color(0xFF006B65), const Color(0xFFAEDFD6)),
    'Completed' => (const Color(0xFF315F91), const Color(0xFFBFD6F5)),
    'Cancelled' || 'Rejected' => (
      const Color(0xFF963F48), const Color(0xFFF2C8CD),
    ),
    _ => (const Color(0xFF52656E), const Color(0xFFDCE5EA)),
  };

  @override
  Widget build(BuildContext context) {
    final (foreground, tint) = _palette(status);
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.lerp(Colors.white, tint, 0.18)!,
            Color.lerp(Colors.white, tint, 0.72)!,
            Color.lerp(Colors.white, tint, 0.38)!,
          ],
          stops: const [0, 0.62, 1],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xF2FFFFFF), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(
          bookingStatusLabel(status),
          style: TextStyle(
            color: foreground,
            fontSize: 13,
            height: 1.2,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
