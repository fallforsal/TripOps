import 'package:flutter/material.dart';

/// The develop backend does not expose an accept/decline invitation API.
class InvitationNotice extends StatelessWidget {
  const InvitationNotice({super.key});

  @override
  Widget build(BuildContext context) => const Card(
    child: ListTile(
      leading: Icon(Icons.mail_outline),
      title: Text('Lời mời nhận tour'),
      subtitle: Text('Backend chưa cung cấp API nhận/từ chối lời mời.'),
    ),
  );
}
