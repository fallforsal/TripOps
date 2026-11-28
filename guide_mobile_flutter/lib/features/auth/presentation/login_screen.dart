import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../../core/widgets/view_helpers.dart';
import 'widgets/login_glass_components.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key, required this.onLogin, required this.onRetrySession,
    this.initialError, this.sessionExpired = false,
  });
  final Future<void> Function(String, String) onLogin;
  final Future<void> Function() onRetrySession;
  final String? initialError;
  final bool sessionExpired;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final form = GlobalKey<FormState>();
  final _emailKey = GlobalKey<FormFieldState<String>>();
  final _passwordKey = GlobalKey<FormFieldState<String>>();
  final email = TextEditingController();
  final password = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  late final _entrance = AnimationController(
    vsync: this, duration: const Duration(milliseconds: 500),
  );
  bool _started = false;
  bool loading = false;
  bool _restoring = false;
  bool _visiblePassword = false;
  bool _attempted = false;
  bool _hideInitialError = false;
  Object? _failure;

  bool get _locked => loading || _restoring;
  String? get _emailError => email.text.trim().contains('@') ? null : 'Nhập email hợp lệ';
  String? get _passwordError => password.text.isEmpty ? 'Nhập mật khẩu' : null;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _entrance.value = 1;
      _started = true;
    } else if (!_started) {
      _started = true;
      _entrance.forward();
    }
  }

  @override
  void didUpdateWidget(covariant LoginScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialError != widget.initialError ||
        oldWidget.sessionExpired != widget.sessionExpired) {
      _hideInitialError = false;
    }
  }

  @override
  void dispose() {
    _entrance.dispose();
    email.dispose();
    password.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  void _reveal(GlobalKey key, FocusNode focus) {
    focus.requestFocus();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final target = key.currentContext;
      if (target != null && target.mounted) {
        unawaited(Scrollable.ensureVisible(target,
          alignment: 0.25,
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero : const Duration(milliseconds: 150),
          curve: Curves.easeOutCubic,
        ));
      }
    });
  }

  Future<void> submit() async {
    if (_locked) return;
    setState(() => _attempted = true);
    if (form.currentState?.validate() != true) {
      if (_emailError != null) {
        _reveal(_emailKey, _emailFocus);
      } else {
        _reveal(_passwordKey, _passwordFocus);
      }
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      loading = true;
      _failure = null;
      _hideInitialError = true;
      _visiblePassword = false;
    });
    try {
      // The repository still trims the email; never trim or alter passwords.
      await widget.onLogin(email.text, password.text);
      if (!mounted) return;
      TextInput.finishAutofillContext(shouldSave: true);
      unawaited(HapticFeedback.lightImpact().catchError((Object _) {}));
    } catch (e) {
      if (mounted) setState(() => _failure = e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _retrySession() async {
    if (_locked) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _restoring = true;
      _failure = null;
      _visiblePassword = false;
      _hideInitialError = false;
    });
    try {
      await widget.onRetrySession();
    } catch (e) {
      if (mounted) setState(() => _failure = e);
    } finally {
      if (mounted) setState(() => _restoring = false);
    }
  }

  Widget _notice() {
    final failure = _failure;
    if (failure != null) {
      final status = failure is ApiFailure ? failure.statusCode : null;
      final message = readableError(failure);
      // A missing HTTP status alone does not prove a network error.
      final network = failure is ApiFailure && status == null &&
          message.startsWith('Không thể kết nối backend.');
      return LoginNotice(
        key: const ValueKey('login-error'),
        title: network ? 'Không thể kết nối'
          : status == 403 ? 'Không có quyền truy cập'
          : status == 429 ? 'Vui lòng thử lại sau'
          : 'Đăng nhập không thành công',
        message: message,
        icon: network ? Icons.wifi_off_rounded
          : status == 403 ? Icons.shield_outlined : Icons.error_outline,
        color: network ? const Color(0xFF315F91) : const Color(0xFF963F48),
        tint: network ? const Color(0xD9CFE0F7) : const Color(0xD9F2CDD2),
      );
    }
    final initial = widget.initialError;
    if (initial == null || _hideInitialError) return const SizedBox.shrink();
    return LoginNotice(
      key: const ValueKey('login-session-error'),
      title: widget.sessionExpired ? 'Phiên đăng nhập đã hết hạn' : 'Không thể khôi phục phiên',
      message: initial,
      icon: widget.sessionExpired ? Icons.schedule_rounded : Icons.error_outline,
      color: const Color(0xFF87601C), tint: const Color(0xD9F2E1BE),
    );
  }

  InputDecoration _decoration(String hint, IconData icon, {Widget? suffix}) {
    OutlineInputBorder border(Color color, [double width = 1]) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: BorderSide(color: color, width: width),
    );
    return InputDecoration(
      hintText: hint, prefixIcon: Icon(icon), suffixIcon: suffix,
      prefixIconColor: WidgetStateColor.resolveWith((states) =>
        states.contains(WidgetState.focused) ? deepTeal : muted),
      filled: true, fillColor: const Color(0xC9FFFFFF),
      constraints: const BoxConstraints(minHeight: 54),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      enabledBorder: border(Colors.white),
      disabledBorder: border(const Color(0xA6FFFFFF)),
      focusedBorder: border(deepTeal, 1.5),
      errorBorder: border(const Color(0xFF963F48)),
      focusedErrorBorder: border(const Color(0xFF963F48), 1.5),
    );
  }

  Widget _appear(Widget child, double begin, double end, {double offset = 0.03, bool scale = false}) {
    final animation = _entrance.drive(CurveTween(curve: Interval(begin, end, curve: Curves.easeOutCubic)));
    final result = scale
        ? ScaleTransition(scale: animation.drive(Tween<double>(begin: 0.96, end: 1)), child: child)
        : SlideTransition(position: animation.drive(Tween<Offset>(
            begin: Offset(0, offset), end: Offset.zero)), child: child);
    return FadeTransition(opacity: animation, child: result);
  }

  static const _label = TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ink);

  Widget _panel() => GuideGlass(
    radius: 32, blurSigma: 0, tint: const Color(0xA6FFFFFF),
    highlightTint: const Color(0xF2FFFFFF),
    padding: const EdgeInsets.all(18),
    child: AutofillGroup(
      // Failed or abandoned attempts must not prompt saving credentials.
      onDisposeAction: AutofillContextAction.cancel,
      child: Form(
        key: form,
        autovalidateMode: _attempted ? AutovalidateMode.onUserInteraction : AutovalidateMode.disabled,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Đăng nhập', style: TextStyle(fontSize: 20,
            fontWeight: FontWeight.w700, color: ink)),
          const SizedBox(height: 18),
          const Text('Địa chỉ email', style: _label),
          const SizedBox(height: 7),
          TextFormField(
            key: _emailKey,
            controller: email, focusNode: _emailFocus,
            enabled: !_locked, keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.username, AutofillHints.email],
            textCapitalization: TextCapitalization.none,
            autocorrect: false, enableSuggestions: false,
            textInputAction: TextInputAction.next,
            onFieldSubmitted: (_) => _passwordFocus.requestFocus(),
            decoration: _decoration('guide@example.com', Icons.mail_outline),
            validator: (_) => _emailError,
          ),
          const SizedBox(height: 15),
          const Text('Mật khẩu', style: _label),
          const SizedBox(height: 7),
          TextFormField(
            key: _passwordKey,
            controller: password, focusNode: _passwordFocus,
            enabled: !_locked, obscureText: !_visiblePassword,
            autofillHints: const [AutofillHints.password],
            autocorrect: false, enableSuggestions: false,
            textInputAction: TextInputAction.done,
            decoration: _decoration('Nhập mật khẩu', Icons.lock_outline,
              suffix: IconButton(
                key: const ValueKey('login-password-visibility'),
                tooltip: _visiblePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu',
                onPressed: _locked ? null : () => setState(() => _visiblePassword = !_visiblePassword),
                constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                icon: Icon(_visiblePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: muted),
              )),
            validator: (_) => _passwordError,
            onFieldSubmitted: (_) => submit(),
          ),
          if (_failure != null || (widget.initialError != null && !_hideInitialError)) ...[
            const SizedBox(height: 14),
            _notice(),
          ],
          const SizedBox(height: 20),
          LoginGlassButton(busy: loading, onPressed: _locked ? null : submit),
          if (widget.initialError != null)
            TextButton.icon(
              key: const ValueKey('login-retry-session'),
              onPressed: _locked ? null : _retrySession,
              icon: _restoring
                  ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.refresh_rounded, size: 18),
              label: Text(_restoring ? 'Đang khôi phục phiên...' : 'Thử khôi phục phiên'),
            ),
        ]),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    body: LoginBackground(
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 410),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                _appear(const LoginBrand(), 0.08, 0.6, scale: true),
                const SizedBox(height: 18),
                _appear(const Column(children: [
                  Text('Chào mừng trở lại', textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 30, letterSpacing: -0.8,
                      fontWeight: FontWeight.w700, color: ink)),
                  SizedBox(height: 6),
                  Text('Sẵn sàng cho hành trình tiếp theo.', textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: muted)),
                ]), 0.2, 0.68),
                const SizedBox(height: 22),
                _appear(_panel(), 0.3, 0.86),
                const SizedBox(height: 16),
                _appear(const LoginNotice(
                  title: 'Dành riêng cho hướng dẫn viên',
                  message: 'Sử dụng tài khoản được Agency cấp. Không thể tự đăng ký trên ứng dụng.',
                  icon: Icons.info_outline,
                ), 0.44, 0.92),
                const SizedBox(height: 16),
                _appear(const Text('TRIPOPS  •  TOUR OPERATIONS',
                  textAlign: TextAlign.center, style: TextStyle(color: muted,
                    fontSize: 10, letterSpacing: 1.3)), 0.52, 1),
              ]),
            ),
          ),
        ),
      ),
    ),
  );
}
