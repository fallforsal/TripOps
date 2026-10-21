import 'dart:convert';
import 'package:http/http.dart' as http;

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:5080',
);

class HealthResult {
  const HealthResult(this.application, this.database);
  final String application;
  final String database;
}

class ApiClient {
  ApiClient({http.Client? client, String baseUrl = apiBaseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = baseUrl;
  final http.Client _client;
  final String _baseUrl;

  Future<HealthResult> checkHealth() async {
    final base = Uri.parse(_baseUrl);
    if (!['http', 'https'].contains(base.scheme) ||
        base.host.isEmpty ||
        base.userInfo.isNotEmpty) {
      throw const FormatException(
        'API_BASE_URL phải là HTTP(S), không chứa credentials.',
      );
    }
    final uri = Uri.parse(
      '${_baseUrl.replaceAll(RegExp(r'/+$'), '')}/api/v1/health',
    );
    final response = await _client
        .get(uri, headers: {'Accept': 'application/json'})
        .timeout(const Duration(seconds: 8));
    if (response.statusCode != 200) {
      throw Exception('Backend trả HTTP ${response.statusCode}.');
    }
    final data = jsonDecode(response.body);
    if (data is! Map<String, dynamic> ||
        data['status'] != 'ok' ||
        data['scope'] != 'api_liveness_only' ||
        data['application'] is! String ||
        ![
          'not_configured',
          'configured_not_checked',
        ].contains(data['database'])) {
      throw const FormatException('Health response không đúng contract.');
    }
    return HealthResult(
      data['application'] as String,
      data['database'] as String,
    );
  }

  void close() => _client.close();
}
