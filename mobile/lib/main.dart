import 'package:flutter/material.dart';
import 'api_client.dart';

void main() => runApp(const TripOpsApp());

class TripOpsApp extends StatelessWidget {
  const TripOpsApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'TripOps Guide',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
      useMaterial3: true,
    ),
    home: const ConnectionPage(),
  );
}

class ConnectionPage extends StatefulWidget {
  const ConnectionPage({super.key});
  @override
  State<ConnectionPage> createState() => _ConnectionPageState();
}

class _ConnectionPageState extends State<ConnectionPage> {
  final _api = ApiClient();
  bool _loading = false;
  String _message = 'Chưa kiểm tra.';
  Future<void> _connect() async {
    setState(() {
      _loading = true;
      _message = 'Đang kết nối…';
    });
    try {
      final result = await _api.checkHealth();
      if (!mounted) return;
      setState(
        () => _message =
            '${result.application} đã phản hồi. '
            '${result.database == 'not_configured' ? 'Database chưa cấu hình.' : 'Có cấu hình database; chưa kiểm tra SQL Server.'}',
      );
    } catch (_) {
      if (!mounted) return;
      setState(
        () => _message =
            'Không thể xác nhận kết nối. Kiểm tra API base URL, mạng và backend, rồi thử lại.',
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _api.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('TripOps Guide')),
    body: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.travel_explore, size: 48),
            const SizedBox(height: 20),
            Text(
              'Kiểm tra kết nối backend',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            const Text(
              'Ứng dụng dành riêng cho Tour Guide. Task 1 mới có khung kết nối; chưa có đăng nhập hoặc nghiệp vụ tour.',
            ),
            const SizedBox(height: 20),
            const SelectableText('$apiBaseUrl/api/v1/health'),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _loading ? null : _connect,
              icon: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.wifi_tethering),
              label: Text(_loading ? 'Đang kết nối…' : 'Kiểm tra kết nối'),
            ),
            const SizedBox(height: 20),
            Semantics(liveRegion: true, child: Text(_message)),
            const SizedBox(height: 12),
            const Text(
              'Health chỉ xác nhận API đang chạy, không xác nhận database hoặc tích hợp ngân hàng.',
            ),
          ],
        ),
      ),
    ),
  );
}
