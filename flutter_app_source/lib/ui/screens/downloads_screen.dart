import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/download_job.dart';
import '../../providers/app_state.dart';
import '../../services/download_manager.dart';
import '../widgets/download_bottom_sheet.dart';

class DownloadsScreen extends StatelessWidget {
  const DownloadsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final active = appState.downloads.where((d) => d.isActive).toList();
    final history =
        appState.downloads.where((d) => !d.isActive).toList();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          slivers: [
            // Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Downloads',
                            style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -1.5,
                                color: Colors.black)),
                        Text(
                          '${active.isNotEmpty ? '${active.length} active · ' : ''}${appState.downloads.length} total',
                          style: const TextStyle(
                              color: Color(0xFF888888), fontSize: 13),
                        ),
                      ],
                    ),
                    _NewDownloadBtn(onTap: () =>
                        DownloadBottomSheet.show(context)),
                  ],
                ),
              ),
            ),

            if (appState.downloads.isEmpty)
              SliverFillRemaining(
                child: _EmptyState(
                    onAdd: () => DownloadBottomSheet.show(context)),
              )
            else ...[
              // Active
              if (active.isNotEmpty) ...[
                const SliverToBoxAdapter(child: _SectionLabel(label: 'Active')),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 5),
                      child: _DownloadRow(job: active[i]),
                    ),
                    childCount: active.length,
                  ),
                ),
              ],

              // History
              if (history.isNotEmpty) ...[
                const SliverToBoxAdapter(child: _SectionLabel(label: 'History')),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 5),
                      child: _DownloadRow(
                        job: history[i],
                        onRemove: () => appState.removeDownload(history[i].id),
                        onRetry: () {
                          appState.retryDownload(history[i].id);
                          DownloadManager().processJob(
                              history[i].url, appState,
                              playlistIds: history[i].playlistIds,
                              jobId: history[i].id);
                        },
                      ),
                    ),
                    childCount: history.length,
                  ),
                ),
              ],

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ],
        ),
      ),
    );
  }
}

class _NewDownloadBtn extends StatelessWidget {
  final VoidCallback onTap;
  const _NewDownloadBtn({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [Color(0xFF06C167), Color(0xFF00FF85)]),
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
                color: const Color(0xFF06C167).withValues(alpha: 0.2),
                blurRadius: 12,
                offset: const Offset(0, 4)),
          ],
        ),
        child: const Row(
          children: [
            Icon(Icons.download_rounded, color: Colors.white, size: 16),
            SizedBox(width: 6),
            Text('New Download',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          color: Color(0xFF999999),
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.8,
          fontFamily: 'monospace',
        ),
      ),
    );
  }
}

class _DownloadRow extends StatelessWidget {
  final DownloadJob job;
  final VoidCallback? onRemove;
  final VoidCallback? onRetry;

  const _DownloadRow({required this.job, this.onRemove, this.onRetry});

  static const _accent = Color(0xFF06C167);
  static const _danger = Color(0xFFE53E3E);

  Color get _statusColor {
    switch (job.status) {
      case DownloadStatus.done:
        return _accent;
      case DownloadStatus.error:
        return _danger;
      default:
        return _accent;
    }
  }

