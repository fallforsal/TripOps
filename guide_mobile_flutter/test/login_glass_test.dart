import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripops_guide/core/network/api_client.dart';
import 'package:tripops_guide/core/theme/app_theme.dart';
import 'package:tripops_guide/features/assigned_tours/data/guide_repository.dart';
import 'package:tripops_guide/features/auth/data/auth_repository.dart';
import 'package:tripops_guide/features/auth/domain/guide_account.dart';
import 'package:tripops_guide/features/auth/presentation/guide_entry.dart';
import 'package:tripops_guide/features/auth/presentation/login_screen.dart';
import 'package:tripops_guide/features/auth/presentation/widgets/login_glass_components.dart';

final _submit = find.byKey(const ValueKey('login-submit'));
final _retry = find.byKey(const ValueKey('login-retry-session'));
final _visibility = find.byKey(const ValueKey('login-password-visibility'));
Finder get _email => find.byType(TextFormField).at(0);
Finder get _password => find.byType(TextFormField).at(1);

Future<void> _show(
  WidgetTester tester, {
  required Future<void> Function(String, String) onLogin,
  required Future<void> Function() onRetry,
  String? initialError,
  Size size = const Size(360, 760),
  bool reduceMotion = false,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
  await tester.pumpWidget(MaterialApp(
    theme: TripOpsTheme.light,
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context).copyWith(disableAnimations: reduceMotion),
      child: child!,
    ),
    home: LoginScreen(onLogin: onLogin, onRetrySession: onRetry, initialError: initialError),
  ));
  await tester.pumpAndSettle();
}

Future<void> _fill(WidgetTester tester) async {
  await tester.ensureVisible(_email);
  await tester.enterText(_email, 'guide@example.com');
  await tester.ensureVisible(_password);
  await tester.enterText(_password, ' secret with spaces ');
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
}

class _RestoreAuth implements AuthRepository {
  Completer<GuideAccount?> restoreGate = Completer<GuideAccount?>();
  int restores = 0;

  @override
  Future<GuideAccount?> restore() {
    restores++;
    return restoreGate.future;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _StubGuides implements GuideRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('glass login validates and focuses fields, password can be revealed', (tester) async {
    var calls = 0;
    await _show(tester, onLogin: (email, password) async { calls++; },
      onRetry: () async {}, size: const Size(320, 600), reduceMotion: true);
    expect(find.byType(LoginBrand), findsOneWidget);
    expect(find.byType(BackdropFilter), findsNothing);
    await tester.ensureVisible(_submit);
    await tester.tap(_submit);
    await tester.pumpAndSettle();
    expect(find.text('Nhập email hợp lệ'), findsOneWidget);
    expect(tester.widget<EditableText>(find.byType(EditableText).at(0)).focusNode.hasFocus, isTrue);
    await tester.enterText(_email, 'guide@example.com');
    await tester.testTextInput.receiveAction(TextInputAction.next);
    await tester.pumpAndSettle();
    expect(tester.widget<EditableText>(find.byType(EditableText).at(1)).focusNode.hasFocus, isTrue);
    await tester.ensureVisible(_submit);
    await tester.tap(_submit);
    await tester.pumpAndSettle();
    expect(find.text('Nhập mật khẩu'), findsOneWidget);
    expect(tester.widget<EditableText>(find.byType(EditableText).at(1)).focusNode.hasFocus, isTrue);
    await tester.enterText(_password, 'secret');
    await tester.ensureVisible(_visibility);
    expect(tester.widget<EditableText>(find.byType(EditableText).at(1)).obscureText, isTrue);
    await tester.tap(_visibility);
    await tester.pumpAndSettle();
    expect(tester.widget<EditableText>(find.byType(EditableText).at(1)).obscureText, isFalse);
    await tester.tap(_visibility);
    await tester.pumpAndSettle();
    expect(tester.widget<EditableText>(find.byType(EditableText).at(1)).obscureText, isTrue);
    expect(calls, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('login blocks duplicate requests and preserves exact password after failure', (tester) async {
    final gate = Completer<void>();
    var calls = 0;
    var retries = 0;
    String? sentEmail, sentPassword;
    await _show(tester, initialError: 'Phiên chưa khôi phục',
      onRetry: () async { retries++; },
      onLogin: (email, password) async {
        calls++;
        sentEmail = email;
        sentPassword = password;
        await gate.future;
      });
    await _fill(tester);
    await tester.ensureVisible(_submit);
    await tester.tap(_submit);
    await tester.pump();
    expect(calls, 1);
    expect(sentEmail, 'guide@example.com');
    expect(sentPassword, ' secret with spaces ');
    expect(tester.widget<FilledButton>(_submit).onPressed, isNull);
    expect(tester.widget<TextButton>(_retry).onPressed, isNull);
    expect(tester.widget<TextFormField>(_email).enabled, isFalse);
    expect(tester.widget<TextFormField>(_password).enabled, isFalse);
    gate.completeError(const ApiFailure('Tài khoản không có quyền.', statusCode: 403));
    await tester.pumpAndSettle();
    expect(find.text('Không có quyền truy cập'), findsOneWidget);
    expect(find.text('Tài khoản không có quyền.'), findsOneWidget);
    expect(tester.widget<EditableText>(find.byType(EditableText).at(1)).controller.text,
      ' secret with spaces ');
    expect(tester.widget<FilledButton>(_submit).onPressed, isNotNull);
    expect(retries, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('session restore retry disables login and preserves draft', (tester) async {
    final gate = Completer<void>();
    var calls = 0;
    await _show(tester, initialError: 'Không thể khôi phục phiên',
      onLogin: (email, password) async {},
      onRetry: () async { calls++; await gate.future; });
    await _fill(tester);
    await tester.ensureVisible(_retry);
    await tester.tap(_retry);
    await tester.pump();
    expect(calls, 1);
    expect(tester.widget<FilledButton>(_submit).onPressed, isNull);
    expect(tester.widget<TextButton>(_retry).onPressed, isNull);
    gate.complete();
    await tester.pumpAndSettle();
    expect(tester.widget<EditableText>(find.byType(EditableText).first).controller.text,
      'guide@example.com');
    expect(tester.widget<FilledButton>(_submit).onPressed, isNotNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('GuideEntry shows branded loading only while initial restore is pending', (tester) async {
    final auth = _RestoreAuth();
    await tester.pumpWidget(MaterialApp(home: GuideEntry(auth: auth, guides: _StubGuides())));
    await tester.pump();
    expect(auth.restores, 1);
    expect(find.byType(BrandedSessionLoading), findsOneWidget);
    auth.restoreGate.complete(null);
    await tester.pumpAndSettle();
    expect(find.byType(BrandedSessionLoading), findsNothing);
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(auth.restores, 1);
    expect(tester.takeException(), isNull);
  });
}
