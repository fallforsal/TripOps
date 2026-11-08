import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key, required this.onLogin, required this.onRetrySession, this.initialError,
  });
  final Future<void> Function(String, String) onLogin;
  final VoidCallback onRetrySession;
  final String? initialError;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final form = GlobalKey<FormState>();
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;
  String? message;

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate() || loading) return;
    setState(() { loading = true; message = null; });
    try {
      await widget.onLogin(email.text, password.text);
    } catch (e) {
      if (mounted) setState(() => message = readableError(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 410),
            child: Form(
              key: form,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(child: Container(
                    width: 75, height: 75,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [
                        Color(0xFF193E57), Color(0xFF108980),
                      ]),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Icon(Icons.explore_rounded,
                      color: Colors.white, size: 39),
                  )),
                  space(16),
                  const Text('TRIPOPS GUIDE',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: teal, fontSize: 11,
                      fontWeight: FontWeight.w900, letterSpacing: 2)),
                  space(7),
                  const Text('Chào mừng trở lại',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 26,
                      fontWeight: FontWeight.w900, color: ink)),
                  space(6),
                  const Text('Đăng nhập để quản lý hành trình và vận hành tour',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: muted)),
                  space(28),
                  Card(child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text('ĐĂNG NHẬP HƯỚNG DẪN VIÊN',
                          style: TextStyle(fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.6, color: ink)),
                        space(20),
                        const Text('Địa chỉ email',
                          style: TextStyle(fontSize: 12,
                            fontWeight: FontWeight.w800, color: ink)),
                        space(7),
                        TextFormField(
                          controller: email,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            hintText: 'guide@example.com',
                            prefixIcon: Icon(Icons.mail_outline),
                          ),
                          validator: (v) => v == null || !v.contains('@')
                            ? 'Nhập email hợp lệ' : null,
                        ),
                        space(16),
                        const Text('Mật khẩu',
                          style: TextStyle(fontSize: 12,
                            fontWeight: FontWeight.w800, color: ink)),
                        space(7),
                        TextFormField(
                          controller: password,
                          obscureText: true,
                          decoration: const InputDecoration(
                            hintText: 'Nhập mật khẩu',
                            prefixIcon: Icon(Icons.lock_outline),
                          ),
                          validator: (v) => v == null || v.isEmpty
                            ? 'Nhập mật khẩu' : null,
                          onFieldSubmitted: (_) => submit(),
                        ),
                        if (widget.initialError != null || message != null) ...[
                          space(14),
                          GuideInfoBanner(
                            message: message ?? widget.initialError!,
                            warning: true, icon: Icons.error_outline,
                          ),
                        ],
                        space(20),
                        FilledButton.icon(
                          onPressed: loading ? null : submit,
                          icon: loading ? const SizedBox(
                            height: 17, width: 17,
                            child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                          ) : const Icon(Icons.login_rounded, size: 18),
                          label: const Text('Đăng nhập'),
                        ),
                        if (widget.initialError != null)
                          TextButton(
                            onPressed: widget.onRetrySession,
                            child: const Text('Thử khôi phục phiên'),
                          ),
                      ],
                    ),
                  )),
                  space(21),
                  const GuideInfoBanner(
                    icon: Icons.info_outline,
                    message: 'Tài khoản Hướng dẫn viên được Agency cấp. Không thể tự đăng ký trên ứng dụng.',
                  ),
                  space(20),
                  const Text('TRIPOPS  •  TOUR OPERATIONS',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: muted, fontSize: 10,
                      letterSpacing: 1.3)),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
