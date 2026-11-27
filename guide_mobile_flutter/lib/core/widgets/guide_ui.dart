import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Shared presentation-only widgets. No hard-coded tour or passenger data.
class GuideSectionTitle extends StatelessWidget {
  const GuideSectionTitle(this.title, {super.key, this.trailing, this.onTap});
  final String title;
  final String? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(child: Text(title, style: const TextStyle(
        fontSize: 17, fontWeight: FontWeight.w800, color: ink,
      ))),
      if (trailing != null)
        TextButton(onPressed: onTap, child: Text(trailing!,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800))),
    ],
  );
}

class GuideInfoBanner extends StatelessWidget {
  const GuideInfoBanner({
    super.key, required this.message,
    this.icon = Icons.check_circle_outline,
    this.warning = false,
  });
  final String message;
  final IconData icon;
  final bool warning;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: warning ? const Color(0xFFFFF7EC) : const Color(0xFFECF8F4),
      border: Border.all(
        color: warning ? const Color(0xFFFFE3C2) : const Color(0xFFD2EEE5),
      ),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 17, color: warning ? const Color(0xFFAE6B25) : deepTeal),
      const SizedBox(width: 10),
      Expanded(child: Text(message, style: TextStyle(
        fontSize: 12,
        height: 1.48,
        color: warning ? const Color(0xFF916033) : const Color(0xFF497E77),
      ))),
    ]),
  );
}

class GuideMetric extends StatelessWidget {
  const GuideMetric({
    super.key, required this.icon, required this.value, required this.label,
    this.iconColor = teal, this.tint = paleTeal,
  });
  final IconData icon;
  final String value;
  final String label;
  final Color iconColor;
  final Color tint;

  @override
  Widget build(BuildContext context) => Container(
    constraints: const BoxConstraints(minHeight: 112),
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: line),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        height: 28, width: 28,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(9), color: tint,
        ),
        child: Icon(icon, size: 16, color: iconColor),
      ),
      const SizedBox(height: 9),
      FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Text(value, style: const TextStyle(
          fontSize: 20, fontWeight: FontWeight.w900, color: ink,
        )),
      ),
      const SizedBox(height: 3),
      Text(label, style: const TextStyle(
        fontSize: 10, height: 1.3, color: muted, fontWeight: FontWeight.w600,
      )),
    ]),
  );
}

class GuideActionTile extends StatelessWidget {
  const GuideActionTile({
    super.key, required this.icon, required this.title,
    required this.onTap, this.subtitle,
  });
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(15),
      side: const BorderSide(color: line),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 23, color: teal),
            const SizedBox(height: 10),
            Text(title, style: const TextStyle(
              fontSize: 12, fontWeight: FontWeight.w800, color: ink,
            )),
            if (subtitle != null) ...[
              const SizedBox(height: 3),
              Text(subtitle!, style: const TextStyle(
                fontSize: 10, height: 1.3, color: muted,
              )),
            ],
          ],
        ),
      ),
    ),
  );
}

class GuideStatusPill extends StatelessWidget {
  const GuideStatusPill(this.text, {super.key,
    this.background = paleTeal, this.foreground = deepTeal});
  final String text;
  final Color background, foreground;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
    decoration: BoxDecoration(color: background,
      borderRadius: BorderRadius.circular(8)),
    child: Text(text, style: TextStyle(
      color: foreground, fontSize: 10, fontWeight: FontWeight.w800,
    )),
  );
}

