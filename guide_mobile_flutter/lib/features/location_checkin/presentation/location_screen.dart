import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';

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

  Future<void> refresh() async {
    if (busy != null) return;
    try {
      final updated = await widget.guides.detail(current.id);
      if (mounted) setState(() {
        current = updated;
        error = null;
      });
    } catch (e) {
      if (mounted) setState(() => error = readableError(e));
    }
  }

  Future<Position> currentGps() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw StateError('Hãy bật GPS/Dịch vụ vị trí trên điện thoại.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw StateError('Cần cấp quyền vị trí để check-in.');
    }
    if (permission == LocationPermission.deniedForever) {
      throw StateError('Quyền vị trí đã bị chặn. Hãy cấp quyền trong Cài đặt.');
    }
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 20),
      ),
    );
    if (position.accuracy > 100 || position.accuracy < 0) {
      throw StateError(
        'GPS chưa đủ chính xác (±${position.accuracy.round()} m). '
        'Hãy ra vị trí thoáng và thử lại.',
      );
    }
    return position;
  }

  Future<void> check(TourStop stop) async {
    if (busy != null ||
        !current.canCheckInLocations ||
        current.nextLocationCheckInId != stop.id ||
        !stop.hasGpsReference ||
        stop.status == 'CheckedIn') {
      return;
    }

    final noteController = TextEditingController();
    final note = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Check-in ${stop.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Ứng dụng sẽ lấy GPS hiện tại và backend kiểm tra '
                'bạn có đang ở gần điểm đến hay không.'),
            const SizedBox(height: 12),
            TextField(
              controller: noteController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Ghi chú (không bắt buộc)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context),
              child: const Text('Hủy')),
          FilledButton(
            onPressed: () => Navigator.pop(context, noteController.text.trim()),
            child: const Text('Xác nhận GPS'),
          ),
        ],
      ),
    );
    noteController.dispose();
    if (note == null || !mounted) return;
    setState(() {
      busy = stop.id;
      error = null;
    });

    try {
      final position = await currentGps();
      final updated = await widget.guides.checkIn(
        current.id,
        stop.id,
        'CheckedIn',
        note.isEmpty ? null : note,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
        recordedAtUtc: position.timestamp.toUtc(),
      );
      if (!mounted) return;
      setState(() => current = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check-in GPS được backend xác nhận.')),
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

  @override
  Widget build(BuildContext context) {
    final stops = current.days.expand((d) => d.stops).toList();
    final checked = stops.where((s) => s.status == 'CheckedIn').length;
    final nextId = current.nextLocationCheckInId;
    final enabledByDate = current.canCheckInLocations;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Check-in địa điểm'),
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
              label: 'Đã check-in',
            )),
            const SizedBox(width: 9),
            Expanded(child: GuideMetric(
              icon: Icons.schedule_outlined,
              value: '${stops.length - checked}',
              label: 'Chưa check-in',
              iconColor: const Color(0xFFB78330),
              tint: const Color(0xFFFFF3DF),
            )),
          ]),
          space(15),
          GuideInfoBanner(
            icon: enabledByDate ? Icons.gps_fixed : Icons.lock_clock_outlined,
            warning: !enabledByDate,
            message: enabledByDate
                ? 'Check-in theo đúng thứ tự hành trình. '
                  'Ứng dụng lấy GPS mới tại thời điểm xác nhận; '
                  'backend kiểm tra phạm vi điểm dừng.'
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
                  final done = stop.status == 'CheckedIn';
                  final isNext = nextId == stop.id && !done;
                  final canCheck = enabledByDate && isNext &&
                      stop.hasGpsReference && busy == null;
                  final blockedReason = done
                      ? 'Đã hoàn thành'
                      : !enabledByDate
                          ? 'Chưa đến ngày khởi hành'
                          : !isNext
                              ? 'Cần check-in điểm trước đó'
                              : !stop.hasGpsReference
                                  ? 'Agency chưa cấu hình GPS điểm này'
                                  : 'Sẵn sàng xác nhận GPS';
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
                                color: done ? paleTeal : const Color(0xFFEEF2F8),
                                borderRadius: BorderRadius.circular(11),
                              ),
                              child: Icon(
                                done ? Icons.check_circle_outline :
                                    Icons.location_on_outlined,
                                size: 21, color: done ? teal : muted,
                              ),
                            ),
                            const SizedBox(width: 11),
                            Expanded(child: Text(stop.name,
                              style: const TextStyle(
                                fontSize: 13, color: ink,
                                fontWeight: FontWeight.w800,
                              ))),
                            GuideStatusPill(done ? 'Đã check-in' :
                                isNext ? 'Đến lượt' : 'Đang khóa',
                              background: done ? paleTeal :
                                  const Color(0xFFEEF2F8),
                              foreground: done ? deepTeal : muted),
                          ]),
                          space(10),
                          Text(blockedReason, style: const TextStyle(
                            fontSize: 11, color: muted,
                          )),
                          if (stop.hasGpsReference)
                            Text('Phạm vi GPS: ${stop.geofenceRadiusMeters} m',
                              style: const TextStyle(fontSize: 11, color: muted)),
                          if (busy == stop.id) ...[
                            space(9),
                            const LinearProgressIndicator(),
                          ],
                          space(10),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              onPressed: canCheck ? () => check(stop) : null,
                              icon: const Icon(Icons.gps_fixed, size: 17),
                              label: const Text('Xác nhận check-in GPS'),
                            ),
                          ),
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
