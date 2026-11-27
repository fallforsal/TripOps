import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../../core/widgets/guide_segmented_control.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../../core/widgets/view_helpers.dart';
import '../../assigned_tours/data/guide_repository.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../location_checkin/domain/checkin_photo.dart';
import '../../location_checkin/presentation/location_evidence_gallery.dart';
import '../domain/incident_categories.dart';
import 'guide_incident_card.dart';
import 'incident_glass_components.dart';
import 'incident_photo_picker.dart';

enum _IncidentTab { report, history }

class IncidentScreen extends StatefulWidget {
  const IncidentScreen({super.key, required this.detail, required this.guides});
  final BookingDetail detail;
  final GuideRepository guides;
  @override
  State<IncidentScreen> createState() => _IncidentScreenState();
}

class _IncidentScreenState extends State<IncidentScreen> {
  final form = GlobalKey<FormState>();
  final _categoryKey = GlobalKey<FormFieldState<String>>();
  final _titleKey = GlobalKey<FormFieldState<String>>();
  final _descriptionKey = GlobalKey<FormFieldState<String>>();
  final _categoryFocus = FocusNode();
  final _titleFocus = FocusNode();
  final _descriptionFocus = FocusNode();
  final title = TextEditingController();
  final description = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  final List<CheckinPhoto> _selectedPhotos = [];
  final _photoAnchor = GlobalKey();
  late final _photoCache = LocationPhotoCache(widget.guides.imageBytes);
  late List<TourIncident> _history = widget.detail.incidents;
  final _reportScroll = ScrollController();
  final _historyScroll = ScrollController();
  _IncidentTab _tab = _IncidentTab.report;
  bool _picking = false;
  bool _refreshing = false;
  bool _choosingCategory = false;
  bool _confirmingExit = false;
  bool _confirmingRetry = false;
  bool _allowExit = false;
  bool _attempted = false;
  bool _hasDraftText = false;
  bool _needsRetryConfirmation = false;
  String? incidentType;
  String? _photoError;
  bool busy = false;
  String? error;
  String? _historyError;

  bool get _dirty => incidentType != null || title.text.isNotEmpty ||
      description.text.isNotEmpty || _selectedPhotos.isNotEmpty;
  bool get _locked => busy || _picking || _choosingCategory || _confirmingRetry;

  @override
  void initState() {
    super.initState();
    title.addListener(_draftChanged);
    description.addListener(_draftChanged);
  }

  void _draftChanged() {
    // Only rebuild the page on empty/nonempty transitions, not each keystroke.
    final hasText = title.text.isNotEmpty || description.text.isNotEmpty;
    if (mounted && hasText != _hasDraftText) {
      setState(() => _hasDraftText = hasText);
    }
  }

  @override
  void dispose() {
    title.removeListener(_draftChanged);
    description.removeListener(_draftChanged);
    title.dispose();
    description.dispose();
    _categoryFocus.dispose();
    _titleFocus.dispose();
    _descriptionFocus.dispose();
    _reportScroll.dispose();
    _historyScroll.dispose();
    _photoCache.clear();
    super.dispose();
  }

