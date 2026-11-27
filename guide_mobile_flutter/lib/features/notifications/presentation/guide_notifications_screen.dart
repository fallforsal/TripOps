import 'package:flutter/material.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../../core/network/api_client.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/presentation/tour_detail_screen.dart';

class GuideNotification {
  GuideNotification.fromJson(Map<String, dynamic> json)
      : id = (json['id'] as num).toInt(),
        message = json['message'] as String? ?? '',
        bookingId = (json['bookingId'] as num?)?.toInt(),
        createdAt = DateTime.tryParse(json['createdAt'] as String? ?? '')?.toLocal(),
        readAt = DateTime.tryParse(json['readAt'] as String? ?? '');

  final int id;
  final String message;
  final int? bookingId;
  final DateTime? createdAt;
  final DateTime? readAt;
}

class GuideNotificationsScreen extends StatefulWidget {
  const GuideNotificationsScreen({
    super.key,
    required this.guides,
    required this.onSessionExpired,
  });

  final GuideRepository guides;
  final Future<void> Function() onSessionExpired;

  @override
  State<GuideNotificationsScreen> createState() => _GuideNotificationsScreenState();
}

class _GuideNotificationsScreenState extends State<GuideNotificationsScreen> {
  List<GuideNotification> items = [];
  bool loading = true;
  bool updating = false;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    if (mounted) setState(() { loading = true; error = null; });
    try {
      final raw = await widget.guides.api.getList('notifications');
      final notices = raw.map((e) =>
        GuideNotification.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      if (mounted) setState(() { items = notices; loading = false; });
    } on ApiFailure catch (e) {
      if (e.statusCode == 401) {
        await widget.onSessionExpired();
        return;
      }
      if (mounted) setState(() { loading = false; error = e.message; });
    } catch (_) {
      if (mounted) {
        setState(() {
          loading = false;
          error = 'Không tải được thông báo. Vui lòng thử lại.';
        });
      }
    }
  }

  Future<void> markRead(GuideNotification notice) async {
    if (notice.readAt != null) return;
    try {
      await widget.guides.api.postVoid('notifications/${notice.id}/read');
      if (mounted) await load();
    } on ApiFailure catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> markAll() async {
    if (updating) return;
    setState(() => updating = true);
    try {
      await widget.guides.api.postVoid('notifications/read-all');
      await load();
    } on ApiFailure catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => updating = false);
    }
  }

  Future<void> openNotice(GuideNotification notice) async {
    await markRead(notice);
    if (!mounted || notice.bookingId == null) return;
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => TourDetailScreen(
        id: notice.bookingId!,
        guides: widget.guides,
        onSessionExpired: widget.onSessionExpired,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final unread = items.where((n) => n.readAt == null).length;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        flexibleSpace: const GuideGlass(radius: 0, shadow: false, blurSigma: 12, child: SizedBox.expand()),
        leading: Navigator.canPop(context) ? IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () => Navigator.maybePop(context),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        ) : null,
        title: const Text('Thông báo'),
        actions: [
          IconButton(
            tooltip: 'Đánh dấu tất cả đã đọc',
            onPressed: unread == 0 || updating ? null : markAll,
            icon: const Icon(Icons.done_all_rounded),
          ),
          IconButton(
            tooltip: 'Làm mới',
            onPressed: loading ? null : load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(error!, textAlign: TextAlign.center),
                    const SizedBox(height: 10),
                    ElevatedButton(onPressed: load, child: const Text('Thử lại')),
                  ],
                ))
              : items.isEmpty
                  ? const Center(child: Text('Chưa có thông báo.'))
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final n = items[index];
                          final unseen = n.readAt == null;
                          return Card(
                            clipBehavior: Clip.antiAlias,
                            child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                            leading: CircleAvatar(
                              backgroundColor: unseen ? const Color(0xFFDDF2EE) : const Color(0xFFF0F3F5),
                              child: Icon(
                              unseen ? Icons.notifications_active_outlined
                                  : Icons.notifications_none_outlined,
                              color: unseen ? const Color(0xFF087E84) : Colors.grey,
                              ),
                            ),
                            title: Text(n.message,
                              style: TextStyle(
                                fontWeight: unseen ? FontWeight.w700 : FontWeight.normal,
                              )),
                            subtitle: Text(n.createdAt?.toString().substring(0, 16) ?? ''),
                            trailing: n.bookingId == null
                                ? null : const Icon(Icons.chevron_right_rounded),
                            onTap: () => openNotice(n),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
