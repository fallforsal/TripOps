import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';

const _absentColor = Color(0xFFB95B64);

/// Progress is the number of recorded attendance decisions, not presence rate.
class AttendanceProgressCard extends StatelessWidget {
  const AttendanceProgressCard({
    super.key,
    required this.total,
    required this.present,
    required this.absent,
  }) : assert(total >= 0),
       assert(present >= 0),
       assert(absent >= 0),
       assert(present + absent <= total);

  final int total, present, absent;
  int get recorded => present + absent;
  int get remaining => total - recorded;
  bool get complete => total > 0 && remaining == 0;

  @override
  Widget build(BuildContext context) => GuideStaticGlass(
    radius: 28,
    compact: true,
    tint: const Color(0xFFB9E1DE),
    glow: const Color(0x3870BFB8),
    highlightTint: const Color(0xE6FFFFFF),
    padding: const EdgeInsets.all(15),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Expanded(child: Text('Tiến độ điểm danh', style: TextStyle(
            fontSize: 14, fontWeight: FontWeight.w700, color: ink,
          ))),
          Text('$recorded / $total', style: const TextStyle(
            fontSize: 16, color: deepTeal, fontWeight: FontWeight.w700,
          )),
        ]),
        const SizedBox(height: 12),
        Semantics(
          label: 'Tiến độ điểm danh',
          value: '$recorded trên $total hành khách',
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              key: const ValueKey('attendance-progress-bar'),
              height: 10,
              child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                if (present > 0)
                  Expanded(flex: present, child: const ColoredBox(
                    key: ValueKey('attendance-present-segment'), color: deepTeal,
                  )),
                if (absent > 0)
                  Expanded(flex: absent, child: const ColoredBox(
                    key: ValueKey('attendance-absent-segment'), color: _absentColor,
                  )),
                if (remaining > 0 || total == 0)
                  Expanded(flex: total == 0 ? 1 : remaining, child: const ColoredBox(
                    key: ValueKey('attendance-pending-segment'), color: Color(0xFFDCEBE7),
                  )),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 12,
          runSpacing: 6,
          children: [
            _Legend(color: deepTeal, text: '$present có mặt'),
            _Legend(color: _absentColor, text: '$absent vắng mặt'),
            _Legend(color: muted, text: '$remaining chưa xử lý'),
          ],
        ),
      ],
    ),
  );
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.text});
  final Color color;
  final String text;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(width: 7, height: 7, decoration: BoxDecoration(
        color: color, shape: BoxShape.circle,
      )),
      const SizedBox(width: 5),
      Text(text, style: const TextStyle(fontSize: 12, color: muted)),
    ],
  );
}
