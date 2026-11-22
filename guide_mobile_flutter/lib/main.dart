import 'package:flutter/material.dart';
import 'app/tripops_app.dart';
import 'core/notifications/guide_push_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await GuidePushService.initialize();
  runApp(const TripOpsGuideApp());
}
