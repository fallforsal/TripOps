import 'package:flutter/material.dart';
import 'api.dart';
import 'attendance_filter.dart';
import 'tour_catalog.dart';
import 'home_picker.dart';
import 'models.dart';
import 'repositories.dart';

const ink = Color(0xFF17324D);
const muted = Color(0xFF66798A);

String _error(Object e) => e is ApiFailure ? e.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
Widget _space([double height = 12]) => SizedBox(height: height);

class GuideEntry extends StatefulWidget {
  const GuideEntry({super.key, required this.auth, required this.guides});
  final AuthRepository auth;
  final GuideRepository guides;

  @override
  State<GuideEntry> createState() => _GuideEntryState();
}

class _GuideEntryState extends State<GuideEntry> {
  GuideAccount? _account;
  bool _loading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    try {
      final account = await widget.auth.restore();
      if (!mounted) return;
      setState(() { _account = account; _errorMessage = null; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _errorMessage = _error(e); _loading = false; });
    }
  }

  Future<void> _login(String email, String password) async {
    final account = await widget.auth.login(email, password);
    if (!mounted) return;
    setState(() { _account = account; _errorMessage = null; });
  }

  Future<void> _sessionExpired() async {
    await widget.auth.api.discardSession();
    if (!mounted) return;
    setState(() {
      _account = null;
      _errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    });
  }

  Future<void> _logout() async {
    Object? failure;
    try {
      await widget.auth.logout();
    } catch (e) { failure = e; }
    if (!mounted) return;
    setState(() => _account = null);
    if (failure != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Đã xóa phiên trên thiết bị. Server: ${_error(failure)}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_account != null) {
      return GuideShell(account: _account!, guides: widget.guides, onLogout: _logout, onSessionExpired: _sessionExpired);
    }
    return LoginScreen(
      onLogin: _login,
      initialError: _errorMessage,
      onRetrySession: _restore,
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key, required this.onLogin, required this.onRetrySession, this.initialError,
  });
  final Future<void> Function(String, String) onLogin;
  final VoidCallback onRetrySession;
  final String? initialError;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final form = GlobalKey<FormState>();
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;
  String? message;

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate() || loading) return;
    setState(() { loading = true; message = null; });
    try {
      await widget.onLogin(email.text, password.text);
    } catch (e) {
      if (mounted) setState(() => message = _error(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(child: Center(child: SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420),
        child: Form(key: form, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Icon(Icons.explore_rounded, size: 70, color: Color(0xFF087D82)),
          _space(12),
          const Text('TripOps Guide', textAlign: TextAlign.center,
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: ink)),
          const Text('Đăng nhập dành cho Hướng dẫn viên', textAlign: TextAlign.center,
            style: TextStyle(color: muted)),
          _space(36),
          TextFormField(controller: email, keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
            validator: (v) => v == null || !v.contains('@') ? 'Nhập email hợp lệ' : null),
          _space(),
          TextFormField(controller: password, obscureText: true,
            decoration: const InputDecoration(labelText: 'Mật khẩu', prefixIcon: Icon(Icons.lock_outline)),
            validator: (v) => v == null || v.isEmpty ? 'Nhập mật khẩu' : null,
            onFieldSubmitted: (_) => submit()),
          if (widget.initialError != null || message != null) ...[
            _space(),
            Text(message ?? widget.initialError!, style: const TextStyle(color: Colors.red)),
          ],
          _space(20),
          FilledButton(onPressed: loading ? null : submit,
            child: Padding(padding: const EdgeInsets.all(11),
              child: loading ? const CircularProgressIndicator() : const Text('Đăng nhập'))),
          if (widget.initialError != null)
            TextButton(onPressed: widget.onRetrySession, child: const Text('Thử khôi phục phiên')),
          _space(),
          const Text('Tài khoản Hướng dẫn viên do Agency cấp. Ứng dụng không tự đăng ký.',
            textAlign: TextAlign.center, style: TextStyle(color: muted)),
        ])),
      ),
    ))),
  );
}

