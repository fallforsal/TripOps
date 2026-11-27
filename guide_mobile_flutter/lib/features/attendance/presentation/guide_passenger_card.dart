import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../domain/passenger_contact.dart';

const _absentInk = Color(0xFF963F48);
const _pendingInk = Color(0xFF87601C);
const _absentTint = Color(0xFFF2CDD2);

/// Compact, presentation-only passenger card. All mutations remain with the
/// screen and its server-confirmed booking detail.
class GuidePassengerCard extends StatelessWidget {
  const GuidePassengerCard({
    super.key,
    required this.passenger,
    required this.canRecord,
    required this.busy,
    required this.actionsLocked,
    required this.onStatusChanged,
    required this.onEditNote,
    required this.onCopyPhone,
    required this.onCallPhone,
  });

  final Passenger passenger;
  final bool canRecord, busy, actionsLocked;
  final ValueChanged<String> onStatusChanged;
  final VoidCallback onEditNote;
  final ValueChanged<String> onCopyPhone, onCallPhone;

  @override
  Widget build(BuildContext context) {
    final p = passenger;
    final phone = passengerPhone(p.phone);
    final note = p.statusNote?.trim() ?? '';
    final enabled = canRecord && !actionsLocked && !busy;
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero : const Duration(milliseconds: 180);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GuideGlass(
        radius: 28,
        blurSigma: 0,
        shadow: false,
        tint: const Color(0xB8FFFFFF),
        highlightTint: const Color(0xF0FFFFFF),
        padding: const EdgeInsets.all(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(child: Text(p.name, style: const TextStyle(
                fontSize: 16, fontWeight: FontWeight.w700, color: ink,
              ))),
              const SizedBox(width: 8),
              Flexible(child: _PassengerStatus(status: p.status)),
            ]),
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.phone_outlined, size: 17, color: muted),
              const SizedBox(width: 6),
              Expanded(child: Text(phone ?? 'Chưa cập nhật',
                key: ValueKey('passenger-phone-${p.id}'),
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                  color: phone == null ? muted : ink),
              )),
              if (phone != null) ...[
                _ContactButton(
                  buttonKey: ValueKey('passenger-copy-${p.id}'),
                  tooltip: 'Sao chép số điện thoại',
                  icon: Icons.copy_rounded,
                  color: muted,
                  onPressed: () => onCopyPhone(phone),
                ),
                const SizedBox(width: 4),
                _ContactButton(
                  buttonKey: ValueKey('passenger-call-${p.id}'),
                  tooltip: 'Gọi hành khách',
                  icon: Icons.call_outlined,
                  color: deepTeal,
                  onPressed: dialablePassengerPhone(p.phone) == null
                      ? null : () => onCallPhone(phone),
                ),
              ],
            ]),
            const SizedBox(height: 8),
            GuideGlass(
              radius: 28,
              blurSigma: 0,
              shadow: false,
              tint: const Color(0x80C7DCDC),
              highlightTint: const Color(0xA6E3ECEC),
              padding: const EdgeInsets.all(3),
              child: Row(children: [
                Expanded(child: _AttendanceSegment(
                  buttonKey: ValueKey('passenger-present-${p.id}'),
                  label: 'Có mặt', icon: Icons.check_rounded,
                  selected: p.status == 'CheckedIn',
                  accent: deepTeal, tint: const Color(0xFFE5F5EF),
                  duration: duration,
                  onPressed: enabled && p.status != 'CheckedIn'
                      ? () => onStatusChanged('CheckedIn') : null,
                )),
                Expanded(child: _AttendanceSegment(
                  buttonKey: ValueKey('passenger-absent-${p.id}'),
                  label: 'Vắng mặt', icon: Icons.close_rounded,
                  selected: p.status == 'Absent',
                  accent: _absentInk, tint: const Color(0xFFFCE8E9),
                  duration: duration,
                  onPressed: enabled && p.status != 'Absent'
                      ? () => onStatusChanged('Absent') : null,
                )),
              ]),
            ),
            if (busy) ...[
              const SizedBox(height: 8),
              const LinearProgressIndicator(minHeight: 3),
              const SizedBox(height: 4),
              const Text('Đang cập nhật…', style: TextStyle(fontSize: 12, color: muted)),
            ],
            if (canRecord)
              SizedBox(
                width: double.infinity,
                child: Wrap(alignment: WrapAlignment.spaceBetween, children: [
                TextButton.icon(
                  key: ValueKey('passenger-note-${p.id}'),
                  style: _secondaryStyle,
                  onPressed: enabled ? onEditNote : null,
                  icon: const Icon(Icons.edit_note_rounded, size: 18),
                  label: Text(note.isEmpty ? 'Thêm ghi chú' : 'Sửa ghi chú'),
                ),
                if (p.status != 'Pending')
                  TextButton.icon(
                    key: ValueKey('passenger-reset-${p.id}'),
                    style: _secondaryStyle,
                    onPressed: enabled ? () => onStatusChanged('Pending') : null,
                    icon: const Icon(Icons.restart_alt_rounded, size: 16),
                    label: const Text('Đặt lại'),
                  ),
                ]),
              )
            else
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('Chỉ xem · Không thể chỉnh sửa', style: TextStyle(
                  fontSize: 12, color: muted,
                )),
              ),
            if (note.isNotEmpty) ...[
              const SizedBox(height: 4),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: const Color(0xBFFFFFFF),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white),
                ),
                child: Text('Ghi chú HDV: $note', style: const TextStyle(
                  fontSize: 12, color: ink,
                )),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static final _secondaryStyle = TextButton.styleFrom(
    foregroundColor: muted,
    minimumSize: const Size(0, 44),
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
  );
}