  String get _statusLabel {
    switch (job.status) {
      case DownloadStatus.pending:
        return 'Queued';
      case DownloadStatus.fetchingMeta:
        return 'Fetching info…';
      case DownloadStatus.downloading:
        return 'Downloading';
      case DownloadStatus.done:
        return 'Complete';
      case DownloadStatus.error:
        return 'Failed';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isActive = job.isActive;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          left: BorderSide(
            color: job.status == DownloadStatus.done
                ? _accent
                : job.status == DownloadStatus.error
                    ? _danger
                    : isActive
                        ? _accent
                        : const Color(0xFFE8E8E8),
            width: 3,
          ),
          right: const BorderSide(color: Color(0xFFEEEEEE)),
          top: const BorderSide(color: Color(0xFFEEEEEE)),
          bottom: const BorderSide(color: Color(0xFFEEEEEE)),
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail
          Stack(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: const Color(0xFFF2F2F2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: job.coverUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: job.coverUrl!.startsWith('http')
                            ? CachedNetworkImage(
                                imageUrl: job.coverUrl!,
                                fit: BoxFit.cover,
                              )
                            : Image.file(
                                File(job.coverUrl!),
                                fit: BoxFit.cover,
                              ),
                      )
                    : const Icon(Icons.music_note,
                        color: Color(0xFFCCCCCC), size: 22),
              ),
              if (isActive)
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Color(0xFF06C167)),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title row
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        job.title ?? 'Fetching info…',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                            color: Colors.black87),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                            color: _statusColor.withValues(alpha: 0.2)),
                      ),
                      child: Text(_statusLabel,
                          style: TextStyle(
                              color: _statusColor,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'monospace')),
                    ),
                  ],
                ),
                const SizedBox(height: 3),

                // Artist / URL
                Text(
                  job.artist ?? _truncateUrl(job.url),
                  style: const TextStyle(
                      color: Color(0xFF888888), fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),

                // Progress bar
                if (isActive) ...[
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        job.status == DownloadStatus.fetchingMeta
                            ? 'Fetching track info…'
                            : job.status == DownloadStatus.pending
                                ? 'Queued'
                                : 'Downloading audio',
                        style: const TextStyle(
                            color: Color(0xFF888888),
                            fontSize: 11,
                            fontFamily: 'monospace'),
                      ),
                      if (job.progress > 0 &&
                          job.status == DownloadStatus.downloading)
                        Text(
                          '${(job.progress * 100).toInt()}%',
                          style: const TextStyle(
                              color: _accent,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'monospace'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: job.status == DownloadStatus.fetchingMeta ||
                              job.status == DownloadStatus.pending
                          ? null
                          : job.progress,
                      backgroundColor: const Color(0xFFF0F0F0),
                      valueColor:
                          const AlwaysStoppedAnimation(_accent),
                      minHeight: 5,
                    ),
                  ),
                ],

                // Done state
                if (job.status == DownloadStatus.done) ...[
                  const SizedBox(height: 6),
                  const Row(
                    children: [
                      Icon(Icons.check_circle_rounded,
                          color: _accent, size: 13),
                      SizedBox(width: 5),
                      Text('Added to library',
                          style: TextStyle(
                              color: _accent,
                              fontSize: 11,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ],

                // Error state
                if (job.status == DownloadStatus.error &&
                    job.error != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: _danger.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(6),
                      border:
                          Border.all(color: _danger.withValues(alpha: 0.15)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline,
                            color: _danger, size: 12),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            job.error!,
                            style: const TextStyle(
                                color: _danger, fontSize: 11),
                            maxLines: 2,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (onRetry != null)
                    GestureDetector(
                      onTap: onRetry,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF2F2F2),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                              color: const Color(0xFFE8E8E8)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.refresh_rounded,
                                size: 13, color: Color(0xFF606060)),
                            SizedBox(width: 5),
                            Text('Retry Download',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF606060))),
                          ],
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),

          // Remove button (finished jobs only)
          if (!isActive && onRemove != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onRemove,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  border:
                      Border.all(color: const Color(0xFFE8E8E8)),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.close_rounded,
                    size: 14, color: Color(0xFF888888)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _truncateUrl(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.host + uri.path;
    } catch (_) {
      return url.length > 50 ? '${url.substring(0, 50)}…' : url;
    }
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyState({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F5),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE8E8E8)),
            ),
            child: const Icon(Icons.download_outlined,
                color: Color(0xFFCCCCCC), size: 30),
          ),
          const SizedBox(height: 16),
          const Text('No downloads yet',
              style: TextStyle(
                  color: Color(0xFF888888), fontSize: 15)),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: onAdd,
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 20, vertical: 11),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text('Add from URL',
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 14)),
            ),
          ),
        ],
      ),
    );
  }
}
