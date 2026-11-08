import 'package:flutter/material.dart';
import '../network/api_client.dart';
import '../theme/app_theme.dart';

String readableError(Object error) =>
    error is ApiFailure ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';

Widget space([double height = 12]) => SizedBox(height: height);

class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(24),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.wifi_off_outlined, size: 48, color: muted),
      space(),
      Text(message, textAlign: TextAlign.center),
      space(),
      OutlinedButton(onPressed: onRetry, child: const Text('Thử lại')),
    ]),
  ));
}
