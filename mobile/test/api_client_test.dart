import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tripops_guide/api_client.dart';

void main() {
  test('only valid liveness response confirms API connectivity', () async {
    final api = ApiClient(
      client: MockClient((request) async {
        expect(request.url.path, '/api/v1/health');
        return http.Response(
          '{"status":"ok","application":"TripOps.Api","database":"not_configured","scope":"api_liveness_only"}',
          200,
        );
      }),
    );
    addTearDown(api.close);
    expect((await api.checkHealth()).database, 'not_configured');
  });
  test('HTTP success with malformed data does not mean connected', () async {
    final api = ApiClient(
      client: MockClient((_) async => http.Response('{"status":"ok"}', 200)),
    );
    addTearDown(api.close);
    await expectLater(api.checkHealth(), throwsFormatException);
  });
  test('HTTP failure does not mean connected', () async {
    final api = ApiClient(
      client: MockClient((_) async => http.Response('{}', 503)),
    );
    addTearDown(api.close);
    await expectLater(api.checkHealth(), throwsException);
  });
}
