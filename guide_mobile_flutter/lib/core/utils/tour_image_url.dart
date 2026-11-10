import '../network/api_client.dart';

/// Tour media is returned by the backend as either an HTTPS URL or an
/// app-local /api/v1/files/tours/{owner}/{file} path.
String? resolveTourImageUrl(
  String? source, {
  String apiBaseUrl = defaultApiUrl,
}) {
  final value = source?.trim();
  if (value == null || value.isEmpty) return null;
  final uri = Uri.tryParse(value);
  if (uri == null) return null;

  if (uri.isScheme('https') && uri.host.isNotEmpty && uri.userInfo.isEmpty) {
    return uri.toString();
  }

  if (!value.startsWith('/api/v1/files/tours/')) return null;
  final base = Uri.tryParse(apiBaseUrl.trim());
  if (base == null ||
      !(base.isScheme('http') || base.isScheme('https')) ||
      base.host.isEmpty ||
      base.userInfo.isNotEmpty) {
    return null;
  }
  return base.resolve(value).toString();
}
