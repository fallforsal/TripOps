import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'guide_glass.dart';

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
        fontSize: 21, fontWeight: FontWeight.w700, color: ink,
      ))),
      if (trailing != null)
        TextButton(onPressed: onTap, child: Text(trailing!,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
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
        fontSize: 13,
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
      color: const Color(0xDFFFFFFF),
      borderRadius: BorderRadius.circular(24),
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
          fontSize: 24, fontWeight: FontWeight.w700, color: ink,
        )),
      ),
      const SizedBox(height: 3),
      Text(label, style: const TextStyle(
        fontSize: 13, height: 1.3, color: muted, fontWeight: FontWeight.w600,
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
    color: const Color(0xEFFFFFFF),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(23),
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
              fontSize: 13, fontWeight: FontWeight.w600, color: ink,
            )),
            if (subtitle != null) ...[
              const SizedBox(height: 3),
              Text(subtitle!, style: const TextStyle(
                fontSize: 13, height: 1.3, color: muted,
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
      borderRadius: BorderRadius.circular(20)),
    child: Text(text, style: TextStyle(
      color: foreground, fontSize: 13, fontWeight: FontWeight.w600,
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
  Widget build(BuildContext context) => GuideGlass(
    radius: 30,
    blurSigma: 0,
    padding: EdgeInsets.zero,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(30),
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Color(0xFFF5FCFC), Color(0xFFB9E1DE), Color(0xFFDCE7F6)],
          ),
        ),
        child: Stack(children: [
          Positioned(right: -45, top: -70, child: Container(
            width: 200, height: 200,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x8870BFB8)),
          )),
          Positioned(right: 10, bottom: -70, child: Container(
            width: 170, height: 170,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x90FFFFFF)),
          )),
          GuideGlass(
            radius: 30,
            shadow: false,
            blurSigma: 20,
            tint: const Color(0x60FFFFFF),
            padding: EdgeInsets.all(compact ? 20 : 24),
            child: SizedBox(
              width: double.infinity,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                GuideStatusPill(label, background: const Color(0xD9FFFFFF), foreground: deepTeal),
                const SizedBox(height: 16),
                Text(title, style: TextStyle(fontSize: compact ? 22 : 28,
                  color: ink, fontWeight: FontWeight.w700, height: 1.16, letterSpacing: -0.6)),
                if (subtitle != null) ...[
                  const SizedBox(height: 9),
                  Text(subtitle!, style: const TextStyle(fontSize: 14, height: 1.4, color: muted)),
                ],
                if (actionLabel != null && onTap != null) ...[
                  const SizedBox(height: 20),
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      backgroundColor: const Color(0xEFFFFFFF),
                      foregroundColor: deepTeal,
                      minimumSize: const Size(0, 48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    ),
                    onPressed: onTap,
                    label: Text(actionLabel!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    icon: const Icon(Icons.arrow_forward_ios_rounded, size: 15),
                    iconAlignment: IconAlignment.end,
                  ),
                ],
              ]),
            ),
          ),
        ]),
      ),
    ),
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
      color: Colors.white, borderRadius: BorderRadius.circular(24),
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
        fontWeight: FontWeight.w600, color: ink, fontSize: 15,
      )),
      const SizedBox(height: 6),
      Text(message, textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 13, color: muted, height: 1.45,
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
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
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
