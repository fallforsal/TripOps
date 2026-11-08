import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
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
    body: SafeArea(child: Center(child: SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420),
        child: Form(key: form, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Icon(Icons.explore_rounded, size: 70, color: Color(0xFF087D82)),
          space(12),
          const Text('TripOps Guide', textAlign: TextAlign.center,
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: ink)),
          const Text('Đăng nhập dành cho Hướng dẫn viên', textAlign: TextAlign.center,
            style: TextStyle(color: muted)),
          space(36),
          TextFormField(controller: email, keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
            validator: (v) => v == null || !v.contains('@') ? 'Nhập email hợp lệ' : null),
          space(),
          TextFormField(controller: password, obscureText: true,
            decoration: const InputDecoration(labelText: 'Mật khẩu', prefixIcon: Icon(Icons.lock_outline)),
            validator: (v) => v == null || v.isEmpty ? 'Nhập mật khẩu' : null,
            onFieldSubmitted: (_) => submit()),
          if (widget.initialError != null || message != null) ...[
            space(),
            Text(message ?? widget.initialError!, style: const TextStyle(color: Colors.red)),
          ],
          space(20),
          FilledButton(onPressed: loading ? null : submit,
            child: Padding(padding: const EdgeInsets.all(11),
              child: loading ? const CircularProgressIndicator() : const Text('Đăng nhập'))),
          if (widget.initialError != null)
            TextButton(onPressed: widget.onRetrySession, child: const Text('Thử khôi phục phiên')),
          space(),
          const Text('Tài khoản Hướng dẫn viên do Agency cấp. Ứng dụng không tự đăng ký.',
            textAlign: TextAlign.center, style: TextStyle(color: muted)),
        ])),
      ),
    ))),
  );
}
