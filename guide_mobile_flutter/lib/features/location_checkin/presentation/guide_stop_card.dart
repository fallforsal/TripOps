import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../assigned_tours/domain/booking_models.dart';
import 'location_evidence_gallery.dart';

const _blue = Color(0xFF315F91);
const _amber = Color(0xFF87601C);
const _red = Color(0xFF963F48);

enum _StopVisual { waiting, ready, visiting, completed, skipped }

extension on _StopVisual {
  String get label => switch (this) {
    _StopVisual.waiting => 'Đang khóa',
    _StopVisual.ready => 'Đến lượt',
    _StopVisual.visiting => 'Đã check-in',
    _StopVisual.completed => 'Đã check-out',
    _StopVisual.skipped => 'Đã bỏ qua',
  };
  Color get color => switch (this) {
    _StopVisual.waiting => muted,
    _StopVisual.ready || _StopVisual.completed => deepTeal,
    _StopVisual.visiting => _blue,
    _StopVisual.skipped => _amber,
  };
  Color get tint => switch (this) {
    _StopVisual.waiting => const Color(0xFFDCE5EA),
    _StopVisual.ready || _StopVisual.completed => const Color(0xFFB9E1DE),
    _StopVisual.visiting => const Color(0xFFCFE0F7),
    _StopVisual.skipped => const Color(0xFFF2E1BE),
  };
  IconData get icon => switch (this) {
    _StopVisual.waiting => Icons.lock_outline_rounded,
    _StopVisual.ready => Icons.place_outlined,
    _StopVisual.visiting => Icons.pin_drop_outlined,
    _StopVisual.completed => Icons.check_rounded,
    _StopVisual.skipped => Icons.skip_next_rounded,
  };
}

class LocationDayHeading extends StatelessWidget {
  const LocationDayHeading({super.key, required this.day});
  final TourDay day;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 6, bottom: 12),
    child: Row(children: [
      GuideGlass(
        radius: 24, blurSigma: 0, shadow: false,
        tint: const Color(0xFFB9E1DE),
        child: SizedBox(width: 42, height: 42, child: Center(
          child: Text('${day.dayNumber}'.padLeft(2, '0'), style: const TextStyle(
            fontSize: 17, color: deepTeal, fontWeight: FontWeight.w700,
          )),
        )),
      ),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Ngày ${day.dayNumber} · ${day.stops.length} điểm dừng',
          style: const TextStyle(fontSize: 12, color: muted)),
        Text(day.title, style: const TextStyle(
          fontSize: 16, fontWeight: FontWeight.w700, color: ink,
        )),
      ])),
    ]),
  );
}

class GuideStopCard extends StatelessWidget {
  const GuideStopCard({
    super.key,
    required this.stop, required this.order, required this.last,
    required this.dateAllowed, required this.isNext,
    required this.canCheck, required this.canCheckout,
    required this.busy, required this.expanded, required this.onExpand,
    required this.onCheck, required this.onCheckout, required this.onSkip,
    required this.onIncident, required this.cache, this.error, this.onRetry,
  });
  final TourStop stop;
  final int order;
  final bool last, dateAllowed, isNext, canCheck, canCheckout, busy, expanded;
  final VoidCallback onExpand, onCheck, onCheckout, onSkip, onIncident;
  final LocationPhotoCache cache;
  final String? error;
  final VoidCallback? onRetry;

  _StopVisual get _visual => switch (stop.status) {
    'CheckedOut' => _StopVisual.completed,
    'Skipped' => _StopVisual.skipped,
    'CheckedIn' => _StopVisual.visiting,
    _ => dateAllowed && isNext ? _StopVisual.ready : _StopVisual.waiting,
  };

