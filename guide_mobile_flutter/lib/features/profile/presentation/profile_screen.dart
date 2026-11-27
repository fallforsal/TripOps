import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../../core/utils/tour_image_url.dart';
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
    padding: EdgeInsets.fromLTRB(20, 16, 20, 28 + MediaQuery.paddingOf(context).bottom),
    children: [
      GuideGlass(
        radius: 32,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
        child: Column(children: [
          () {
            final avatarUrl = resolveGuideAvatarUrl(account.avatar);
            return CircleAvatar(
              radius: 38,
              backgroundColor: const Color(0xFFE6F6F2),
              child: avatarUrl == null
                  ? const Icon(Icons.person_rounded, color: deepTeal, size: 40)
                  : ClipOval(
                      child: Image.network(
                        avatarUrl,
                        width: 76,
                        height: 76,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.person_rounded,
                          color: deepTeal,
                          size: 40,
                        ),
                      ),
                    ),
            );
          }(),
          space(12),
          Text(account.name, textAlign: TextAlign.center,
            style: const TextStyle(
              color: ink, fontSize: 26,
              fontWeight: FontWeight.w700,
            )),
          space(5),
          Text(account.email, textAlign: TextAlign.center,
            style: const TextStyle(
              color: muted, fontSize: 14,
            )),
          space(12),
          const GuideStatusPill('HƯỚNG DẪN VIÊN',
            background: Color(0xFFE5F7F2), foreground: deepTeal),
        ]),
      ),
      space(24),
      const GuideSectionTitle('Thông tin cá nhân'),
      space(10),
      Card(child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Column(children: [
          ListTile(
            leading: const Icon(Icons.badge_outlined, color: teal),
            title: const Text('Vai trò',
              style: TextStyle(color: muted, fontSize: 13)),
            subtitle: const Text('Hướng dẫn viên',
              style: TextStyle(color: ink, fontWeight: FontWeight.w800)),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.mail_outline, color: teal),
            title: const Text('Email',
              style: TextStyle(color: muted, fontSize: 13)),
            subtitle: Text(account.email,
              style: const TextStyle(color: ink,
                fontWeight: FontWeight.w800)),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.phone_outlined, color: teal),
            title: const Text('Số điện thoại',
              style: TextStyle(color: muted, fontSize: 13)),
            subtitle: Text(account.phone ?? 'Chưa cập nhật',
              style: const TextStyle(color: ink,
                fontWeight: FontWeight.w800)),
          ),
        ]),
      )),
      space(20),
      const GuideInfoBanner(
        icon: Icons.info_outline,
        message: 'Thông tin hồ sơ được cung cấp từ tài khoản do Agency quản lý. Chỉnh sửa hồ sơ chưa được hỗ trợ trong ứng dụng.',
      ),
      space(25),
      OutlinedButton.icon(
        onPressed: onLogout,
        icon: const Icon(Icons.logout_rounded, color: Color(0xFFCE5D5D)),
        label: const Text('Đăng xuất',
          style: TextStyle(color: Color(0xFFCE5D5D))),
      ),
      space(10),
      const Text('TRIPOPS GUIDE • MOBILE',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 10, color: muted, letterSpacing: 1)),
    ],
  );
}