class GuideShell extends StatefulWidget {
  const GuideShell({super.key, required this.account, required this.guides, required this.onLogout, required this.onSessionExpired});
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
      // Backend list items include startDate only. Fetch detail for every
      // started booking to correctly detect multi-day trips, without guessing.
      final ends = <int, DateTime>{};
      for (final item in data.where((x) => x.status == 'InProgress')) {
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
      setState(() { loading = false; error = _error(e); });
    }
  }

  Future<void> openTour(BookingSummary summary) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => TourDetailScreen(id: summary.id, guides: widget.guides, onSessionExpired: widget.onSessionExpired),
    ));
    if (mounted) await refresh();
  }

  @override
  Widget build(BuildContext context) {
    final names = ['Trang chủ', 'Tour của tôi', 'Lịch sử', 'Cá nhân'];
    final today = selectHomeTrip(bookings, DateTime.now(), inProgressEndDates: endDates);
    return Scaffold(
      appBar: AppBar(title: Text(names[tab], style: const TextStyle(fontWeight: FontWeight.bold, color: ink)),
        actions: [IconButton(tooltip: 'Làm mới', onPressed: loading ? null : refresh, icon: const Icon(Icons.refresh))]),
      body: loading
        ? const Center(child: CircularProgressIndicator())
        : error != null
          ? ErrorState(message: error!, onRetry: refresh)
          : RefreshIndicator(onRefresh: refresh, child: ListView(
            padding: const EdgeInsets.all(18),
            children: switch (tab) {
              0 => [
                Text('Xin chào, ${widget.account.name} 👋',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: ink)),
                const Text('Chúc bạn có một hành trình tốt đẹp.', style: TextStyle(color: muted)),
                _space(22),
                Text(today.kind == HomeTripKind.today ? 'Hành trình hôm nay'
                    : today.kind == HomeTripKind.upcoming ? 'Hành trình sắp tới' : 'Hành trình của bạn',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: ink)),
                _space(12),
                if (today.tour != null) TourCard(
                    tour: today.tour!,
                    onTap: () => openTour(today.tour!),
                    label: today.kind == HomeTripKind.upcoming ? 'Tour gần nhất sắp tới' : 'Tour hôm nay',
                  )
                else const Card(child: Padding(padding: EdgeInsets.all(22),
                  child: Text('Hôm nay không có tour và chưa có tour sắp tới.'))),
                _space(24),
                const Text('Tác vụ của bạn', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: ink)),
                _space(12),
                Card(child: ListTile(leading: const Icon(Icons.route_outlined), title: const Text('Tour được phân công'),
                  subtitle: Text('${bookings.where((b) => b.isActive).length} tour có hiệu lực'),
                  trailing: const Icon(Icons.chevron_right), onTap: () => setState(() => tab = 1))),
                Card(child: ListTile(leading: const Icon(Icons.history), title: const Text('Lịch sử tour'),
                  trailing: const Icon(Icons.chevron_right), onTap: () => setState(() => tab = 2))),
                const Card(child: ListTile(leading: Icon(Icons.mail_outline),
                  title: Text('Lời mời nhận tour'), subtitle: Text('Backend chưa cung cấp API nhận/từ chối lời mời.'))),
              ],
              1 => [
                TextField(
                  key: const ValueKey('tour-search'),
                  decoration: const InputDecoration(
                    hintText: 'Tìm tour, mã booking hoặc tên khách',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (value) => setState(() => tourQuery = value),
                ),
                _space(12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: TourFilter.values.map((filter) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(tourFilterLabel(filter)),
                        selected: tourFilter == filter,
                        onSelected: (_) => setState(() => tourFilter = filter),
                      ),
                    )).toList(),
                  ),
                ),
                _space(12),
                if (filterBookings(bookings, filter: tourFilter,
                    today: DateTime.now(), query: tourQuery).isEmpty)
                  const Card(child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Text('Không tìm thấy tour phù hợp với bộ lọc.'),
                  )),
                ...filterBookings(bookings, filter: tourFilter,
                  today: DateTime.now(), query: tourQuery)
                  .map((b) => TourCard(tour: b, onTap: () => openTour(b))),
              ],
              2 => [
                if (!bookings.any((b) => b.isCompleted))
                  const Text('Chưa có tour đã hoàn thành.'),
                ...filterBookings(bookings, filter: TourFilter.completed,
                    today: DateTime.now())
                    .map((b) => TourCard(tour: b, onTap: () => openTour(b))),
              ],
              _ => [
                const CircleAvatar(radius: 33, child: Icon(Icons.person, size: 35)),
                _space(12),
                Text(widget.account.name, style: const TextStyle(fontSize: 23, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                Text(widget.account.email, style: const TextStyle(color: muted), textAlign: TextAlign.center),
                _space(20),
                Card(child: Column(children: [
                  ListTile(leading: const Icon(Icons.badge_outlined),
                    title: const Text('Vai trò'), subtitle: Text(widget.account.role)),
                  ListTile(leading: const Icon(Icons.phone_outlined),
                    title: const Text('Số điện thoại'), subtitle: Text(widget.account.phone ?? 'Chưa cập nhật')),
                ])),
                _space(12),
                OutlinedButton.icon(onPressed: widget.onLogout,
                  icon: const Icon(Icons.logout), label: const Text('Đăng xuất')),
              ],
            },
          )),
      bottomNavigationBar: NavigationBar(selectedIndex: tab,
        onDestinationSelected: (index) => setState(() => tab = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Trang chủ'),
          NavigationDestination(icon: Icon(Icons.route_outlined), selectedIcon: Icon(Icons.route), label: 'Tour'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Lịch sử'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Cá nhân'),
        ]),
    );
  }
}

