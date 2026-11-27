import 'dart:collection';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../assigned_tours/domain/booking_models.dart';

/// Small per-screen LRU cache. Failed entries are evicted so retries work.
/// Images are fetched only when an evidence section is expanded.
class LocationPhotoCache {
  LocationPhotoCache(this._download);
  final Future<Uint8List> Function(String) _download;
  final _entries = LinkedHashMap<String, Future<Uint8List>>();

  Future<Uint8List> load(String url) {
    final existing = _entries.remove(url);
    if (existing != null) {
      _entries[url] = existing;
      return existing;
    }
    final future = Future<Uint8List>.sync(() => _download(url));
    _entries[url] = future;
    future.then<void>((_) {}, onError: (Object error, StackTrace stack) {
      if (identical(_entries[url], future)) _entries.remove(url);
    });
    while (_entries.length > 8) {
      _entries.remove(_entries.keys.first);
    }
    return future;
  }

  void clear() => _entries.clear();
}

class LocationEvidenceGallery extends StatelessWidget {
  const LocationEvidenceGallery({super.key, required this.stop, required this.cache});
  final TourStop stop;
  final LocationPhotoCache cache;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _EvidenceGroup(
        title: stop.status == 'Skipped' ? 'Bỏ qua' : 'Check-in',
        notePrefix: stop.status == 'Skipped' ? 'Lý do bỏ qua' : 'Ghi chú check-in',
        urls: stop.photoUrls, note: stop.checkinNote, cache: cache,
      ),
      _EvidenceGroup(title: 'Check-out', notePrefix: 'Ghi chú check-out',
        urls: stop.checkoutPhotoUrls, note: stop.checkoutNote, cache: cache,
        recordedAt: stop.checkoutAt),
    ],
  );
}

class _EvidenceGroup extends StatelessWidget {
  const _EvidenceGroup({required this.title, required this.notePrefix,
    required this.urls, required this.note, required this.cache, this.recordedAt});
  final String title, notePrefix;
  final List<String> urls;
  final String? note;
  final DateTime? recordedAt;
  final LocationPhotoCache cache;

  @override
  Widget build(BuildContext context) {
    final text = note?.trim() ?? '';
    if (urls.isEmpty && text.isEmpty && recordedAt == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: GuideGlass(
        radius: 18, blurSigma: 0, shadow: false,
        padding: const EdgeInsets.all(10),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('$title · ${urls.length} ảnh', style: const TextStyle(
            color: ink, fontWeight: FontWeight.w700, fontSize: 13,
          )),
          if (recordedAt != null)
            Text(MaterialLocalizations.of(context).formatShortDate(recordedAt!.toLocal()) +
                ' · ' + MaterialLocalizations.of(context).formatTimeOfDay(
                  TimeOfDay.fromDateTime(recordedAt!.toLocal()), alwaysUse24HourFormat: true),
              style: const TextStyle(color: muted, fontSize: 12)),
          if (urls.isNotEmpty) ...[
            const SizedBox(height: 8),
            SizedBox(height: 78, child: ListView.separated(
              scrollDirection: Axis.horizontal,
              primary: false,
              padding: EdgeInsets.zero,
              itemCount: urls.length,
              separatorBuilder: (_, _) => const SizedBox(width: 7),
              itemBuilder: (context, index) => SizedBox(
                width: 78,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: _ProofImage(
                    key: ValueKey(urls[index]),
                    url: urls[index], cache: cache,
                    onOpen: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => LocationPhotoViewer(
                        urls: urls, initialIndex: index, cache: cache, title: title,
                      ),
                    )),
                  ),
                ),
              ),
            )),
          ],
          if (text.isNotEmpty) ...[
            const SizedBox(height: 7),
            Text('$notePrefix: $text', style: const TextStyle(
              fontSize: 12, color: ink, height: 1.4,
            )),
          ],
        ]),
      ),
    );
  }
}

class _ProofImage extends StatefulWidget {
  const _ProofImage({super.key, required this.url, required this.cache, this.onOpen, this.full = false});
  final String url;
  final LocationPhotoCache cache;
  final VoidCallback? onOpen;
  final bool full;

  @override
  State<_ProofImage> createState() => _ProofImageState();
}

class _ProofImageState extends State<_ProofImage> {
  late Future<Uint8List> _future = widget.cache.load(widget.url);

  @override
  void didUpdateWidget(covariant _ProofImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url || oldWidget.cache != widget.cache) {
      _future = widget.cache.load(widget.url);
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Uint8List>(
    future: _future,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Material(color: paleTeal, child: InkWell(
          onTap: () => setState(() => _future = widget.cache.load(widget.url)),
          child: const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.refresh_rounded, color: muted),
            Text('Thử lại', style: TextStyle(fontSize: 11, color: muted)),
          ])),
        ));
      }
      if (!snapshot.hasData) {
        return const Center(child: SizedBox.square(dimension: 20,
          child: CircularProgressIndicator(strokeWidth: 2)));
      }
      final image = Image.memory(snapshot.data!,
        fit: widget.full ? BoxFit.contain : BoxFit.cover,
        width: widget.full ? null : 78, height: widget.full ? null : 78,
        cacheWidth: widget.full ? null : (78 * MediaQuery.devicePixelRatioOf(context) * 2).ceil(),
        errorBuilder: (_, _, _) => const Center(child: Icon(Icons.broken_image_outlined, color: muted)),
      );
      return widget.full
          ? InteractiveViewer(minScale: 1, maxScale: 4, child: Center(child: image))
          : Semantics(button: true, label: 'Xem ảnh minh chứng', child: InkWell(
              onTap: widget.onOpen, child: image,
            ));
    },
  );
}

class LocationPhotoViewer extends StatefulWidget {
  const LocationPhotoViewer({
    super.key, required this.urls, required this.initialIndex,
    required this.cache, required this.title,
  });
  final List<String> urls;
  final int initialIndex;
  final LocationPhotoCache cache;
  final String title;
  @override
  State<LocationPhotoViewer> createState() => _LocationPhotoViewerState();
}

class _LocationPhotoViewerState extends State<LocationPhotoViewer> {
  late final _controller = PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFF101C20),
    appBar: AppBar(
      backgroundColor: const Color(0xFF101C20), foregroundColor: Colors.white,
      title: Text('${widget.title} · ${_index + 1}/${widget.urls.length}'),
    ),
    body: PageView.builder(
      controller: _controller,
      itemCount: widget.urls.length,
      onPageChanged: (index) => setState(() => _index = index),
      itemBuilder: (context, index) => _ProofImage(
        url: widget.urls[index], cache: widget.cache, full: true,
      ),
    ),
  );
}
