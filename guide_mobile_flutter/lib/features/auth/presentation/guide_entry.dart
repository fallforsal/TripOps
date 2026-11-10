import 'package:flutter/material.dart';
import '../../../app/guide_shell.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../data/auth_repository.dart';
import '../domain/guide_account.dart';
import 'login_screen.dart';

class GuideEntry extends StatefulWidget {
  const GuideEntry({super.key, required this.auth, required this.guides});
  final AuthRepository auth;
  final GuideRepository guides;

  @override
  State<GuideEntry> createState() => _GuideEntryState();
}

class _GuideEntryState extends State<GuideEntry> {
  GuideAccount? _account;
  bool _loading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    try {
      final account = await widget.auth.restore();
      if (!mounted) return;
      setState(() { _account = account; _errorMessage = null; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _errorMessage = readableError(e); _loading = false; });
    }
  }

  Future<void> _login(String email, String password) async {
    final account = await widget.auth.login(email, password);
    if (!mounted) return;
    setState(() { _account = account; _errorMessage = null; });
  }

  Future<void> _sessionExpired() async {
    await widget.auth.api.discardSession();
    if (!mounted) return;
    setState(() {
      _account = null;
      _errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    });
  }

  Future<void> _logout() async {
    Object? failure;
    try {
      await widget.auth.logout();
    } catch (e) { failure = e; }
    if (!mounted) return;
    setState(() => _account = null);
    if (failure != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Đã xóa phiên trên thiết bị. Server: ${readableError(failure)}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_account != null) {
      return GuideShell(account: _account!, guides: widget.guides, onLogout: _logout, onSessionExpired: _sessionExpired);
    }
    return LoginScreen(
      onLogin: _login,
      initialError: _errorMessage,
      onRetrySession: _restore,
    );
  }
}