class GuideHero extends StatelessWidget {
  const GuideHero({
    super.key, required this.title, required this.label,
    this.subtitle, this.actionLabel, this.onTap,
    this.compact = false,
  });
  final String title, label;
  final String? subtitle, actionLabel;
  final VoidCallback? onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: [Color(0xFF173F56), Color(0xFF137D78)],
      ),
      borderRadius: BorderRadius.circular(19),
    ),
    child: Stack(children: [
      Positioned(right: -36, top: -54, child: Container(
        width: 164, height: 164,
        decoration: BoxDecoration(shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.12),
            width: 1.2)),
      )),
      Positioned(right: -65, top: 40, child: Container(
        width: 174, height: 174,
        decoration: BoxDecoration(shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.10),
            width: 1.2)),
      )),
      Padding(
        padding: EdgeInsets.all(compact ? 18 : 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(7),
              ),
              child: Text(label.toUpperCase(), style: const TextStyle(
                color: Colors.white, fontSize: 10,
                fontWeight: FontWeight.w800, letterSpacing: 0.35,
              )),
            ),
            const SizedBox(height: 14),
            Text(title, style: TextStyle(
              fontSize: compact ? 20 : 23, color: Colors.white,
              fontWeight: FontWeight.w900, height: 1.14,
            )),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(subtitle!, style: const TextStyle(
                fontSize: 12, height: 1.4, color: Color(0xFFD5ECEB),
              )),
            ],
            if (actionLabel != null && onTap != null) ...[
              const SizedBox(height: 19),
              TextButton.icon(
                style: TextButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: deepTeal,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 13, vertical: 10,
                  ),
                ),
                onPressed: onTap,
                label: Text(actionLabel!, style: const TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w800,
                )),
                icon: const Icon(Icons.arrow_forward, size: 15),
                iconAlignment: IconAlignment.end,
              ),
            ],
          ],
        ),
      ),
    ]),
  );
}

class GuideEmptyState extends StatelessWidget {
  const GuideEmptyState({
    super.key, required this.title, required this.message,
    this.icon = Icons.route_outlined,
  });
  final String title, message;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(17),
      border: Border.all(color: line),
    ),
    child: Column(children: [
      Container(
        height: 48, width: 48,
        decoration: const BoxDecoration(
          color: paleTeal, shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 23, color: teal),
      ),
      const SizedBox(height: 13),
      Text(title, style: const TextStyle(
        fontWeight: FontWeight.w800, color: ink, fontSize: 15,
      )),
      const SizedBox(height: 6),
      Text(message, textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 12, color: muted, height: 1.45,
        )),
    ]),
  );
}

/// Opens a modal text-input dialog whose [TextEditingController] lifecycle is
/// bound to the dialog widget's [State] so it is disposed only after the route
/// exit transition finishes.
Future<String?> showGuideTextInputDialog({
  required BuildContext context,
  required String title,
  required String hintText,
  String initialValue = '',
  String confirmLabel = 'Lưu',
  int maxLines = 3,
  int maxLength = 500,
}) => showDialog<String>(
  context: context,
  builder: (_) => _GuideTextInputDialog(
    title: title,
    hintText: hintText,
    initialValue: initialValue,
    confirmLabel: confirmLabel,
    maxLines: maxLines,
    maxLength: maxLength,
  ),
);

class _GuideTextInputDialog extends StatefulWidget {
  const _GuideTextInputDialog({
    required this.title,
    required this.hintText,
    required this.initialValue,
    required this.confirmLabel,
    required this.maxLines,
    required this.maxLength,
  });

  final String title;
  final String hintText;
  final String initialValue;
  final String confirmLabel;
  final int maxLines;
  final int maxLength;

  @override
  State<_GuideTextInputDialog> createState() => _GuideTextInputDialogState();
}

class _GuideTextInputDialogState extends State<_GuideTextInputDialog> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _close([String? result]) {
    FocusScope.of(context).unfocus();
    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(
      widget.title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
    ),
    content: TextField(
      controller: _controller,
      maxLines: widget.maxLines,
      maxLength: widget.maxLength,
      decoration: InputDecoration(
        hintText: widget.hintText,
        border: const OutlineInputBorder(),
      ),
    ),
    actions: [
      TextButton(onPressed: () => _close(), child: const Text('Hủy')),
      FilledButton(
        onPressed: () => _close(_controller.text),
        child: Text(widget.confirmLabel),
      ),
    ],
  );
}
