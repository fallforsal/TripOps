import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
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
        stop.status == 'CheckedOut') {
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

  Future<void> checkout(TourStop stop) async {
    if (busy != null || !current.canCheckInLocations ||
        current.nextLocationCheckInId != stop.id || stop.status != 'CheckedIn') return;
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

  @override
  Widget build(BuildContext context) {
    final stops = current.days.expand((d) => d.stops).toList();
    final checked = stops.where((s) => s.status == 'CheckedOut').length;
    final nextId = current.nextLocationCheckInId;
    final enabledByDate = current.canCheckInLocations;

    return Scaffold(
      appBar: AppBar(
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
              label: 'Đã check-out',
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
          space(15),
          GuideInfoBanner(
            icon: enabledByDate ? Icons.route_outlined : Icons.lock_clock_outlined,
            warning: !enabledByDate,
            message: enabledByDate
                ? 'Chụp ảnh trực tiếp khi check-in và check-out. Chỉ sau '
                  'check-out điểm hiện tại mới mở điểm tiếp theo; không cần GPS.'
                : 'Chưa đến ngày khởi hành hoặc tour không còn cho phép check-in.',
          ),
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
                  final isNext = nextId == stop.id && !checkedOut;
                  final canCheck = enabledByDate && isNext &&
                      !checkedIn && busy == null;
                  final canCheckout = enabledByDate && isNext && checkedIn && busy == null;
                  final blockedReason = checkedOut
                      ? 'Đã hoàn thành check-out'
                      : checkedIn
                          ? 'Đang ở điểm này · cần check-out'
                          : skipped
                              ? 'Điểm bỏ qua trước đây cần check-in lại'
                              : !enabledByDate
                                  ? 'Chưa đến ngày khởi hành'
                                  : !isNext
                                      ? 'Cần check-out điểm trước đó'
                                      : 'Sẵn sàng check-in';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Card(child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Container(
                              height: 39, width: 39,
                              decoration: BoxDecoration(
                                color: checkedIn
                                    ? paleTeal
                                    : skipped
                                        ? const Color(0xFFFFECEC)
                                        : const Color(0xFFEEF2F8),
                                borderRadius: BorderRadius.circular(11),
                              ),
                              child: Icon(
                                checkedIn
                                    ? Icons.check_circle_outline
                                    : skipped
                                        ? Icons.block_outlined
                                        : Icons.location_on_outlined,
                                size: 21,
                                color: checkedIn
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
                          ]),
                          space(10),
                          Text(blockedReason, style: const TextStyle(
                            fontSize: 11, color: muted,
                          )),
                          if (stop.checkinNote != null && stop.checkinNote!.trim().isNotEmpty) ...[
                            space(8),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                'Ghi chú HDV: ${stop.checkinNote!.trim()}',
                                style: const TextStyle(fontSize: 12, color: ink),
                              ),
                            ),
                          ],
                          if (stop.photoUrls.isNotEmpty) ...[
                            space(8),
                            const Text('Ảnh check-in đã gửi',
                              style: TextStyle(fontSize: 11,
                                color: ink, fontWeight: FontWeight.w700)),
                            space(6),
                            Wrap(spacing: 7, runSpacing: 7, children: [
                              for (final url in stop.photoUrls)
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(9),
                                  child: FutureBuilder<Uint8List>(
                                    future: photoDownloads.putIfAbsent(url,
                                        () => widget.guides.imageBytes(url)),
                                    builder: (context, snapshot) =>
                                        snapshot.hasData
                                            ? Image.memory(snapshot.data!,
                                                width: 69, height: 69,
                                                fit: BoxFit.cover)
                                            : Container(
                                                width: 69, height: 69,
                                                color: paleTeal,
                                                child: Icon(
                                                  snapshot.hasError
                                                      ? Icons.broken_image_outlined
                                                      : Icons.hourglass_bottom_outlined,
                                                  color: muted),
                                              ),
                                  ),
                                ),
                            ]),
                          ],
                          if (stop.checkoutPhotoUrls.isNotEmpty) ...[
                            space(8),
                            const Text('Ảnh check-out đã gửi', style: TextStyle(
                              fontSize: 11, color: ink, fontWeight: FontWeight.w700)),
                            Wrap(spacing: 7, runSpacing: 7, children: [
                              for (final url in stop.checkoutPhotoUrls)
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(9),
                                  child: FutureBuilder<Uint8List>(
                                    future: photoDownloads.putIfAbsent(url,
                                        () => widget.guides.imageBytes(url)),
                                    builder: (context, snapshot) => snapshot.hasData
                                        ? Image.memory(snapshot.data!, width: 69, height: 69, fit: BoxFit.cover)
                                        : Container(width: 69, height: 69, color: paleTeal,
                                            child: Icon(snapshot.hasError
                                                ? Icons.broken_image_outlined
                                                : Icons.hourglass_bottom_outlined, color: muted)),
                                  ),
                                ),
                            ]),
                          ],
                          if (stop.checkoutNote?.trim().isNotEmpty == true) ...[
                            space(8),
                            Text('Ghi chú check-out: ${stop.checkoutNote!}'),
                          ],
                          if (busy == stop.id) ...[
                            space(9),
                            const LinearProgressIndicator(),
                          ],
                          space(10),
                          Row(children: [
                            Expanded(
                              child: FilledButton.icon(
                                key: ValueKey('checkin-${stop.id}'),
                                onPressed: canCheck ? () => check(stop) : null,
                                icon: const Icon(Icons.check_circle_outline, size: 17),
                                label: const Text('Check-in điểm đến'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton.icon(
                              key: ValueKey('checkout-${stop.id}'),
                              onPressed: canCheckout ? () => checkout(stop) : null,
                              icon: const Icon(Icons.camera_alt_outlined, size: 18),
                              label: const Text('Check-out'),
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
