import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

/// Backend on develop does not provide guide accept/decline invitation APIs.
class InvitationNotice extends StatelessWidget {
  const InvitationNotice({super.key});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(15),
      border: Border.all(color: line),
    ),
    child: Row(children: [
      Container(
        width: 39, height: 39,
        decoration: BoxDecoration(
          color: const Color(0xFFFFF4E2),
          borderRadius: BorderRadius.circular(11),
        ),
        child: const Icon(Icons.mail_outline,
          color: Color(0xFFB78330), size: 21),
      ),
      const SizedBox(width: 12),
      const Expanded(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Lời mời nhận tour', style: TextStyle(
            color: ink, fontSize: 13, fontWeight: FontWeight.w800)),
          SizedBox(height: 4),
          Text('Chức năng đang chờ backend hỗ trợ.',
            style: TextStyle(fontSize: 11, color: muted)),
        ],
      )),
      const Icon(Icons.info_outline, color: muted, size: 18),
    ]),
  );
}