  Future<void> _requestExit() async {
    if (_allowExit || _locked || _confirmingExit) return;
    if (!_dirty) {
      Navigator.maybePop(context);
      return;
    }
    _confirmingExit = true;
    final discard = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Bỏ bản nháp?'),
        content: const Text('Nội dung và ảnh chưa gửi sẽ bị mất khi rời màn hình.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
            child: const Text('Tiếp tục nhập')),
          TextButton(onPressed: () => Navigator.pop(context, true),
            child: const Text('Bỏ bản nháp')),
        ],
      ),
    );
    _confirmingExit = false;
    if (!mounted || discard != true) return;
    _close();
  }

  void _close() {
    setState(() => _allowExit = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && ModalRoute.of(context)?.isCurrent == true) {
        Navigator.pop(context);
      }
    });
  }

  Future<void> _chooseCategory() async {
    if (_locked) return;
    FocusScope.of(context).unfocus();
    setState(() => _choosingCategory = true);
    try {
      final selected = await showIncidentCategorySheet(context, incidentType);
      if (!mounted || selected == null) return;
      setState(() => incidentType = selected);
      _categoryKey.currentState?.didChange(selected);
      unawaited(HapticFeedback.selectionClick().catchError((Object _) {}));
    } finally {
      if (mounted) setState(() => _choosingCategory = false);
    }
  }

  Future<void> _pickPhotos(ImageSource source) async {
    if (_locked || _selectedPhotos.length >= CheckinPhotoLimits.maxFiles) return;
    setState(() {
      _picking = true;
      _photoError = null;
    });
    try {
      final picked = source == ImageSource.camera
          ? [await _picker.pickImage(source: ImageSource.camera, imageQuality: 85)]
              .whereType<XFile>()
              .toList()
          : await _picker.pickMultiImage(imageQuality: 85);
      if (!mounted || picked.isEmpty) return;

      final additions = <CheckinPhoto>[];
      for (final file in picked) {
        additions.add(CheckinPhoto(
          path: file.path,
          name: file.name,
          mime: CheckinPhoto.mimeForFileName(file.name) ?? '',
          bytes: await file.length(),
        ));
      }
      if (!mounted) return;

      final validation = CheckinPhoto.validate([..._selectedPhotos, ...additions]);
      setState(() {
        _photoError = validation;
        if (validation == null) _selectedPhotos.addAll(additions);
      });
    } catch (_) {
      if (mounted) {
        setState(() => _photoError = 'Không thể mở camera hoặc thư viện ảnh.');
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }


  Future<void> _reveal(GlobalKey key, [FocusNode? focus]) async {
    await WidgetsBinding.instance.endOfFrame;
    if (!mounted || _tab != _IncidentTab.report) return;
    final target = key.currentContext;
    if (target != null && target.mounted) {
      focus?.requestFocus();
      await Scrollable.ensureVisible(target, alignment: 0.15,
        duration: MediaQuery.disableAnimationsOf(context)
          ? Duration.zero : const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic);
    }
  }

  Future<bool> _refreshHistory() async {
    if (_refreshing) return false;
    setState(() { _refreshing = true; _historyError = null; });
    try {
      final latest = await widget.guides.detail(widget.detail.id);
      if (!mounted) return false;
      setState(() => _history = latest.incidents);
      return true;
    } catch (e) {
      if (mounted) setState(() => _historyError = readableError(e));
      return false;
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  int _matchingReports(String type, String heading, String body) => _history.where(
    (item) => item.incidentType == type && item.title.trim() == heading &&
      item.description.trim() == body,
  ).length;

  Future<bool> _confirmRetry() async {
    setState(() => _confirmingRetry = true);
    try {
      final checked = await _refreshHistory();
      if (!mounted) return false;
      final matches = _matchingReports(incidentType!, title.text.trim(), description.text.trim());
      final accepted = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Xác nhận gửi lại'),
          content: Text(!checked
              ? 'Chưa thể kiểm tra lịch sử. Báo cáo trước có thể đã được ghi nhận. Gửi lại có thể tạo bản trùng.'
              : matches > 0
                ? 'Lịch sử có báo cáo cùng nội dung. Hãy kiểm tra trước khi gửi lại để tránh báo cáo trùng.'
                : 'Chưa thấy báo cáo cùng nội dung trong lịch sử. Không thể bảo đảm lần gửi trước chưa được ghi nhận. Bạn có muốn gửi lại?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false),
              child: const Text('Hủy')),
            FilledButton(onPressed: () => Navigator.pop(context, true),
              child: const Text('Vẫn gửi lại')),
          ],
        ),
      );
      return accepted == true;
    } finally {
      if (mounted) setState(() => _confirmingRetry = false);
    }
  }

  Future<void> submit() async {
    if (_allowExit || _locked || _refreshing || _tab != _IncidentTab.report) return;
    setState(() => _attempted = true);
    if (form.currentState?.validate() != true) {
      if (_categoryKey.currentState?.hasError == true) {
        FocusScope.of(context).unfocus();
        await _reveal(_categoryKey, _categoryFocus);

      } else if (_titleKey.currentState?.hasError == true) {
        await _reveal(_titleKey, _titleFocus);
      } else {
        await _reveal(_descriptionKey, _descriptionFocus);
      }
      return;
    }
    FocusScope.of(context).unfocus();
    final validation = CheckinPhoto.validate(_selectedPhotos);
    if (validation != null || _selectedPhotos.any((photo) => !File(photo.path).existsSync())) {
      setState(() => _photoError = validation ??
        'Ảnh tạm không còn trên thiết bị. Hãy bỏ ảnh lỗi và thêm lại.');
      await _reveal(_photoAnchor);
      return;
    }
    if (_needsRetryConfirmation) {
      if (!await _confirmRetry() || !mounted) return;
    }
    if (!mounted) return;
    final type = incidentType!;
    final heading = title.text.trim();
    final body = description.text.trim();
    final photos = List<CheckinPhoto>.unmodifiable(_selectedPhotos);
    final before = _matchingReports(type, heading, body);
    setState(() { busy = true; error = null; _photoError = null; });
    try {
      await widget.guides.incident(widget.detail.id,
        type: type, title: heading, description: body, photos: photos);
      if (!mounted) return;
      unawaited(HapticFeedback.lightImpact().catchError((Object _) {}));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã gửi báo cáo sự cố thành công.')));
      _close();
    } catch (e) {
      if (!mounted) return;
      final checked = await _refreshHistory();
      if (!mounted) return;
      final possibleMatch = checked && _matchingReports(type, heading, body) > before;
      setState(() {
        _needsRetryConfirmation = true;
        error = '${readableError(e)}\nNội dung và ảnh đã được giữ lại. '
          '${!checked ? 'Chưa kiểm tra được lịch sử.' : possibleMatch ? 'Lịch sử có thêm báo cáo cùng nội dung; hãy kiểm tra trước khi gửi lại.' : 'Chưa thấy báo cáo mới cùng nội dung trong lịch sử.'}';
      });
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget _hero() => GuideHero(
    compact: true, label: 'AN TOÀN HÀNH TRÌNH',
    title: 'Báo cáo sự cố', subtitle: widget.detail.name,
  );

  InputDecoration _input(String hint) {
    OutlineInputBorder border(Color color) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(18), borderSide: BorderSide(color: color),
    );
    return InputDecoration(
      hintText: hint, filled: true, fillColor: const Color(0xBFFFFFFF),
      enabledBorder: border(Colors.white), disabledBorder: border(Colors.white),
      focusedBorder: border(deepTeal),
      errorBorder: border(const Color(0xFF963F48)),
      focusedErrorBorder: border(const Color(0xFF963F48)),
    );
  }

  Widget _report() => Form(
    key: form,
    autovalidateMode: _attempted ? AutovalidateMode.onUserInteraction : AutovalidateMode.disabled,
    // The form is bounded (at most five photos). Keep its validators mounted
    // even when the submit bar is pressed while the fields are off-screen.
    child: SingleChildScrollView(
      controller: _reportScroll,
      padding: const EdgeInsets.fromLTRB(18, 10, 18, 16),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _hero(),
        space(15),
        const IncidentGlassBanner(
          message: 'Hãy báo cáo ngay các tình huống ảnh hưởng tới an toàn và lịch trình của đoàn.',
        ),
        space(16),
        GuideGlass(
          radius: 26, blurSigma: 0, shadow: false,
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const GuideSectionTitle('Thông tin sự cố'),
            space(6),
            const Text('Các trường có dấu * là bắt buộc.', style: TextStyle(fontSize: 12, color: muted)),
            space(15),
            const Text('Loại sự cố *', style: _fieldLabel),
            space(7),
            FormField<String>(
              key: _categoryKey, initialValue: incidentType,
              validator: (value) => incidentCategories.any((c) => c.code == value)
                ? null : 'Vui lòng chọn loại sự cố',
              builder: (field) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                OutlinedButton(
                  key: const ValueKey('incident-type-dropdown'),
                  focusNode: _categoryFocus,
                  onPressed: _locked ? null : _chooseCategory,
                  style: OutlinedButton.styleFrom(
                    backgroundColor: const Color(0xBFFFFFFF),
                    side: BorderSide(color: field.hasError ? const Color(0xFF963F48) : Colors.white),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                    padding: const EdgeInsets.all(12),
                  ),
                  child: Row(children: [
                    Icon(incidentType == null ? Icons.category_outlined : incidentCategoryStyle(incidentType).icon,
                      color: deepTeal, size: 21),
                    const SizedBox(width: 8),
                    Expanded(child: Text(incidentType == null ? 'Chọn loại sự cố'
                        : incidentCategoryStyle(incidentType).label,
                      style: TextStyle(color: incidentType == null ? muted : ink))),
                    const Icon(Icons.unfold_more_rounded, color: muted, size: 19),
                  ]),
                ),
                if (field.hasError)
                  Padding(padding: const EdgeInsets.only(left: 12, top: 5),
                    child: Text(field.errorText!, style: const TextStyle(
                      fontSize: 12, color: Color(0xFF963F48),
                    ))),
              ]),
            ),
            space(14),
            const Text('Tiêu đề *', style: _fieldLabel),
            space(7),
            TextFormField(
              key: _titleKey, controller: title, focusNode: _titleFocus,
              enabled: !_locked, maxLength: 255, textInputAction: TextInputAction.next,
              onFieldSubmitted: (_) => _descriptionFocus.requestFocus(),
              decoration: _input('Tóm tắt ngắn gọn tình huống'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Nhập tiêu đề' : null,
            ),
            space(8),
            const Text('Mô tả chi tiết *', style: _fieldLabel),
            space(7),
            TextFormField(
              key: _descriptionKey, controller: description, focusNode: _descriptionFocus,
              enabled: !_locked, minLines: 3, maxLines: 6, maxLength: 2000,
              keyboardType: TextInputType.multiline,
              decoration: _input('Nêu rõ thời gian, địa điểm, diễn biến và cách xử lý...'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Nhập mô tả' : null,
            ),
            const Text('Gợi ý: thời gian, địa điểm, ảnh hưởng đến đoàn và biện pháp đã thực hiện.',
              style: TextStyle(color: muted, fontSize: 12, height: 1.4)),
          ]),
        ),
        space(14),
        IncidentPhotoPicker(
          key: _photoAnchor, photos: _selectedPhotos, locked: _locked,
          picking: _picking, error: _photoError, onPick: _pickPhotos,
          onRemove: (index) => setState(() {
            _selectedPhotos.removeAt(index);
            _photoError = null;
          }),
        ),
        if (error != null) ...[
          space(12),
          IncidentGlassBanner(message: error!, warning: true, icon: Icons.error_outline),
          TextButton(onPressed: _locked ? null : () => _changeTab(_IncidentTab.history),
            child: const Text('Kiểm tra lịch sử báo cáo')),
        ],
      ]),
    ),
  );

  static const _fieldLabel = TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: ink);

  Widget _historyList() {
    final header = <Widget>[
      _hero(), space(15),
      Row(children: [
        Expanded(child: GuideSectionTitle('Đã báo cáo (${_history.length})')),
        IconButton(tooltip: 'Tải lại lịch sử', onPressed: _refreshing ? null : _refreshHistory,
          icon: const Icon(Icons.refresh_rounded)),
      ]),
      if (_refreshing) const LinearProgressIndicator(minHeight: 3),
      if (_historyError != null)
        IncidentGlassBanner(message: _historyError!, warning: true, icon: Icons.error_outline),
      if (_history.isEmpty)
        const GuideEmptyState(title: 'Chưa có báo cáo sự cố', message: 'Các báo cáo đã gửi sẽ hiển thị tại đây.'),
      space(8),
    ];
    return ListView.builder(
      controller: _historyScroll,
      padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
      itemCount: header.length + _history.length,
      itemBuilder: (context, index) {
        if (index < header.length) return header[index];
        final incident = _history[index - header.length];
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: GuideIncidentCard(
            key: ValueKey('incident-history-${index - header.length}'),
            incident: incident,
            onTap: () => showIncidentDetail(context, incident, _photoCache),
          ),
        );
      },
    );
  }

  void _changeTab(_IncidentTab value) {
    if (_locked || value == _tab) return;
    FocusScope.of(context).unfocus();
    setState(() => _tab = value);
  }

  Widget _submitBar() => SafeArea(
    top: false,
    minimum: const EdgeInsets.fromLTRB(18, 4, 18, 10),
    child: GuideGlass(
      radius: 32, blurSigma: 0, padding: const EdgeInsets.all(5),
      child: SizedBox(width: double.infinity, child: FilledButton.icon(
        key: const ValueKey('incident-submit'),
        onPressed: _allowExit || _locked || _refreshing ? null : submit,
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, 50), shape: const StadiumBorder(),
        ),
        icon: busy || _confirmingRetry
            ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : Icon(_needsRetryConfirmation ? Icons.refresh_rounded : Icons.send_rounded, size: 18),
        label: Text(busy ? 'Đang gửi báo cáo...' : _confirmingRetry
          ? 'Đang kiểm tra lịch sử...' : _needsRetryConfirmation ? 'Thử gửi lại' : 'Gửi báo cáo sự cố'),
      )),
    ),
  );

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: _allowExit || (!_dirty && !_locked),
    onPopInvokedWithResult: (didPop, result) {
      if (!didPop) unawaited(_requestExit());
    },
    child: Scaffold(
    appBar: AppBar(
        backgroundColor: Colors.transparent,
        flexibleSpace: const GuideGlass(radius: 0, shadow: false, blurSigma: 12, child: SizedBox.expand()),
        leading: Navigator.canPop(context) ? IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: _locked ? null : _requestExit,
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        ) : null,title: const Text('Báo cáo sự cố')),

      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 0),
          child: GuideSegmentedControl<_IncidentTab>(
            key: const ValueKey('incident-tabs'),
            value: _tab,
            labels: {
              _IncidentTab.report: 'Tạo báo cáo',
              _IncidentTab.history: 'Lịch sử (${_history.length})',
            },
            onChanged: _changeTab,
          ),
        ),
        Expanded(child: _tab == _IncidentTab.report ? _report() : _historyList()),
        if (_tab == _IncidentTab.report) _submitBar(),
      ]),
    ),
  );
}
