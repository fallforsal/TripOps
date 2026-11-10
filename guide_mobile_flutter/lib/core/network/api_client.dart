import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

const defaultApiUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:5080',
);

class ApiFailure implements Exception {
  const ApiFailure(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// ASP.NET Core issues TripOps.Session as an HttpOnly session cookie.
/// CookieManager stores and replays that cookie, not a fabricated JWT.
class TripOpsApi {
  TripOpsApi._(this._dio, this._jar);

  final Dio _dio;
  final PersistCookieJar _jar;

  static Future<TripOpsApi> create({String baseUrl = defaultApiUrl}) async {
    final uri = Uri.tryParse(baseUrl.trim());
    if (uri == null ||
        (uri.scheme != 'http' && uri.scheme != 'https') ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment) {
      throw const ApiFailure('API_BASE_URL không hợp lệ.');
    }

    final dir = await getApplicationSupportDirectory();
    final jar = PersistCookieJar(
      ignoreExpires: false,
      persistSession: true,
      storage: FileStorage('${dir.path}/tripops_guide_cookies'),
    );

    // Normalize separately instead of embedding RegExp/string literals inside
    // a second interpolated string; keeps URI construction easy to audit.
    final cleanUrl = baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final dio = Dio(
      BaseOptions(
        baseUrl: '$cleanUrl/api/v1/',
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 18),
        sendTimeout: const Duration(seconds: 18),
        headers: {'Accept': 'application/json'},
        contentType: Headers.jsonContentType,
        followRedirects: false,
      ),
    );
    dio.interceptors.add(CookieManager(jar));
    return TripOpsApi._(dio, jar);
  }

  Future<Map<String, dynamic>> getMap(
    String route, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        route,
        queryParameters: query,
      );
      return _map(response.data);
    } on DioException catch (e) {
      throw _failure(e);
    }
  }

  Future<Map<String, dynamic>> postMap(
    String route, [
    Map<String, dynamic>? body,
  ]) async {
    try {
      final response = await _dio.post<dynamic>(route, data: body);
      return _map(response.data);
    } on DioException catch (e) {
      throw _failure(e);
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post<dynamic>('auth/logout');
    } on DioException catch (e) {
      throw _failure(e);
    } finally {
      // Even on network failure, clear this device's local session.
      await _jar.deleteAll();
    }
  }

  Future<void> discardSession() => _jar.deleteAll();

  static Map<String, dynamic> _map(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw const ApiFailure('Phản hồi từ backend không đúng định dạng JSON.');
  }

  static ApiFailure _failure(DioException exception) {
    final status = exception.response?.statusCode;
    final data = exception.response?.data;
    String? serverMessage;

    if (data is Map) {
      final detail = data['detail'];
      final title = data['title'];
      if (detail is String && detail.trim().isNotEmpty) {
        serverMessage = detail;
      } else if (title is String && title.trim().isNotEmpty) {
        serverMessage = title;
      }
    }

    final fallback = switch (status) {
      400 => 'Dữ liệu gửi lên không hợp lệ.',
      401 => 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
      403 => 'Bạn không có quyền thực hiện thao tác này.',
      404 => 'Không tìm thấy dữ liệu.',
      409 => 'Trạng thái tour đã thay đổi. Vui lòng tải lại.',
      422 => 'Không thể thực hiện thao tác trong trạng thái hiện tại.',
      429 => 'Thao tác quá nhiều lần. Vui lòng thử lại sau.',
      null => 'Không thể kết nối backend. Kiểm tra địa chỉ API và mạng.',
      _ => 'Yêu cầu không thành công (HTTP $status).',
    };
    return ApiFailure(serverMessage ?? fallback, statusCode: status);
  }
}
