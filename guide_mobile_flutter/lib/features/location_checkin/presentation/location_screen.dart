import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/guide_glass_metric.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../incidents/presentation/incident_screen.dart';
import 'checkin_photo_dialog.dart';
import 'guide_stop_card.dart';
import 'location_evidence_gallery.dart';

enum _StopAction { checkin, checkout, skip }

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
  int? errorStop;
  _StopAction? _errorAction;
  bool _openingSheet = false;
  bool _refreshing = false;
  final _scroll = ScrollController();
  final _anchors = <int, GlobalKey>{};
  final _expanded = <int>{};
  final _drafts = <(int, _StopAction), CheckinSubmission>{};
  late final _photos = LocationPhotoCache(widget.guides.imageBytes);
  int _scrollGeneration = 0;

  @override
  void dispose() {
    _scrollGeneration++;
    _scroll.dispose();
    _photos.clear();
    super.dispose();
  }

  List<TourStop> get _stops => current.days.expand((day) => day.stops).toList();

  bool _allowed(TourStop stop, _StopAction action) {
    if (!current.canCheckInLocations || current.nextLocationCheckInId != stop.id) {
      return false;
    }
    if (action == _StopAction.checkout) return stop.status == 'CheckedIn';
    return stop.status != 'CheckedIn' && stop.status != 'CheckedOut' &&
        stop.status != 'Skipped';
  }

  TourStop? _findStop(int id) {
    for (final stop in _stops) {
      if (stop.id == id) return stop;
    }
    return null;
  }

  void _accept(BookingDetail detail) {
    current = detail;
    final stops = {for (final stop in _stops) stop.id: stop};
    _drafts.removeWhere((key, _) {
      final stop = stops[key.$1];
      if (stop == null) return true;
      return key.$2 == _StopAction.checkout
          ? stop.status == 'CheckedOut' || stop.status == 'Skipped'
          : stop.status == 'CheckedIn' || stop.status == 'CheckedOut' || stop.status == 'Skipped';
    });
    _expanded.removeWhere((id) => !stops.containsKey(id));
  }

  Future<void> refresh() async {
    if (busy != null || _openingSheet || _refreshing) return;
    setState(() => _refreshing = true);
    try {
      final updated = await widget.guides.detail(current.id);
      if (mounted) {
        setState(() {
          _accept(updated);
          error = null;
          errorStop = null;
          _errorAction = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = readableError(e);
          errorStop = null;
          _errorAction = null;
        });
      }
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _perform(TourStop stop, _StopAction action) async {
    if (busy != null || _openingSheet || _refreshing || !_allowed(stop, action)) return;
    final draftKey = (stop.id, action);
    _scrollGeneration++;
    setState(() => _openingSheet = true);
    CheckinSubmission? submission;
    try {
      submission = await showModalBottomSheet<CheckinSubmission>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        isDismissible: false,
        enableDrag: false,
        backgroundColor: Colors.transparent,
        builder: (_) => CheckinPhotoDialog(
          stopName: stop.name,
          isCheckout: action == _StopAction.checkout,
          isSkip: action == _StopAction.skip,
          initialSubmission: _drafts[draftKey],
        ),
      );
    } finally {
      if (mounted) setState(() => _openingSheet = false);
    }
    if (!mounted || submission == null) return;
    final latest = _findStop(stop.id);
    if (latest == null || !_allowed(latest, action)) return;
    final payload = submission;
    final scrollGeneration = _scrollGeneration;
    setState(() {
      _drafts[draftKey] = payload;
      busy = stop.id;
      error = null;
      errorStop = null;
      _errorAction = null;
    });
    int? advanceTo;
    try {
      final note = payload.note.isEmpty ? null : payload.note;
      final updated = action == _StopAction.checkout
          ? await widget.guides.checkOutWithImages(current.id, stop.id, note, payload.images)
          : await widget.guides.checkInWithImages(current.id, stop.id, note, payload.images,
              status: action == _StopAction.skip ? 'Skipped' : 'CheckedIn');
      if (!mounted) return;
      setState(() {
        _accept(updated);
        _drafts.remove(draftKey);
        if (action != _StopAction.checkin) _expanded.remove(stop.id);
      });
      unawaited(HapticFeedback.lightImpact().catchError((Object _) {}));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(switch (action) {
        _StopAction.checkin => 'Check-in địa điểm thành công.',
        _StopAction.checkout => 'Check-out thành công.',
        _StopAction.skip => 'Đã ghi nhận bỏ qua điểm dừng.',
      })));
      if (action != _StopAction.checkin && updated.canCheckInLocations &&
          updated.nextLocationCheckInId != stop.id) {
        advanceTo = updated.nextLocationCheckInId;
      }
    } catch (e) {
      // Reconcile even on transport errors: the server may have accepted
      // the request before the connection dropped. Never auto-resubmit.
      try {
        final updated = await widget.guides.detail(current.id);
        if (mounted) setState(() => _accept(updated));
      } catch (_) {
        // Keep the original error and draft if state cannot be refreshed.
      }
      if (mounted) {
        final confirmedStatus = _findStop(stop.id)?.status;
        final confirmed = switch (action) {
          _StopAction.checkin => confirmedStatus == 'CheckedIn' || confirmedStatus == 'CheckedOut',
          _StopAction.checkout => confirmedStatus == 'CheckedOut',
          _StopAction.skip => confirmedStatus == 'Skipped',
        };
        if (confirmed) {
          setState(() {
            _drafts.remove(draftKey);
            if (action != _StopAction.checkin) _expanded.remove(stop.id);
          });
          unawaited(HapticFeedback.lightImpact().catchError((Object _) {}));
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Đã đồng bộ trạng thái ghi nhận từ hệ thống.'),
          ));
          if (action != _StopAction.checkin && current.canCheckInLocations &&
              current.nextLocationCheckInId != stop.id) {
            advanceTo = current.nextLocationCheckInId;
          }
        } else {
          setState(() {
            error = readableError(e);
            errorStop = confirmedStatus == null ? null : stop.id;
            _errorAction = action;
          });
        }
      }
    } finally {
      if (mounted) setState(() => busy = null);
    }
    if (mounted && advanceTo != null && scrollGeneration == _scrollGeneration &&
        ModalRoute.of(context)?.isCurrent == true) {
      unawaited(_scrollToNext(advanceTo, stop.id));
    }
  }

  Future<void> _scrollToNext(int id, int previous) async {
    final generation = ++_scrollGeneration;
    final stops = _stops;
    final index = stops.indexWhere((stop) => stop.id == id);
    final from = stops.indexWhere((stop) => stop.id == previous);
    if (index < 0) return;
    final direction = from >= 0 && index < from ? -1 : 1;
    final reducedMotion = MediaQuery.disableAnimationsOf(context);
    await WidgetsBinding.instance.endOfFrame;
    // A lazily-built target may not yet have a context. Move a viewport at
    // a time until it is mounted. Any manual drag cancels this operation.
    for (var attempt = 0; attempt <= stops.length + 2; attempt++) {
      if (!mounted || generation != _scrollGeneration || !_scroll.hasClients ||
          ModalRoute.of(context)?.isCurrent != true) {
        return;
      }
      final target = _anchors[id]?.currentContext;
      if (target != null && target.mounted) {
        await Scrollable.ensureVisible(target,
          alignment: 0.06,
          duration: reducedMotion ? Duration.zero : const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
        );
        return;
      }
      final position = _scroll.position;
      final offset = (position.pixels + direction * position.viewportDimension * 0.8)
          .clamp(position.minScrollExtent, position.maxScrollExtent).toDouble();
      if ((offset - position.pixels).abs() < 1) return;
      if (reducedMotion) {
        _scroll.jumpTo(offset);
      } else {
        await _scroll.animateTo(offset, duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic);
      }
      await WidgetsBinding.instance.endOfFrame;
    }
  }

  Future<void> reportIncident() async {
    _scrollGeneration++;
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => IncidentScreen(detail: current, guides: widget.guides),
    ));
    if (mounted) await refresh();
  }

  @override
  Widget build(BuildContext context) {
    final stops = _stops;
    final checked = stops.where((s) => s.status == 'CheckedOut' || s.status == 'Skipped').length;
    final enabledByDate = current.canCheckInLocations;
    final header = <Widget>[
          Text(current.name, style: const TextStyle(
            color: muted, fontSize: 12, fontWeight: FontWeight.w600,
          )),
          space(15),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: GuideGlassMetric(
                  icon: Icons.place_outlined, value: stops.length,
                  label: 'Tổng điểm dừng',
                  color: const Color(0xFF315F91),
                  tint: const Color(0xFFCFE0F7),
                )),
                const SizedBox(width: 9),
                Expanded(child: GuideGlassMetric(
                  icon: Icons.check_circle_outline, value: checked,
                  label: 'Đã hoàn thành',
                  color: deepTeal,
                  tint: const Color(0xFFB9E1DE),
                )),
                const SizedBox(width: 9),
                Expanded(child: GuideGlassMetric(
                  icon: Icons.schedule_outlined,
                  value: stops.length - checked,
                  label: 'Chưa hoàn thành',
                  color: const Color(0xFF87601C),
                  tint: const Color(0xFFF2E1BE),
                )),
              ],
            ),
          ),

      if (!enabledByDate) ...[
        space(15),
        LocationWarningBanner(
          icon: Icons.lock_clock_outlined,
          title: 'Chưa thể check-in',
          message: 'Chưa đến ngày khởi hành chặng được giao (${vnDate(current.startDate)}) hoặc tour không còn cho phép check-in.',
        ),
      ],
      if (error != null && errorStop == null) ...[
        space(10),
        LocationWarningBanner(icon: Icons.error_outline, title: 'Không thể tải dữ liệu',
          message: error!, isError: true),
      ],
      space(22),
      GuideSectionTitle('Lịch trình (${current.days.length} ngày)'),
      space(10),
      if (stops.isEmpty)
        const GuideEmptyState(title: 'Chưa có điểm dừng',
          message: 'Backend chưa trả về lịch trình check-in.'),
    ];
    final rows = <({TourDay day, TourStop? stop, int order, bool last})>[];
    var order = 0;
    for (final day in current.days) {
      rows.add((day: day, stop: null, order: 0, last: false));
      for (var i = 0; i < day.stops.length; i++) {
        rows.add((day: day, stop: day.stops[i], order: ++order, last: i == day.stops.length - 1));
      }
    }
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        flexibleSpace: const GuideGlass(radius: 0, shadow: false, blurSigma: 12, child: SizedBox.expand()),
        leading: Navigator.canPop(context) ? IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () => Navigator.maybePop(context),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        ) : null,
        title: const Text('Check-in / Check-out địa điểm'),
        actions: [
          IconButton(
            tooltip: 'Tải lại trạng thái từ backend',
            onPressed: busy == null && !_openingSheet && !_refreshing ? refresh : null,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),

      body: NotificationListener<ScrollStartNotification>(
        onNotification: (notification) {
          if (notification.dragDetails != null) _scrollGeneration++;
          return false;
        },
        child: ListView.builder(
          controller: _scroll,
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
          itemCount: header.length + rows.length,
          itemBuilder: (context, index) {
            if (index < header.length) return header[index];
            final row = rows[index - header.length];
            final stop = row.stop;
            if (stop == null) return LocationDayHeading(day: row.day);
            final canCheck = _allowed(stop, _StopAction.checkin);
            final canCheckout = _allowed(stop, _StopAction.checkout);
            final locked = busy != null || _openingSheet || _refreshing;
            final retryAction = errorStop == stop.id ? _errorAction : null;
            return GuideStopCard(
              key: _anchors.putIfAbsent(stop.id, () => GlobalKey()),
              stop: stop, order: row.order, last: row.last,
              dateAllowed: enabledByDate, isNext: current.nextLocationCheckInId == stop.id,
              canCheck: canCheck && !locked, canCheckout: canCheckout && !locked,
              busy: busy == stop.id, expanded: _expanded.contains(stop.id),
              onExpand: () => setState(() {
                if (!_expanded.add(stop.id)) _expanded.remove(stop.id);
              }),
              onCheck: () => _perform(stop, _StopAction.checkin),
              onCheckout: () => _perform(stop, _StopAction.checkout),
              onSkip: () => _perform(stop, _StopAction.skip),
              onIncident: reportIncident,
              cache: _photos,
              error: errorStop == stop.id ? error : null,
              onRetry: retryAction != null && !locked &&
                  _drafts.containsKey((stop.id, retryAction)) && _allowed(stop, retryAction)
                  ? () => _perform(stop, retryAction) : null,
            );
          },
        ),
      ),
    );
  }
}