class _PassengerStatus extends StatelessWidget {
  const _PassengerStatus({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, icon, color, tint) = switch (status) {
      'CheckedIn' => ('Có mặt', Icons.check_circle_outline, deepTeal, const Color(0xFFAEDFD6)),
      'Absent' => ('Vắng mặt', Icons.cancel_outlined, _absentInk, _absentTint),
      _ => ('Chưa điểm danh', Icons.schedule_rounded, _pendingInk, const Color(0xFFF0D8A4)),
    };
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white),
        gradient: LinearGradient(
          begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [Color.lerp(Colors.white, tint, 0.18)!, Color.lerp(Colors.white, tint, 0.72)!],
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Flexible(child: Text(label, style: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w600, color: color,
          ))),
        ]),
      ),
    );
  }
}

class _ContactButton extends StatelessWidget {
  const _ContactButton({
    required this.buttonKey, required this.tooltip,
    required this.icon, required this.color, required this.onPressed,
  });
  final Key buttonKey;
  final String tooltip;
  final IconData icon;
  final Color color;
  final VoidCallback? onPressed;
  @override
  Widget build(BuildContext context) => IconButton(
    key: buttonKey,
    tooltip: tooltip,
    onPressed: onPressed,
    style: IconButton.styleFrom(
      foregroundColor: color,
      backgroundColor: const Color(0xBFFFFFFF),
      minimumSize: const Size(48, 48),
      padding: const EdgeInsets.all(10),
      shape: const CircleBorder(side: BorderSide(color: Colors.white)),
    ),
    icon: Icon(icon, size: 19),
  );
}

class _AttendanceSegment extends StatelessWidget {
  const _AttendanceSegment({
    required this.buttonKey, required this.label, required this.icon,
    required this.selected, required this.accent, required this.tint,
    required this.duration, required this.onPressed,
  });
  final Key buttonKey;
  final String label;
  final IconData icon;
  final bool selected;
  final Color accent, tint;
  final Duration duration;
  final VoidCallback? onPressed;
  @override
  Widget build(BuildContext context) {
    final foreground = selected ? accent : muted;
    return Semantics(
      selected: selected,
      child: AnimatedContainer(
        duration: duration,
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          color: selected ? tint : Colors.transparent,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: selected ? Colors.white : Colors.transparent),
        ),
        child: TextButton(
          key: buttonKey,
          onPressed: onPressed,
          style: TextButton.styleFrom(
            foregroundColor: foreground,
            disabledForegroundColor: foreground,
            minimumSize: const Size(0, 44),
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 6),
            shape: const StadiumBorder(),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, size: 16),
            const SizedBox(width: 4),
            Flexible(child: Text(label, textAlign: TextAlign.center, style: TextStyle(
              fontSize: 13, fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            ))),
          ]),
        ),
      ),
    );
  }
}
