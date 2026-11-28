import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/notifications/guide_push_service.dart';
import '../../../core/network/api_client.dart';
import '../../../app/guide_shell.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../data/auth_repository.dart';
import '../domain/guide_account.dart';
import 'login_screen.dart';
import 'widgets/login_glass_components.dart';

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
  bool _authenticating = false;
  bool _expired = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    if (_authenticating) return;
    _authenticating = true;
    try {
      final account = await widget.auth.restore();
      if (!mounted) return;
      setState(() {
        _account = account;
        _errorMessage = null;
        _expired = false;
        _loading = false;
      });
      if (account != null) unawaited(GuidePushService.attach(widget.auth.api));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = readableError(e);
        _expired = false;
        _loading = false;
      });
    } finally {
      _authenticating = false;
    }
  }

  Future<void> _login(String email, String password) async {
    if (_authenticating) {
      throw const ApiFailure('Đang xử lý xác thực. Vui lòng đợi.');
    }
    _authenticating = true;
    try {
      final account = await widget.auth.login(email, password);
      if (!mounted) return;
      setState(() {
        _account = account;
        _errorMessage = null;
        _expired = false;
      });
      unawaited(GuidePushService.attach(widget.auth.api));
    } finally {
      _authenticating = false;
    }
  }

  Future<void> _sessionExpired() async {
    await GuidePushService.detach(widget.auth.api);
    await widget.auth.api.discardSession();
    if (!mounted) return;
    setState(() {
      _account = null;
      _expired = true;
      _errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    });
  }

  Future<void> _logout() async {
    Object? failure;
    await GuidePushService.detach(widget.auth.api);
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
    if (_loading) return const BrandedSessionLoading();
    if (_account != null) {
      // Only animate the incoming authenticated screen. Never retain the
      // previous shell after logout or the password form after login.
      final reduceMotion = MediaQuery.disableAnimationsOf(context);
      return TweenAnimationBuilder<double>(
        key: const ValueKey('authenticated-guide'),
        tween: Tween<double>(begin: reduceMotion ? 1 : 0.88, end: 1),
        duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        builder: (context, value, child) => Opacity(opacity: value, child: child),
        child: GuideShell(account: _account!, guides: widget.guides,
          onLogout: _logout, onSessionExpired: _sessionExpired),
      );
    }
    return LoginScreen(
      onLogin: _login,
      initialError: _errorMessage,
      sessionExpired: _expired,
      onRetrySession: _restore,
    );
  }
}
