import '../../../core/network/api_client.dart';
import '../domain/guide_account.dart';

class AuthRepository {
  AuthRepository(this.api);
  final TripOpsApi api;

  Future<GuideAccount> login(String email, String password) async {
    final json = await api.postMap('auth/login', {
      'email': email.trim(),
      'password': password,
    });
    final account = GuideAccount.fromJson(json);
    if (account.role != 'guide') {
      await api.logout();
      throw const ApiFailure('Ứng dụng này chỉ dành cho tài khoản Hướng dẫn viên (guide).', statusCode: 403);
    }
    return account;
  }

  Future<GuideAccount?> restore() async {
    try {
      final account = GuideAccount.fromJson(await api.getMap('auth/me'));
      if (account.role != 'guide') {
        await api.discardSession();
        return null;
      }
      return account;
    } on ApiFailure catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        await api.discardSession();
        return null;
      }
      rethrow;
    }
  }

  Future<void> logout() => api.logout();
}
