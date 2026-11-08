import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/data/auth_repository.dart';
import '../features/auth/presentation/guide_entry.dart';
import '../features/assigned_tours/data/guide_repository.dart';

class TripOpsGuideApp extends StatefulWidget {
  const TripOpsGuideApp({super.key});

  @override
  State<TripOpsGuideApp> createState() => _TripOpsGuideAppState();
}

class _TripOpsGuideAppState extends State<TripOpsGuideApp> {
  late final Future<TripOpsApi> _api = TripOpsApi.create();

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'TripOps Guide',
    debugShowCheckedModeBanner: false,
    theme: TripOpsTheme.light,
    home: FutureBuilder<TripOpsApi>(
      future: _api,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            body: Center(child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('Không thể khởi tạo ứng dụng: ${snapshot.error}'),
            )),
          );
        }
        if (!snapshot.hasData) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final api = snapshot.data!;
        return GuideEntry(auth: AuthRepository(api), guides: GuideRepository(api));
      },
    ),
  );
}
