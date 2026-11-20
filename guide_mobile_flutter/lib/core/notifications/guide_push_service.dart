import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../network/api_client.dart';

/// FCM is opt-in by build configuration. In local builds without Firebase
/// settings the notification inbox and polling continue working normally.
class GuidePushService {
  GuidePushService._();

  static const _projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const _senderId = String.fromEnvironment('FIREBASE_SENDER_ID');
  static const _apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const _appId = String.fromEnvironment('FIREBASE_APP_ID');

  static bool get configured => _projectId.isNotEmpty &&
      _senderId.isNotEmpty && _apiKey.isNotEmpty && _appId.isNotEmpty;

  static bool initialized = false;
  static final ValueNotifier<int> inboxRevision = ValueNotifier<int>(0);
  static final StreamController<int?> _opened = StreamController<int?>.broadcast();
  static Stream<int?> get openedBooking => _opened.stream;
  static int? _pendingBooking;
  static String? _registeredToken;
  static StreamSubscription<String>? _refreshSubscription;

  static int? takePendingBooking() {
    final id = _pendingBooking;
    _pendingBooking = null;
    return id;
  }

  static int? _bookingFromMessage(RemoteMessage message) {
    final raw = message.data['bookingId'];
    final id = raw == null ? null : int.tryParse(raw);
    return id != null && id > 0 ? id : null;
  }

  static void _pushOpened(RemoteMessage message) {
    _pendingBooking = _bookingFromMessage(message);
    _opened.add(_pendingBooking);
    inboxRevision.value += 1;
  }

  static Future<void> initialize() async {
    if (!configured || !Platform.isAndroid && !Platform.isIOS) return;
    try {
      await Firebase.initializeApp(options: const FirebaseOptions(
        apiKey: _apiKey,
        appId: _appId,
        messagingSenderId: _senderId,
        projectId: _projectId,
      ));
      initialized = true;
      FirebaseMessaging.onMessage.listen((_) => inboxRevision.value += 1);
      FirebaseMessaging.onMessageOpenedApp.listen(_pushOpened);
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) _pendingBooking = _bookingFromMessage(initial);
    } catch (e) {
      // Firebase is optional. Do not block login or show credential details.
      debugPrint('FCM unavailable; using notification inbox polling.');
    }
  }

  static Future<void> attach(TripOpsApi api) async {
    if (!initialized) return;
    try {
      await FirebaseMessaging.instance.requestPermission();
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) await _register(api, token);
      await _refreshSubscription?.cancel();
      _refreshSubscription = FirebaseMessaging.instance.onTokenRefresh.listen(
        (token) => unawaited(_register(api, token)),
      );
    } catch (_) {
      debugPrint('FCM registration unavailable; retry on next login.');
    }
  }

  static Future<void> _register(TripOpsApi api, String token) async {
    try {
      await api.postVoid('notifications/devices', data: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
      _registeredToken = token;
    } catch (_) {
      // Inbox will keep working without a registered push token.
    }
  }

  static Future<void> detach(TripOpsApi api) async {
    await _refreshSubscription?.cancel();
    _refreshSubscription = null;
    final token = _registeredToken;
    _registeredToken = null;
    if (token == null) return;
    try {
      await api.deleteVoid('notifications/devices', data: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
    } catch (_) {
      // Do not block local logout if the network is unavailable.
    }
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) { }
  }
}