class TourCard extends StatelessWidget {
  const TourCard({super.key, required this.tour, required this.onTap, this.label});
  final BookingSummary tour;
  final VoidCallback onTap;
  final String? label;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 12),
    child: InkWell(borderRadius: BorderRadius.circular(20), onTap: onTap,
      child: Padding(padding: const EdgeInsets.all(18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (label != null) ...[
            Text(label!, style: const TextStyle(color: Color(0xFF087D82), fontWeight: FontWeight.bold)),
            _space(8),
          ],
          Text(tour.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold, color: ink)),
          _space(10),
          Text('${tour.code}  ·  ${bookingStatusLabel(tour.status)}', style: const TextStyle(color: muted)),
          _space(8),
          Row(children: [
            const Icon(Icons.event_outlined, size: 18, color: muted),
            const SizedBox(width: 6),
            Expanded(child: Text('Khởi hành ${vnDate(tour.startDate)}')),
            const Icon(Icons.group_outlined, size: 18, color: muted),
            const SizedBox(width: 5),
            Text('${tour.guestCount} khách'),
          ]),
          _space(12),
          const Align(alignment: Alignment.centerRight,
            child: Text('Xem chi tiết  ›',
              style: TextStyle(color: Color(0xFF087D82), fontWeight: FontWeight.bold))),
        ]),
      ),
    ),
  );
}

class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(24),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.wifi_off_outlined, size: 48, color: muted),
      _space(),
      Text(message, textAlign: TextAlign.center),
      _space(),
      OutlinedButton(onPressed: onRetry, child: const Text('Thử lại')),
    ]),
  ));
}

class TourDetailScreen extends StatefulWidget {
  const TourDetailScreen({super.key, required this.id, required this.guides, required this.onSessionExpired});
  final int id;
  final GuideRepository guides;
  final Future<void> Function() onSessionExpired;
  @override
  State<TourDetailScreen> createState() => _TourDetailScreenState();
}

class _TourDetailScreenState extends State<TourDetailScreen> {
  BookingDetail? detail;
  bool loading = true;
  bool acting = false;
  String? error;

  @override
  void initState() { super.initState(); refresh(); }

  Future<void> refresh() async {
    setState(() { loading = true; error = null; });
    try {
      final value = await widget.guides.detail(widget.id);
      if (mounted) setState(() { detail = value; loading = false; });
    } catch (e) {
      if (!mounted) return;
      if (e is ApiFailure && e.statusCode == 401) {
        await widget.onSessionExpired();
        return;
      }
      setState(() { error = _error(e); loading = false; });
    }
  }

