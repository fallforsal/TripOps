import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../auth/domain/guide_account.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key, required this.account, required this.onLogout,
  });

  final GuideAccount account;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) => ListView(
    physics: const AlwaysScrollableScrollPhysics(),
    padding: const EdgeInsets.all(18),
    children: [
      const CircleAvatar(radius: 33, child: Icon(Icons.person, size: 35)),
      space(),
      Text(account.name, textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 23, fontWeight: FontWeight.bold)),
      Text(account.email, textAlign: TextAlign.center,
        style: const TextStyle(color: muted)),
      space(20),
      Card(child: Column(children: [
        ListTile(leading: const Icon(Icons.badge_outlined),
          title: const Text('Vai trò'), subtitle: Text(account.role)),
        ListTile(leading: const Icon(Icons.phone_outlined),
          title: const Text('Số điện thoại'),
          subtitle: Text(account.phone ?? 'Chưa cập nhật')),
      ])),
      space(),
      OutlinedButton.icon(onPressed: onLogout,
        icon: const Icon(Icons.logout), label: const Text('Đăng xuất')),
    ],
  );
}
