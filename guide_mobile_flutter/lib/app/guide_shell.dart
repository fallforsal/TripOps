import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/network/api_client.dart';
import '../core/notifications/guide_push_service.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/tour_image_url.dart';
import '../core/widgets/view_helpers.dart';
import '../core/widgets/guide_glass.dart';
import '../features/assigned_tours/data/guide_repository.dart';
import '../features/assigned_tours/domain/booking_models.dart';
import '../features/assigned_tours/domain/tour_catalog.dart';
import '../features/assigned_tours/presentation/tour_detail_screen.dart';
import '../features/assigned_tours/presentation/tour_list_screen.dart';
import '../features/auth/domain/guide_account.dart';
import '../features/home/presentation/home_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/notifications/presentation/guide_notifications_screen.dart';
import '../features/tour_history/presentation/history_screen.dart';

class GuideShell extends StatefulWidget {
  const GuideShell({
    super.key, required this.account, required this.guides,
    required this.onLogout, required this.onSessionExpired,
  });

  final GuideAccount account;
  final GuideRepository guides;
  final Future<void> Function() onLogout;
  final Future<void> Function() onSessionExpired;

  @override
  State<GuideShell> createState() => _GuideShellState();
}

class _GuideShellState extends State<GuideShell> {
  int tab = 0;
  TourFilter tourFilter = TourFilter.upcoming;
  String tourQuery = '';
  bool loading = true;
  String? error;
  List<BookingSummary> bookings = [];
  Map<int, DateTime> endDates = {};
  final ValueNotifier<int> _unreadNotices = ValueNotifier<int>(0);
  Timer? _notificationsPoll;
  StreamSubscription<int?>? _openedPush;
  late final VoidCallback _inboxPushListener;

  @override
  void initState() {
    super.initState();
    refresh();
    refreshNotices();
    _notificationsPoll = Timer.periodic(
      const Duration(seconds: 15), (_) => refreshNotices());
    _inboxPushListener = () { if (mounted) unawaited(refreshNotices()); };
    GuidePushService.inboxRevision.addListener(_inboxPushListener);
    _openedPush = GuidePushService.openedBooking.listen((id) {
      if (mounted) unawaited(openPushBooking(id));
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final pending = GuidePushService.takePendingBooking();
      if (pending != null) unawaited(openPushBooking(pending));
    });
  }

  @override
  void dispose() {
    _notificationsPoll?.cancel();
    _unreadNotices.dispose();
    _openedPush?.cancel();
    GuidePushService.inboxRevision.removeListener(_inboxPushListener);
    super.dispose();
  }

  Future<void> refreshNotices() async {
    try {
      final raw = await widget.guides.api.getList('notifications');
      final count = raw.where((n) => n is Map && n['readAt'] == null).length;
      if (mounted) _unreadNotices.value = count;
    } catch (_) {
      // Bookings remain usable even when notification fetching fails.
    }
  }

