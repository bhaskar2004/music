import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/download_job.dart';
import '../providers/app_state.dart';
import 'download_service.dart';
import 'server_download_service.dart';

class DownloadManager {
  static final DownloadManager _instance = DownloadManager._internal();
  factory DownloadManager() => _instance;
  DownloadManager._internal();

  AppState? _appState;
  bool _processing = false;

  void attach(AppState state) {
    _appState = state;
    state.addListener(_onStateChange);
  }

  void _onStateChange() => _processQueue();

  Future<void> processJob(String url, AppState state,
      {List<String>? playlistIds, String? jobId, bool showMessage = true}) async {
    _appState = state;

    // ── Check if already in local library ───────────────────────────
    final inLibrary = state.library.any((t) => t.sourceUrl == url);
    if (inLibrary) {
      debugPrint('[DL] Skipping - already in library: $url');
      throw Exception('ALREADY_EXISTS');
    }
    
    // ── Check for existing job with same URL ────────────────────────
    final duplicate = state.downloads.any((d) => d.url == url && d.status != DownloadStatus.error);
    if (duplicate && jobId == null) {
      debugPrint('[DL] Skipping duplicate job for $url');
      return;
    }

    DownloadJob job;
    if (jobId != null) {
      final existing = state.downloads
          .cast<DownloadJob?>()
          .firstWhere((d) => d?.id == jobId, orElse: () => null);
      job = existing ?? state.createDownloadJob(url, playlistIds: playlistIds);
    } else {
      job = state.createDownloadJob(url, playlistIds: playlistIds);
    }
    await _executeJob(job, state);
  }

  Future<void> _processQueue() async {
    if (_processing || _appState == null) return;
    final pending = _appState!.downloads
        .where((d) => d.status == DownloadStatus.pending)
        .toList();
    if (pending.isEmpty) return;
    _processing = true;
    try {
      for (final job in pending) {
        await _executeJob(job, _appState!);
      }
    } finally {
      _processing = false;
    }
  }

  Future<void> _executeJob(DownloadJob job, AppState state) async {
    int attempts = 0;
    const maxAttempts = 3;
    bool success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;

      try {
        await DownloadService.requestStoragePermission();

        // ── 1. Check server reachability ──────────────────────────────────
        state.updateDownload(job.id, status: DownloadStatus.fetchingMeta);

        if (attempts == 1) {
          final reachable = await ServerDownloadService.isServerReachable();
          if (!reachable) {
            throw Exception(
              'Cannot reach the download server. '
              'Make sure the server is running and the URL is correct.',
            );
          }
        }

        // ── 2. Download via server ────────────────────────────────────────
        final result = await ServerDownloadService.download(
          url: job.url,
          playlistIds: job.playlistIds,
          onStatus: (stage, message) {
            if (stage == 'downloading') {
              state.updateDownload(job.id,
                  status: DownloadStatus.downloading, progress: 0);
            } else if (stage == 'processing' || stage == 'saving') {
              state.updateDownload(job.id,
                  status: DownloadStatus.downloading, progress: 0.95);
            } else {
              state.updateDownload(job.id,
                  status: DownloadStatus.fetchingMeta);
            }
          },
          onProgress: (percent) {
            // Server sends 0-100, we store 0.0-1.0
            state.updateDownload(job.id,
                progress: (percent / 100).clamp(0.0, 1.0));
          },
          onMetadata: (title, artist, coverUrl) {
            state.updateDownload(job.id,
                title: title, artist: artist, coverUrl: coverUrl);
          },
        );

        // ── 3. Success ────────────────────────────────────────────────────
        success = true;
        debugPrint('[DL] ✓ ${result.track.title} saved to ${result.localPath}');

        state.updateDownload(job.id,
            status: DownloadStatus.done,
            progress: 1.0,
            completedTrack: result.track);
      } catch (e) {
        debugPrint('[DL] Attempt $attempts failed: $e');
        if (attempts < maxAttempts) {
          final delaySecs = 3 * attempts; // 3s, 6s, 9s backoff
          state.updateDownload(job.id,
              error: 'Retry $attempts/$maxAttempts in ${delaySecs}s…');
          await Future.delayed(Duration(seconds: delaySecs));
        } else {
          state.updateDownload(
            job.id,
            status: DownloadStatus.error,
            error: _friendlyError(e),
          );
        }
      }
    }
  }

  /// Converts raw exceptions into user-friendly error messages
  String _friendlyError(dynamic e) {
    final msg = e.toString();
    if (msg.contains('SocketException') || msg.contains('host lookup') ||
        msg.contains('Connection refused') || msg.contains('Cannot reach')) {
      return 'Cannot reach download server. Make sure the server is running and you\'re connected to the same network.';
    }
    if (msg.contains('TimeoutException') || msg.contains('timed out')) {
      return 'Download timed out. Your connection may be too slow — try on Wi-Fi.';
    }
    if (msg.contains('No audio streams')) {
      return 'No downloadable audio found for this video.';
    }
    if (msg.contains('Could not fetch') || msg.contains('Server did not return')) {
      return 'Could not load video info. Check the URL and try again.';
    }
    if (msg.contains('Chrome') && msg.contains('cookie')) {
      return 'Server needs Chrome closed to access cookies. Close Chrome on the server machine.';
    }
    return msg.split('Exception: ').last.split('\n').first;
  }

  void dispose() => _appState?.removeListener(_onStateChange);
}