  @override
  Widget build(BuildContext context) {
    final state = _visual;
    final active = dateAllowed && isNext &&
        (state == _StopVisual.ready || state == _StopVisual.visiting);
    final terminal = state == _StopVisual.completed || state == _StopVisual.skipped;
    final photos = stop.photoUrls.length + stop.checkoutPhotoUrls.length;
    final hasNote = (stop.checkinNote?.trim().isNotEmpty ?? false) ||
        (stop.checkoutNote?.trim().isNotEmpty ?? false);
    final hasProof = photos > 0 || hasNote || stop.checkoutAt != null;
    final reason = switch (state) {
      _StopVisual.completed => 'Đã hoàn thành check-out',
      _StopVisual.skipped => 'Đã bỏ qua điểm này',
      _StopVisual.visiting when !dateAllowed => 'Chỉ xem · Tour không cho phép check-out',
      _StopVisual.visiting when !isNext => 'Chờ backend cho phép check-out',
      _StopVisual.visiting => 'Đang ở điểm này · cần check-out',
      _StopVisual.ready => 'Sẵn sàng check-in hoặc bỏ qua',
      _StopVisual.waiting when !dateAllowed => 'Chưa đến ngày khởi hành hoặc tour đã khóa',
      _StopVisual.waiting => 'Cần check-out điểm trước đó',
    };
    final time = stop.time;
    final content = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 6, runSpacing: 6,
        children: [
          Text('Điểm ${order.toString().padLeft(2, '0')}'
              '${time == null ? '' : ' · ${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(time), alwaysUse24HourFormat: true)}'}',
            style: const TextStyle(fontSize: 12, color: muted)),
          _StatusCapsule(state: state),
        ],
      ),
      const SizedBox(height: 7),
      Text(stop.name, style: TextStyle(
        fontSize: active ? 19 : 16, fontWeight: FontWeight.w700, color: ink,
      )),
      const SizedBox(height: 5),
      Text(reason, style: const TextStyle(fontSize: 12, color: muted)),
      if (active) ...[
        const SizedBox(height: 12),
        GlassStopAction(
          actionKey: ValueKey('${state == _StopVisual.visiting ? 'checkout' : 'checkin'}-${stop.id}'),
          label: state == _StopVisual.visiting ? 'Check-out điểm đến' : 'Check-in điểm đến',
          icon: Icons.camera_alt_outlined,
          color: state.color,
          primary: true,
          onPressed: state == _StopVisual.visiting
              ? (canCheckout ? onCheckout : null)
              : (canCheck ? onCheck : null),
        ),
      ],
      if (error != null) ...[
        const SizedBox(height: 10),
        LocationWarningBanner(
          icon: Icons.error_outline, title: 'Không thể xác nhận thao tác',
          message: error!, isError: true,
        ),
        if (onRetry != null)
          TextButton.icon(
            key: ValueKey('retry-${stop.id}'),
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Thử lại · Giữ ảnh và ghi chú'),
          ),
      ],
      if (busy) ...[
        const SizedBox(height: 10),
        const LinearProgressIndicator(minHeight: 3),
        const SizedBox(height: 5),
        const Text('Đang gửi minh chứng…', style: TextStyle(fontSize: 12, color: muted)),
      ],
      if (hasProof) ...[
        const SizedBox(height: 8),
        TextButton(
          key: ValueKey('proof-toggle-${stop.id}'),
          onPressed: onExpand,
          style: TextButton.styleFrom(
            foregroundColor: muted, padding: const EdgeInsets.symmetric(horizontal: 4),
            minimumSize: const Size(0, 44),
          ),
          child: Row(children: [
            const Icon(Icons.photo_library_outlined, size: 18),
            const SizedBox(width: 6),
            Expanded(child: Text(expanded ? 'Thu gọn minh chứng'
                : '${photos > 0 ? '$photos ảnh' : 'Minh chứng'}${hasNote ? ' · Ghi chú' : ''}')),
            Icon(expanded ? Icons.expand_less : Icons.expand_more),
          ]),
        ),
        if (expanded)
          LocationEvidenceGallery(stop: stop, cache: cache),
      ],
      const SizedBox(height: 4),
      Row(children: [
        if (active && state == _StopVisual.ready) ...[
          Expanded(child: GlassStopAction(
            actionKey: ValueKey('skip-${stop.id}'), label: 'Bỏ qua',
            icon: Icons.skip_next_rounded, color: muted,
            onPressed: canCheck ? onSkip : null,
          )),
          const SizedBox(width: 6),
        ],
        Expanded(child: GlassStopAction(
          actionKey: ValueKey('incident-${stop.id}'),
          label: 'Báo sự cố', icon: Icons.report_problem_outlined,
          color: _amber, onPressed: busy ? null : onIncident,
        )),
      ]),
    ]);
    final surface = active
        ? GuideStaticGlass(
            radius: 26, compact: true, tint: state.tint,
            glow: state.color.withValues(alpha: 0.18),
            padding: const EdgeInsets.all(13), child: content,
          )
        : GuideGlass(
            radius: 24, blurSigma: 0, shadow: false,
            tint: terminal ? const Color(0xCCFFFFFF) : const Color(0xA6FFFFFF),
            padding: const EdgeInsets.all(12), child: content,
          );
    return Stack(children: [
      if (!last)
        Positioned(top: 24, bottom: 0, left: 12, child: Container(
          width: 2, color: terminal ? const Color(0xFF9FCFC5) : const Color(0xFFC6D8DA),
        )),
      Padding(padding: const EdgeInsets.only(left: 34, bottom: 12), child: surface),
      Positioned(top: 15, left: 0, child: Container(
        width: 26, height: 26,
        decoration: BoxDecoration(
          color: state.tint, shape: BoxShape.circle,
          border: Border.all(color: active ? state.color : Colors.white, width: 1.5),
        ),
        child: Icon(state.icon, size: 16, color: state.color),
      )),
    ]);
  }
}