  Future<void> mutate(Future<dynamic> Function() action) async {
    if (acting) return;
    setState(() => acting = true);
    try {
      await action();
      if (!mounted) return;
      await refresh(); // backend is the source of truth
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Backend đã xác nhận thành công.')));
    } catch (e) {
      if (!mounted) return;
      if (e is ApiFailure && e.statusCode == 401) {
        await widget.onSessionExpired();
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_error(e))),
      );
    } finally {
      if (mounted) setState(() => acting = false);
    }
  }

  void open(Widget screen) async {
    await Navigator.push(context, MaterialPageRoute<void>(builder: (_) => screen));
    if (mounted) await refresh();
  }

  @override
  Widget build(BuildContext context) {
    final d = detail;
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết tour'),
        actions: [IconButton(onPressed: acting ? null : refresh, icon: const Icon(Icons.refresh))]),
      body: loading ? const Center(child: CircularProgressIndicator())
        : error != null ? ErrorState(message: error!, onRetry: refresh)
        : d == null ? const Center(child: Text('Không tìm thấy tour.'))
        : ListView(padding: const EdgeInsets.all(18), children: [
          Text(d.name, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: ink)),
          _space(),
          Text('${d.code}  ·  ${d.status}', style: const TextStyle(color: muted)),
          Text('${vnDate(d.startDate)} – ${vnDate(d.endDate)}'),
          Text('${d.totalGuests} hành khách  ·  ${d.agencyName ?? "Agency"}'),
          _space(20),
          if (acting) const LinearProgressIndicator(),
          if ((d.status == 'Confirmed' || d.status == 'Paid') &&
              !d.startDate.isAfter(DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day)))
            FilledButton.icon(onPressed: acting ? null : () => mutate(() => widget.guides.start(d.id)),
              icon: const Icon(Icons.play_arrow), label: const Text('Bắt đầu tour')),
          if (d.status == 'InProgress')
            FilledButton.icon(onPressed: acting ? null : () => confirmComplete(d),
              icon: const Icon(Icons.check_circle_outline), label: const Text('Hoàn tất tour')),
          _space(8),
          _action(Icons.fact_check_outlined, 'Điểm danh hành khách', '${d.passengers.length} hành khách',
            () => open(AttendanceScreen(detail: d, guides: widget.guides))),
          _action(Icons.location_on_outlined, 'Check-in địa điểm', '${d.days.length} ngày lịch trình',
            () => open(LocationScreen(detail: d, guides: widget.guides))),
          _action(Icons.report_problem_outlined, 'Báo cáo sự cố', '${d.incidents.length} sự cố đã ghi nhận',
            () => open(IncidentScreen(detail: d, guides: widget.guides))),
          _space(14),
          const Text('Thông tin đoàn', style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
          Card(child: Column(children: [
            ListTile(title: const Text('Khách hàng'), subtitle: Text(d.customerName ?? 'Không có dữ liệu')),
            ListTile(title: const Text('Liên hệ'), subtitle: Text(d.contactPhone ?? 'Không có dữ liệu')),
            ListTile(title: const Text('Số ngày'), subtitle: Text('${d.days.length} ngày theo lịch trình')),
          ])),
          _space(),
          const Text('Lịch trình', style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
          ...d.days.map((day) => Card(child: ListTile(
            title: Text('Ngày ${day.dayNumber} · ${day.title}'),
            subtitle: Text(day.stops.map((s) => s.name).join(' • ')),
          ))),
        ]),
    );
  }

  Widget _action(IconData icon, String title, String subtitle, VoidCallback onTap) =>
    Card(child: ListTile(leading: Icon(icon, color: const Color(0xFF087D82)),
      title: Text(title), subtitle: Text(subtitle), trailing: const Icon(Icons.chevron_right), onTap: onTap));

  Future<void> confirmComplete(BookingDetail d) async {
    final approved = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Hoàn tất tour?'),
      content: const Text('Tour sẽ được chuyển sang trạng thái Completed trên server.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Xác nhận')),
      ],
    ));
    if (approved == true) await mutate(() => widget.guides.complete(d.id));
  }
}

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key, required this.detail, required this.guides});
  final BookingDetail detail;
  final GuideRepository guides;
  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  late BookingDetail current = widget.detail;
  int? busy;
  String? error;
  String query = '';
  AttendanceFilter filter = AttendanceFilter.all;

  Future<void> update(Passenger passenger, String status) async {
    if (busy != null) return;
    setState(() { busy = passenger.id; error = null; });
    try {
      await widget.guides.attendance(current.id, passenger.id, status);
      final updated = await widget.guides.detail(current.id);
      if (mounted) setState(() => current = updated);
    } catch (e) {
      if (mounted) setState(() => error = _error(e));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final all = filterPassengers(current.passengers);
    final passengers = filterPassengers(current.passengers,
        filter: filter, query: query);
    final checked = all.where((p) => p.status == 'CheckedIn').length;
    return Scaffold(appBar: AppBar(title: const Text('Điểm danh hành khách')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text('$checked / ${all.length} khách đã có mặt',
          style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
        _space(),
        LinearProgressIndicator(
          value: all.isEmpty ? 0 : checked / all.length,
          minHeight: 7,
          borderRadius: BorderRadius.circular(10),
        ),
        _space(14),
        TextField(
          key: const ValueKey('passenger-search'),
          decoration: const InputDecoration(
            hintText: 'Tìm tên hoặc số điện thoại hành khách',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (value) => setState(() => query = value),
        ),
        _space(10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: AttendanceFilter.values.map((option) =>
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(attendanceFilterLabel(option)),
                selected: filter == option,
                onSelected: (_) => setState(() => filter = option),
              ),
            )).toList()),
        ),
        if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
        if (passengers.isEmpty) const Padding(
          padding: EdgeInsets.symmetric(vertical: 30),
          child: Center(child: Text('Không tìm thấy hành khách phù hợp.')),
        ),
        ...passengers.map((p) => Card(child: Padding(padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            if (p.phone != null) Text(p.phone!, style: const TextStyle(color: muted)),
            _space(8),
            if (busy == p.id) const LinearProgressIndicator(),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'Pending', label: Text('Chưa rõ')),
                ButtonSegment(value: 'CheckedIn', label: Text('Có mặt')),
                ButtonSegment(value: 'Absent', label: Text('Vắng')),
              ],
              selected: {p.status},
              onSelectionChanged: busy != null ? null : (v) => update(p, v.first),
            ),
          ]),
        ))),
      ]),
    );
  }
}

