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

/// Owns navigation and loading; feature screens stay independent of the shell.
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
      // List API has no endDate. Query details for multi-day in-progress tours.
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
        title: Text(names[tab],
          style: const TextStyle(fontWeight: FontWeight.bold, color: ink)),
        actions: [IconButton(
          tooltip: 'Làm mới',
          onPressed: loading ? null : refresh,
          icon: const Icon(Icons.refresh),
        )],
      ),
      body: loading
        ? const Center(child: CircularProgressIndicator())
        : error != null
          ? ErrorState(message: error!, onRetry: refresh)
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
                  onFilterChanged: (value) => setState(() => tourFilter = value),
                  onQueryChanged: (value) => setState(() => tourQuery = value),
                  onOpenTour: openTour,
                ),
                2 => HistoryScreen(bookings: bookings, onOpenTour: openTour),
                _ => ProfileScreen(account: widget.account, onLogout: widget.onLogout),
              },
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (index) => setState(() => tab = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home), label: 'Trang chủ'),
          NavigationDestination(icon: Icon(Icons.route_outlined),
            selectedIcon: Icon(Icons.route), label: 'Tour'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Lịch sử'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Cá nhân'),
        ],
      ),
    );
  }
}
