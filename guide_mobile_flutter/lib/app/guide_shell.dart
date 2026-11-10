import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../core/theme/app_theme.dart';
import '../core/widgets/view_helpers.dart';
import '../features/assigned_tours/data/guide_repository.dart';
import '../features/assigned_tours/domain/booking_models.dart';
import '../features/assigned_tours/domain/tour_catalog.dart';
import '../features/assigned_tours/presentation/tour_detail_screen.dart';
import '../features/assigned_tours/presentation/tour_list_screen.dart';
import '../features/auth/domain/guide_account.dart';
import '../features/home/presentation/home_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
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

  @override
  void initState() {
    super.initState();
    refresh();
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
      appBar: AppBar(
        toolbarHeight: 67,
        leadingWidth: 57,
        leading: Padding(
          padding: const EdgeInsets.only(left: 17, top: 9, bottom: 9),
          child: Container(
            decoration: BoxDecoration(
              color: paleTeal, borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.explore_outlined, color: teal, size: 23),
          ),
        ),
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(names[tab], style: const TextStyle(
            fontSize: 17, color: ink, fontWeight: FontWeight.w900,
          )),
          const Text('TripOps Guide', style: TextStyle(
            fontSize: 10, color: muted, fontWeight: FontWeight.w600,
          )),
        ]),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            onPressed: loading ? null : refresh,
            icon: const Icon(Icons.refresh_rounded, color: ink, size: 21),
          ),
          const Padding(
            padding: EdgeInsets.only(right: 17, left: 4),
            child: CircleAvatar(
              radius: 17,
              backgroundColor: paleTeal,
              child: Icon(Icons.person_rounded, color: deepTeal, size: 19),
            ),
          ),
        ],
      ),
      body: loading ? const Center(child: CircularProgressIndicator())
        : error != null ? ErrorState(message: error!, onRetry: refresh)
        : RefreshIndicator(
            onRefresh: refresh,
            child: switch (tab) {
              0 => HomeScreen(
                account: widget.account,
                bookings: bookings,
                inProgressEndDates: endDates,
                onOpenTour: openTour,
                onTourTab: () => setState(() => tab = 1),
                onHistoryTab: () => setState(() => tab = 2),
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
          ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: line)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 7, 8, 7),
            child: Row(
              children: [
                _nav(0, Icons.home_outlined, Icons.home_rounded, 'Trang chủ'),
                _nav(1, Icons.route_outlined, Icons.route_rounded, 'Tour'),
                _nav(2, Icons.history_outlined, Icons.history_rounded, 'Lịch sử'),
                _nav(3, Icons.person_outline, Icons.person_rounded, 'Cá nhân'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _nav(int index, IconData normal, IconData selected, String label) {
    final active = tab == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => tab = index),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              decoration: BoxDecoration(
                color: active ? paleTeal : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(active ? selected : normal, size: 22,
                color: active ? teal : muted),
            ),
            const SizedBox(height: 3),
            Text(label, maxLines: 1, style: TextStyle(
              fontSize: 10, fontWeight: active ? FontWeight.w800 : FontWeight.w600,
              color: active ? teal : muted,
            )),
          ]),
        ),
      ),
    );
  }
}
