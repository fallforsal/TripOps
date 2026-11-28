import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'guide_glass.dart';

/// A controlled, reusable glass search field. The caller owns the query;
/// the controller only preserves editing state and selection.
class GuideSearchBar extends StatefulWidget {
  const GuideSearchBar({
    super.key,
    required this.value,
    required this.placeholder,
    required this.onChanged,
    this.fieldKey,
  });

  final String value;
  final String placeholder;
  final ValueChanged<String> onChanged;
  final Key? fieldKey;

  @override
  State<GuideSearchBar> createState() => _GuideSearchBarState();
}

class _GuideSearchBarState extends State<GuideSearchBar> {
  late final TextEditingController _controller;
  late final FocusNode _focus;
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
    _focus = FocusNode()..addListener(_onFocusChanged);
  }

  void _onFocusChanged() {
    setState(() => _focused = _focus.hasFocus);
  }

  @override
  void didUpdateWidget(covariant GuideSearchBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value && _controller.text != widget.value) {
      _controller.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.collapsed(offset: widget.value.length),
      );
    }
  }

  @override
  void dispose() {
    _focus.removeListener(_onFocusChanged);
    _focus.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _clear() {
    _controller.clear();
    widget.onChanged('');
    _focus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 150);

    return GuideGlass(
      radius: 32,
      blurSigma: 0,
      shadow: false,
      highlightTint: const Color(0xC9FFFFFF),
      tint: const Color(0x72FFFFFF),
      child: AnimatedContainer(
        duration: duration,
        curve: Curves.easeOut,
        color: _focused ? const Color(0x56FFFFFF) : Colors.transparent,
        constraints: const BoxConstraints(minHeight: 54),
        child: Padding(
          padding: const EdgeInsets.only(left: 16, right: 5),
          child: Row(
            children: [
              const Icon(Icons.search_rounded, size: 23, color: muted),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  key: widget.fieldKey,
                  controller: _controller,
                  focusNode: _focus,
                  onChanged: widget.onChanged,
                  textInputAction: TextInputAction.search,
                  onSubmitted: (_) => _focus.unfocus(),
                  style: const TextStyle(fontSize: 15, color: ink),
                  cursorColor: deepTeal,
                  decoration: InputDecoration(
                    hintText: widget.placeholder,
                    hintStyle: const TextStyle(fontSize: 15, color: muted),
                    filled: false,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    disabledBorder: InputBorder.none,
                    errorBorder: InputBorder.none,
                    focusedErrorBorder: InputBorder.none,
                  ),
                ),
              ),
              ValueListenableBuilder<TextEditingValue>(
                valueListenable: _controller,
                builder: (context, editing, _) => editing.text.isEmpty
                    ? const SizedBox(width: 10)
                    : IconButton(
                        key: const ValueKey('guide-search-clear'),
                        tooltip: 'Xóa tìm kiếm',
                        onPressed: _clear,
                        icon: const Icon(Icons.cancel, size: 20, color: muted),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