class _StatusCapsule extends StatelessWidget {
  const _StatusCapsule({required this.state});
  final _StopVisual state;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: Colors.white),
      gradient: LinearGradient(
        begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: [Color.lerp(Colors.white, state.tint, 0.2)!,
          Color.lerp(Colors.white, state.tint, 0.8)!],
      ),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Text(state.label, style: TextStyle(
        fontSize: 12, color: state.color, fontWeight: FontWeight.w600,
      )),
    ),
  );
}

class GlassStopAction extends StatelessWidget {
  const GlassStopAction({
    super.key, required this.actionKey, required this.label, required this.icon,
    required this.color, required this.onPressed, this.primary = false,
  });
  final Key actionKey;
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback? onPressed;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: const Color(0xEFFFFFFF)),
        gradient: LinearGradient(
          begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: primary && enabled
              ? [Color.lerp(color, Colors.white, 0.13)!, color]
              : const [Color(0xE6FFFFFF), Color(0x80E1EFED)],
        ),
      ),
      child: TextButton(
        key: actionKey,
        onPressed: onPressed,
        style: TextButton.styleFrom(
          foregroundColor: primary && enabled ? Colors.white : color,
          disabledForegroundColor: const Color(0xFF87999C),
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          shape: const StadiumBorder(),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 17),
          const SizedBox(width: 5),
          Flexible(child: Text(label, textAlign: TextAlign.center, style: const TextStyle(
            fontSize: 13, fontWeight: FontWeight.w600,
          ))),
        ]),
      ),
    );
  }
}

class LocationWarningBanner extends StatelessWidget {
  const LocationWarningBanner({
    super.key, required this.icon, required this.title, required this.message,
    this.isError = false,
  });
  final IconData icon;
  final String title, message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final color = isError ? _red : _amber;
    return GuideGlass(
      radius: 19, blurSigma: 0, shadow: false,
      tint: isError ? const Color(0xD9F2CDD2) : const Color(0xD9F2E1BE),
      padding: const EdgeInsets.all(12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: color, size: 21),
        const SizedBox(width: 9),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(message, style: TextStyle(color: color, fontSize: 12, height: 1.35)),
        ])),
      ]),
    );
  }
}
