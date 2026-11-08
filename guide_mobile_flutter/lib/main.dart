import 'package:flutter/material.dart';
import 'src/api.dart';
import 'src/repositories.dart';
import 'src/screens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TripOpsGuideApp());
}

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
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF087D82),
        primary: const Color(0xFF087D82),
        surface: const Color(0xFFF7FAFC),
      ),
      scaffoldBackgroundColor: const Color(0xFFF7FAFC),
      useMaterial3: true,
      appBarTheme: const AppBarTheme(backgroundColor: Color(0xFFF7FAFC)),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(13)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      ),
    ),
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
