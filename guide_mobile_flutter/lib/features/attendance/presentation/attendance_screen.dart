import 'dart:async';

import 'package:flutter/material.dart';
import '../../../core/widgets/guide_glass.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/guide_glass_metric.dart';
import '../../../core/widgets/guide_search_bar.dart';
import '../../../core/widgets/guide_segmented_control.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../domain/attendance_filter.dart';
import '../domain/passenger_contact.dart';
import 'attendance_progress_card.dart';
import 'guide_passenger_card.dart';

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

  /// Recheck the server's attendance permission after crossing midnight
  /// or returning to the app. Backend remains the source of truth.
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

  Future<void> callPassenger(String phone) async {
    final digits = dialablePassengerPhone(phone);
    if (digits == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Số điện thoại không hợp lệ để gọi.')),
      );
      return;
    }

    try {
      final opened = await launchUrl(
        Uri.parse('tel:$digits'),
        mode: LaunchMode.externalApplication,
      );
      if (!opened && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không mở được ứng dụng gọi điện.')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không mở được ứng dụng gọi điện.')),
      );
    }
  }

  Future<void> copyPassengerPhone(String phone) async {
    await Clipboard.setData(ClipboardData(text: phone));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Đã sao chép số điện thoại.')),
    );
  }

  Future<void> editNote(Passenger passenger) async {
    if (busy != null || !current.canRecordAttendance) return;
    final saved = await showGuideTextInputDialog(
      context: context,
      title: 'Ghi chú · ${passenger.name}',
      hintText: 'Nhập ghi chú điểm danh (VD: đến muộn, lý do vắng...)',
      initialValue: passenger.statusNote ?? '',
    );
    if (saved == null || !mounted) return;
    await update(passenger, passenger.status, note: saved.trim());
  }

  Future<void> update(Passenger passenger, String status, {String? note}) async {
    if (busy != null || !current.canRecordAttendance) return;
    if (note == null && status == passenger.status) return;
    setState(() { busy = passenger.id; error = null; });
    try {
      await widget.guides.attendance(current.id, passenger.id, status, note: note);
      final updated = await widget.guides.detail(current.id);
      if (mounted) {
        setState(() => current = updated);
        if (status != passenger.status && updated.passengers.any(
          (p) => p.id == passenger.id && p.status == status,
        )) {
          unawaited(HapticFeedback.selectionClick().catchError((Object _) {}));
        }
      }
    } catch (e) {
      // If midnight passed while this screen was open, refresh the flag from
      // the backend so all action buttons become disabled immediately.
      if (e is ApiFailure && e.statusCode == 409) {
        try {
          final updated = await widget.guides.detail(current.id);
          if (mounted) setState(() => current = updated);
        } catch (_) { /* Keep the original authorization error visible. */ }
      }
      if (mounted) setState(() => error = readableError(e));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final all = filterPassengers(current.passengers);
    final passengers = filterPassengers(
      current.passengers, filter: filter, query: query,
    );
    final checked = all.where((p) => p.status == 'CheckedIn').length;
    final absent = all.where((p) => p.status == 'Absent').length;
    final pending = all.where((p) => p.status == 'Pending').length;
    final canRecord = current.canRecordAttendance;

    final header = <Widget>[
      Text(current.name, style: const TextStyle(
        color: muted, fontSize: 12, fontWeight: FontWeight.w600,
      )),
      space(14),
      IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: GuideGlassMetric(
              icon: Icons.groups_outlined, value: all.length,
              label: 'Tổng hành khách',
              color: const Color(0xFF315F91),
              tint: const Color(0xFFCFE0F7),
            )),
            const SizedBox(width: 9),
            Expanded(child: GuideGlassMetric(
              icon: Icons.check_circle_outline, value: checked,
              label: 'Đã có mặt',
              color: deepTeal,
              tint: const Color(0xFFB9E1DE),
            )),
            const SizedBox(width: 9),
            Expanded(child: GuideGlassMetric(
              icon: Icons.hourglass_empty_rounded,
              value: pending, label: 'Chưa điểm danh',
              color: const Color(0xFF87601C),
              tint: const Color(0xFFF2E1BE),
            )),
          ],
        ),
      ),
      space(16),
      AttendanceProgressCard(
        key: const ValueKey('attendance-progress'),
        total: all.length,
        present: checked,
        absent: absent,
      ),
      space(14),
      if (!canRecord) ...[
        GuideInfoBanner(
          icon: Icons.lock_clock_outlined,
          warning: true,
          message: 'Chỉ được điểm danh vào ngày bắt đầu chặng được giao '
              '${vnDate(current.attendanceDate ?? current.startDate)}. '
              'Bạn vẫn có thể xem danh sách và trạng thái đã ghi nhận.',
        ),
        space(10),
      ],
      space(20),
      const GuideSectionTitle('Danh sách hành khách'),
      space(11),
      GuideSearchBar(
        value: query,
        placeholder: 'Tìm tên hoặc SĐT',
        fieldKey: const ValueKey('passenger-search'),
        onChanged: (value) => setState(() => query = value),
      ),
      space(11),
      GuideSegmentedControl<AttendanceFilter>(
        key: const ValueKey('attendance-filter-segmented-control'),
        value: filter,
        labels: {
          for (final option in AttendanceFilter.values)
            option: attendanceFilterLabel(option),
        },
        onChanged: (option) => setState(() => filter = option),
      ),
      space(13),
      if (error != null) ...[
        GuideInfoBanner(message: error!,
          icon: Icons.error_outline, warning: true),
        space(10),
      ],
      if (passengers.isEmpty)
        const GuideEmptyState(
          title: 'Không tìm thấy hành khách',
          message: 'Thử tìm kiếm hoặc chọn lại bộ lọc điểm danh.',
          icon: Icons.person_search_outlined,
        ),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        flexibleSpace: const GuideGlass(radius: 0, shadow: false, blurSigma: 12, child: SizedBox.expand()),
        leading: Navigator.canPop(context) ? IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () => Navigator.maybePop(context),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        ) : null,
        title: const Text('Điểm danh hành khách'),
        actions: [
          IconButton(
            tooltip: 'Kiểm tra lại ngày và quyền điểm danh',
            onPressed: busy == null ? refresh : null,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 26),
        itemCount: header.length + passengers.length,
        itemBuilder: (context, index) {
          if (index < header.length) return header[index];
          final p = passengers[index - header.length];
          return GuidePassengerCard(
            key: ValueKey('passenger-card-${p.id}'),
            passenger: p,
            canRecord: canRecord,
            busy: busy == p.id,
            actionsLocked: busy != null,
            onStatusChanged: (status) => update(p, status),
            onEditNote: () => editNote(p),
            onCopyPhone: copyPassengerPhone,
            onCallPhone: callPassenger,
          );
        },
      ),
    );
  }
}