  Future<void> openPushBooking(int? bookingId) async {
    if (!mounted) return;
    if (bookingId == null) {
      await openNotices();
      return;
    }
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => TourDetailScreen(
        id: bookingId,
        guides: widget.guides,
        onSessionExpired: widget.onSessionExpired,
      ),
    ));
    if (mounted) await refreshNotices();
  }

  Future<void> openNotices() async {
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => GuideNotificationsScreen(
        guides: widget.guides, onSessionExpired: widget.onSessionExpired,
      ),
    ));
    if (mounted) await refreshNotices();
  }

  Future<void> refresh() async {
    setState(() { loading = true; error = null; });
    try {
      final data = await widget.guides.allBookings();
      final ends = <int, DateTime>{};
      for (final item in data.where((b) => b.status == 'InProgress')) {
        final detail = await widget.guides.detail(item.id);
        ends[item.id] = detail.endDate;
      }
      if (!mounted) return;
      setState(() { bookings = data; endDates = ends; loading = false; });
    } catch (e) {
      if (!mounted) return;
      if (e is ApiFailure && e.statusCode == 401) {
        await widget.onSessionExpired();
        return;
      }
      setState(() { loading = false; error = readableError(e); });
    }
  }

  Future<void> openTour(BookingSummary summary) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => TourDetailScreen(
        id: summary.id,
        guides: widget.guides,
        onSessionExpired: widget.onSessionExpired,
      ),
    ));
    if (mounted) await refresh();
  }

  @override
  Widget build(BuildContext context) {
    const names = ['Trang chủ', 'Tour của tôi', 'Lịch sử', 'Cá nhân'];
    return Scaffold(
      extendBody: true,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(80),
        child: AnnotatedRegion<SystemUiOverlayStyle>(
          value: const SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
            statusBarBrightness: Brightness.light,
          ),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 560),
                  child: GuideGlass(
                    key: const ValueKey('floating-guide-header'),
                    radius: 32,
                    blurSigma: 14,
                    highlightTint: const Color(0xC9FFFFFF),
                    tint: const Color(0x80FFFFFF),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    child: Material(
                      type: MaterialType.transparency,
                      child: LayoutBuilder(
                        builder: (context, constraints) => Row(
                          children: [
                            Image.asset(
                              'assets/images/TripOps_logo_transparent.png',
                              height: 25,
                              width: constraints.maxWidth < 300 ? 72 : 88,
                              fit: BoxFit.contain,
                              semanticLabel: 'TripOps Logo',
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(names[tab], maxLines: 1, overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 17, color: ink, fontWeight: FontWeight.w700)),
                                  const Text('Tour Guide', maxLines: 1, overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontSize: 12, color: muted, fontWeight: FontWeight.w500)),
                                ],
                              ),
                            ),
                            const SizedBox(width: 4),
                            ValueListenableBuilder<int>(
                              valueListenable: _unreadNotices,
                              builder: (context, count, _) => _headerAction(
                                icon: Icons.notifications_none_rounded,
                                tooltip: 'Thông báo',
                                onPressed: openNotices,
                                badge: count > 0 ? (count > 99 ? '99+' : '$count') : null,
                              ),
                            ),
                            if (constraints.maxWidth >= 340) ...[
                              const SizedBox(width: 4),
                              _headerAction(
                                icon: Icons.refresh_rounded,
                                tooltip: 'Làm mới',
                                onPressed: loading ? null : refresh,
                              ),
                            ],
                            const SizedBox(width: 6),
                            _headerAvatar(),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      body: Builder(builder: (bodyContext) => loading
        ? const SafeArea(child: Center(child: CircularProgressIndicator()))
        : error != null ? SafeArea(child: ErrorState(message: error!, onRetry: refresh))
        : RefreshIndicator(
            edgeOffset: MediaQuery.paddingOf(bodyContext).top,
            onRefresh: refresh,
            child: switch (tab) {
              0 => HomeScreen(
                account: widget.account,
                bookings: bookings,
                inProgressEndDates: endDates,
                onOpenTour: openTour,
                onTourTab: () => setState(() => tab = 1),
              ),
              1 => TourListScreen(
                bookings: bookings,
                filter: tourFilter,
                query: tourQuery,
                onFilterChanged: (v) => setState(() => tourFilter = v),
                onQueryChanged: (v) => setState(() => tourQuery = v),
                onOpenTour: openTour,
              ),
              2 => HistoryScreen(bookings: bookings, onOpenTour: openTour),
              _ => ProfileScreen(
                account: widget.account, onLogout: widget.onLogout,
              ),
            },
          )),
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(14, 4, 14, 12),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: GuideGlass(
              radius: 36,
              blurSigma: 16,
              tint: const Color(0xA6FFFFFF),
              padding: const EdgeInsets.all(5),
              child: Material(
                type: MaterialType.transparency,
                child: Row(children: [
                  _nav(0, Icons.home_outlined, Icons.home_rounded, 'Trang chủ'),
                  _nav(1, Icons.route_outlined, Icons.route_rounded, 'Tour'),
                  _nav(2, Icons.history_outlined, Icons.history_rounded, 'Lịch sử'),
                  _nav(3, Icons.person_outline, Icons.person_rounded, 'Cá nhân'),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _headerAction({
    required IconData icon,
    required String tooltip,
    required VoidCallback? onPressed,
    String? badge,
  }) => Stack(
    clipBehavior: Clip.none,
    children: [
      Material(
        color: const Color(0x80FFFFFF),
        shape: const CircleBorder(),
        child: IconButton(
          tooltip: tooltip,
          onPressed: onPressed,
          icon: Icon(icon, size: 23),
          color: ink,
        ),
      ),
      if (badge != null)
        Positioned(
          right: -2,
          top: -3,
          child: IgnorePointer(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.redAccent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white, width: 1.2),
              ),
              child: Text(badge, style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ),
        ),
    ],
  );

  Widget _headerAvatar() {
    final avatarUrl = resolveGuideAvatarUrl(widget.account.avatar);
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: const BoxDecoration(color: Color(0xA6FFFFFF), shape: BoxShape.circle),
      child: CircleAvatar(
        radius: 19,
        backgroundColor: paleTeal,
        child: avatarUrl == null
            ? const Icon(Icons.person_rounded, color: deepTeal, size: 20)
            : ClipOval(
                child: Image.network(
                  avatarUrl, width: 38, height: 38, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Icon(Icons.person_rounded, color: deepTeal, size: 20),
                ),
              ),
      ),
    );
  }

  Widget _nav(int index, IconData normal, IconData selected, String label) {
    final active = tab == index;
    return Expanded(
      child: Semantics(
        selected: active,
        button: true,
        child: InkWell(
          onTap: () => setState(() => tab = index),
          borderRadius: BorderRadius.circular(30),
          child: AnimatedContainer(
            duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            constraints: const BoxConstraints(minHeight: 58),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            decoration: BoxDecoration(
              gradient: active ? const LinearGradient(
                colors: [Color(0xE6FFFFFF), Color(0xC9D4ECE8)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ) : null,
              border: Border.all(color: active ? const Color(0xE6FFFFFF) : Colors.transparent),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(active ? selected : normal, size: 24, color: active ? deepTeal : muted),
              const SizedBox(height: 4),
              Text(label, maxLines: 1, overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  color: active ? deepTeal : muted)),
            ]),
          ),
        ),
      ),
    );
  }
}