class LocationScreen extends StatefulWidget {
  const LocationScreen({super.key, required this.detail, required this.guides});
  final BookingDetail detail;
  final GuideRepository guides;
  @override
  State<LocationScreen> createState() => _LocationScreenState();
}

class _LocationScreenState extends State<LocationScreen> {
  late BookingDetail current = widget.detail;
  int? busy;
  String? error;

  Future<void> check(TourStop stop, String status) async {
    if (busy != null) return;
    final noteController = TextEditingController();
    final note = await showDialog<String>(context: context, builder: (context) => AlertDialog(
      title: Text(status == 'CheckedIn' ? 'Check-in ${stop.name}' : 'Bỏ qua ${stop.name}'),
      content: TextField(controller: noteController, maxLines: 2,
        decoration: const InputDecoration(labelText: 'Ghi chú (không bắt buộc)')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
        FilledButton(onPressed: () => Navigator.pop(context, noteController.text.trim()),
          child: const Text('Gửi backend')),
      ],
    ));
    noteController.dispose();
    if (note == null || !mounted) return;
    setState(() { busy = stop.id; error = null; });
    try {
      final updated = await widget.guides.checkIn(current.id, stop.id, status, note.isEmpty ? null : note);
      if (mounted) setState(() => current = updated);
    } catch (e) {
      if (mounted) setState(() => error = _error(e));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Check-in địa điểm')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      const Text('Check-in ghi nhận trạng thái trên backend; API hiện không xác thực GPS.',
        style: TextStyle(color: muted)),
      if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
      ...current.days.map((day) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _space(18),
        Text('Ngày ${day.dayNumber} · ${day.title}',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        ...day.stops.map((stop) => Card(child: Padding(padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ListTile(contentPadding: EdgeInsets.zero, leading: const Icon(Icons.place_outlined),
              title: Text(stop.name), subtitle: Text('Trạng thái: ${stop.status}')),
            if (busy == stop.id) const LinearProgressIndicator(),
            Wrap(spacing: 8, children: [
              OutlinedButton(onPressed: busy != null ? null : () => check(stop, 'CheckedIn'),
                child: const Text('Đã đến')),
              OutlinedButton(onPressed: busy != null ? null : () => check(stop, 'Skipped'),
                child: const Text('Bỏ qua')),
            ]),
          ]),
        ))),
      ])),
    ]),
  );
}

