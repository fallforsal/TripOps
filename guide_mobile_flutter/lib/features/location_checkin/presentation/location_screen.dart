import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../incidents/presentation/incident_screen.dart';
import 'checkin_photo_dialog.dart';

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
  final Map<String, Future<Uint8List>> photoDownloads = {};

  Future<void> refresh() async {
    if (busy != null) return;
    try {
      final updated = await widget.guides.detail(current.id);
      if (mounted) {
        setState(() {
          current = updated;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = readableError(e));
    }
  }

  Future<void> check(TourStop stop) async {
    if (busy != null ||
        !current.canCheckInLocations ||
        current.nextLocationCheckInId != stop.id ||
        stop.status == 'CheckedIn' ||
        stop.status == 'CheckedOut' ||
        stop.status == 'Skipped') {
      return;
    }

    final submission = await showDialog<CheckinSubmission>(
      context: context,
      builder: (context) => CheckinPhotoDialog(stopName: stop.name),
    );
    if (submission == null || !mounted) return;
    setState(() {
      busy = stop.id;
      error = null;
    });

    try {
      final note = submission.note.isEmpty ? null : submission.note;
      final updated = await widget.guides.checkInWithImages(
              current.id, stop.id, note, submission.images);
      if (!mounted) return;
      setState(() => current = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check-in địa điểm thành công.')),
      );
    } catch (e) {
      // The backend checks actual eligibility again on each submission;
      // refresh server state when a predecessor/date changes during the call.
      if (e is ApiFailure && e.statusCode == 409) {
        try {
          final updated = await widget.guides.detail(current.id);
          if (mounted) setState(() => current = updated);
        } catch (_) {
          // Preserve the original validation error.
        }
      }
      if (mounted) setState(() => error = readableError(e));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  Future<void> skip(TourStop stop) async {
    if (busy != null ||
        !current.canCheckInLocations ||
        current.nextLocationCheckInId != stop.id ||
        stop.status == 'CheckedIn' ||
        stop.status == 'CheckedOut' ||
        stop.status == 'Skipped') {
      return;
    }

    final submission = await showDialog<CheckinSubmission>(
      context: context,
      builder: (_) => CheckinPhotoDialog(stopName: stop.name, isSkip: true),
    );
    if (submission == null || !mounted) return;

    setState(() {
      busy = stop.id;
      error = null;
    });
    try {
      final note = submission.note.isEmpty ? null : submission.note;
      final updated = await widget.guides.checkInWithImages(
        current.id,
        stop.id,
        note,
        submission.images,
        status: 'Skipped',
      );
      if (!mounted) return;
      setState(() => current = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã ghi nhận bỏ qua điểm dừng.')),
      );
    } catch (e) {
      if (e is ApiFailure && e.statusCode == 409) {
        try {
          final updated = await widget.guides.detail(current.id);
          if (mounted) setState(() => current = updated);
        } catch (_) {
          // Preserve the original validation error.
        }
      }
      if (mounted) setState(() => error = readableError(e));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  Future<void> checkout(TourStop stop) async {
    if (busy != null || !current.canCheckInLocations ||
        current.nextLocationCheckInId != stop.id || stop.status != 'CheckedIn') { return; }
    final submission = await showDialog<CheckinSubmission>(
      context: context,
      builder: (_) => CheckinPhotoDialog(stopName: stop.name, isCheckout: true),
    );
    if (submission == null || !mounted) return;
    setState(() { busy = stop.id; error = null; });
    try {
      final updated = await widget.guides.checkOutWithImages(
        current.id, stop.id, submission.note.isEmpty ? null : submission.note,
        submission.images,
      );
      if (!mounted) return;
      setState(() => current = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check-out thành công. Có thể đến điểm tiếp theo.')),
      );
    } catch (e) {
      if (e is ApiFailure && e.statusCode == 409) {
        try {
          final updated = await widget.guides.detail(current.id);
          if (mounted) setState(() => current = updated);
        } catch (_) {}
      }
      if (mounted) setState(() => error = readableError(e));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  Future<void> reportIncident() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => IncidentScreen(detail: current, guides: widget.guides),
      ),
    );
    if (mounted) await refresh();
  }

  Widget _buildProofSection({
    required String title,
    required List<String> urls,
    required String? note,
    required String notePrefix,
  }) {
    final trimmedNote = note?.trim() ?? '';
    final hasNote = trimmedNote.isNotEmpty;
    if (urls.isEmpty && !hasNote) return const SizedBox.shrink();

    Widget noteBox() => Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Text(
        '$notePrefix: $trimmedNote',
        style: const TextStyle(fontSize: 12, color: ink),
      ),
    );

    Widget photoThumb(String url) => ClipRRect(
      borderRadius: BorderRadius.circular(9),
      child: FutureBuilder<Uint8List>(
        future: photoDownloads.putIfAbsent(url, () => widget.guides.imageBytes(url)),
        builder: (context, snapshot) => snapshot.hasData
            ? Image.memory(snapshot.data!, width: 64, height: 64, fit: BoxFit.cover)
            : Container(
                width: 64,
                height: 64,
                color: paleTeal,
                child: Icon(
                  snapshot.hasError
                      ? Icons.broken_image_outlined
                      : Icons.hourglass_bottom_outlined,
                  color: muted,
                ),
              ),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        space(8),
        if (urls.isNotEmpty) ...[
          Text(title, style: const TextStyle(
            fontSize: 11, color: ink, fontWeight: FontWeight.w700,
          )),
          space(6),
        ],
        if (urls.isNotEmpty && hasNote)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 140),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [for (final url in urls) photoThumb(url)],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(child: noteBox()),
            ],
          )
        else if (urls.isNotEmpty)
          Wrap(
            spacing: 7,
            runSpacing: 7,
            children: [for (final url in urls) photoThumb(url)],
          )
        else
          noteBox(),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final stops = current.days.expand((d) => d.stops).toList();
    final checked = stops
        .where((s) => s.status == 'CheckedOut' || s.status == 'Skipped')
        .length;
    final nextId = current.nextLocationCheckInId;
    final enabledByDate = current.canCheckInLocations;

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
            onPressed: busy == null ? refresh : null,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
        children: [
          Text(current.name, style: const TextStyle(
            color: muted, fontSize: 12, fontWeight: FontWeight.w600,
          )),
          space(15),
          Row(children: [
            Expanded(child: GuideMetric(
              icon: Icons.place_outlined, value: '${stops.length}',
              label: 'Tổng điểm dừng',
            )),
            const SizedBox(width: 9),
            Expanded(child: GuideMetric(
              icon: Icons.check_circle_outline, value: '$checked',
              label: 'Đã hoàn thành',
            )),
            const SizedBox(width: 9),
            Expanded(child: GuideMetric(
              icon: Icons.schedule_outlined,
              value: '${stops.length - checked}',
              label: 'Chưa hoàn thành',
              iconColor: const Color(0xFFB78330),
              tint: const Color(0xFFFFF3DF),
            )),
          ]),
          if (!enabledByDate) ...[
            space(15),
            GuideInfoBanner(
              icon: Icons.lock_clock_outlined,
              warning: true,
              message:
                  'Chưa đến ngày khởi hành chặng được giao (${vnDate(current.startDate)}) hoặc tour không còn cho phép check-in.',
            ),
          ],
          if (error != null) ...[
            space(10),
            GuideInfoBanner(
              message: error!, icon: Icons.error_outline, warning: true,
            ),
          ],
          space(22),
          GuideSectionTitle('Lịch trình (${current.days.length} ngày)'),
          space(10),
          if (stops.isEmpty)
            const GuideEmptyState(
              title: 'Chưa có điểm dừng',
              message: 'Backend chưa trả về lịch trình check-in.',
            ),
          ...current.days.map((day) => Padding(
            padding: const EdgeInsets.only(bottom: 17),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Container(
                    alignment: Alignment.center,
                    height: 32, width: 32,
                    decoration: BoxDecoration(
                      color: paleTeal,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text('${day.dayNumber}', style: const TextStyle(
                      color: deepTeal, fontWeight: FontWeight.w900,
                    )),
                  ),
                  const SizedBox(width: 9),
                  Expanded(child: Text(day.title, style: const TextStyle(
                    fontSize: 14, color: ink, fontWeight: FontWeight.w800,
                  ))),
                ]),
                space(12),
                ...day.stops.map((stop) {
                  final skipped = stop.status == 'Skipped';
                  final checkedIn = stop.status == 'CheckedIn';
                  final checkedOut = stop.status == 'CheckedOut';
                  final isNext = nextId == stop.id && !checkedOut && !skipped;
                  final canCheck = enabledByDate && isNext &&
                      !checkedIn && busy == null;
                  final canSkip = enabledByDate && isNext &&
                      !checkedIn && busy == null;
                  final canCheckout = enabledByDate && isNext && checkedIn && busy == null;
                  final blockedReason = checkedOut
                      ? 'Đã hoàn thành check-out'
                      : skipped
                          ? 'Đã bỏ qua điểm này'
                          : checkedIn
                              ? 'Đang ở điểm này · cần check-out'
                              : !enabledByDate
                                  ? 'Chưa đến ngày khởi hành chặng (${vnDate(current.startDate)})'
                                  : !isNext
                                      ? 'Cần check-out điểm trước đó'
                                      : 'Sẵn sàng check-in hoặc bỏ qua';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                        side: BorderSide(color: isNext ? const Color(0xFF7CC5BF) : Colors.white, width: isNext ? 1.6 : 1),
                      ),
                      child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Container(
                              height: 39, width: 39,
                              decoration: BoxDecoration(
                                color: checkedIn || checkedOut
                                    ? paleTeal
                                    : skipped
                                        ? const Color(0xFFFFECEC)
                                        : const Color(0xFFEEF2F8),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Icon(
                                checkedIn || checkedOut
                                    ? Icons.check_circle_outline
                                    : skipped
                                        ? Icons.block_outlined
                                        : Icons.location_on_outlined,
                                size: 21,
                                color: checkedIn || checkedOut
                                    ? teal
                                    : skipped
                                        ? const Color(0xFFC05F5F)
                                        : muted,
                              ),
                            ),
                            const SizedBox(width: 11),
                            Expanded(child: Text(stop.name,
                              style: const TextStyle(
                                fontSize: 13, color: ink,
                                fontWeight: FontWeight.w800,
                              ))),
                            GuideStatusPill(
                              checkedOut
                                  ? 'Đã check-out'
                                  : checkedIn
                                      ? 'Đã check-in'
                                  : skipped
                                      ? 'Đã bỏ qua'
                                      : isNext
                                          ? 'Đến lượt'
                                          : 'Đang khóa',
                              background: checkedIn || checkedOut
                                  ? paleTeal
                                  : skipped
                                      ? const Color(0xFFFFE8E8)
                                      : const Color(0xFFEEF2F8),
                              foreground: checkedIn || checkedOut
                                  ? deepTeal
                                  : skipped
                                      ? const Color(0xFFC05F5F)
                                      : muted,
                            ),
                            if (checkedOut || skipped) ...[
                              const SizedBox(width: 4),
                              IconButton(
                                key: ValueKey('incident-${stop.id}'),
                                tooltip: 'Báo cáo sự cố',
                                visualDensity: VisualDensity.compact,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints.tightFor(width: 32, height: 32),
                                onPressed: reportIncident,
                                icon: const Icon(
                                  Icons.report_problem_outlined,
                                  size: 20,
                                  color: Color(0xFFB78330),
                                ),
                              ),
                            ],
                          ]),
                          space(8),
                          Text(blockedReason, style: const TextStyle(
                            fontSize: 12, color: muted,
                          )),
                          _buildProofSection(
                            title: skipped ? 'Ảnh bỏ qua đã gửi' : 'Ảnh check-in đã gửi',
                            urls: stop.photoUrls,
                            note: stop.checkinNote,
                            notePrefix: skipped ? 'Lý do bỏ qua' : 'Ghi chú check-in',
                          ),
                          _buildProofSection(
                            title: 'Ảnh check-out đã gửi',
                            urls: stop.checkoutPhotoUrls,
                            note: stop.checkoutNote,
                            notePrefix: 'Ghi chú check-out',
                          ),
                          if (busy == stop.id) ...[
                            space(9),
                            const LinearProgressIndicator(),
                          ],
                          if (!checkedOut && !skipped) ...[
                            space(10),
                            if (!checkedIn)
                              Row(children: [
                                Expanded(
                                  child: FilledButton.icon(
                                    key: ValueKey('checkin-${stop.id}'),
                                    onPressed: canCheck ? () => check(stop) : null,
                                    style: FilledButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 10),
                                    ),
                                    icon: const Icon(Icons.check_circle_outline, size: 17),
                                    label: const Text('Check-in điểm đến'),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  key: ValueKey('skip-${stop.id}'),
                                  onPressed: canSkip ? () => skip(stop) : null,
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 12),
                                  ),
                                  icon: const Icon(Icons.skip_next_rounded, size: 18),
                                  label: const Text('Bỏ qua'),
                                ),
                                const SizedBox(width: 4),
                                IconButton(
                                  key: ValueKey('incident-${stop.id}'),
                                  tooltip: 'Báo cáo sự cố',
                                  onPressed: reportIncident,
                                  icon: const Icon(Icons.report_problem_outlined, color: Color(0xFFB78330)),
                                ),
                              ])
                            else
                              Row(children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    key: ValueKey('checkout-${stop.id}'),
                                    onPressed: canCheckout ? () => checkout(stop) : null,
                                    icon: const Icon(Icons.camera_alt_outlined, size: 18),
                                    label: const Text('Check-out'),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                IconButton(
                                  key: ValueKey('incident-${stop.id}'),
                                  tooltip: 'Báo cáo sự cố',
                                  onPressed: reportIncident,
                                  icon: const Icon(Icons.report_problem_outlined, color: Color(0xFFB78330)),
                                ),
                              ]),
                          ],
                        ],
                      ),
                    )),
                  );
                }),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