class IncidentScreen extends StatefulWidget {
  const IncidentScreen({super.key, required this.detail, required this.guides});
  final BookingDetail detail;
  final GuideRepository guides;
  @override
  State<IncidentScreen> createState() => _IncidentScreenState();
}

class _IncidentScreenState extends State<IncidentScreen> {
  final form = GlobalKey<FormState>();
  final title = TextEditingController();
  final description = TextEditingController();
  final type = TextEditingController(text: 'OTHER');
  String severity = 'Medium';
  bool busy = false;
  String? error;

  @override
  void dispose() {
    title.dispose(); description.dispose(); type.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() { busy = true; error = null; });
    try {
      await widget.guides.incident(widget.detail.id,
        type: type.text.trim(), title: title.text.trim(),
        description: description.text.trim(), severity: severity);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Backend đã tiếp nhận báo cáo sự cố.')));
      Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => error = _error(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Báo cáo sự cố')),
    body: Form(key: form, child: ListView(padding: const EdgeInsets.all(18), children: [
      if (widget.detail.incidents.isNotEmpty) ...[
        const Text('Sự cố đã báo cáo',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
        _space(8),
        ...widget.detail.incidents.map((incident) => Card(
          child: ListTile(
            leading: const Icon(Icons.report_problem_outlined),
            title: Text(incident.title),
            subtitle: Text(incident.description, maxLines: 2,
              overflow: TextOverflow.ellipsis),
            trailing: Text(incident.status),
          ),
        )),
        _space(16),
      ],
      const Text('Tạo báo cáo mới',
          style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
      _space(8),
      Text(widget.detail.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
      _space(16),
      TextFormField(controller: type, maxLength: 100,
        decoration: const InputDecoration(labelText: 'Loại sự cố'),
        validator: (v) => v == null || v.trim().isEmpty ? 'Nhập loại sự cố' : null),
      _space(),
      TextFormField(controller: title, maxLength: 255,
        decoration: const InputDecoration(labelText: 'Tiêu đề'),
        validator: (v) => v == null || v.trim().isEmpty ? 'Nhập tiêu đề' : null),
      _space(),
      TextFormField(controller: description, maxLines: 5, maxLength: 2000,
        decoration: const InputDecoration(labelText: 'Mô tả chi tiết'),
        validator: (v) => v == null || v.trim().isEmpty ? 'Nhập mô tả' : null),
      _space(),
      DropdownButtonFormField<String>(
        initialValue: severity,
        decoration: const InputDecoration(labelText: 'Mức độ'),
        items: const [
          DropdownMenuItem(value: 'Low', child: Text('Thấp')),
          DropdownMenuItem(value: 'Medium', child: Text('Trung bình')),
          DropdownMenuItem(value: 'High', child: Text('Cao')),
          DropdownMenuItem(value: 'Critical', child: Text('Khẩn cấp')),
        ],
        onChanged: (v) { if (v != null) setState(() => severity = v); },
      ),
      _space(20),
      if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
      FilledButton(onPressed: busy ? null : submit,
        child: busy ? const CircularProgressIndicator() : const Text('Gửi báo cáo')),
      _space(),
      const Text('Backend hiện chưa hỗ trợ đính kèm ảnh qua API này.',
        style: TextStyle(color: muted)),
    ])),
  );
}
