import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../models/track.dart';
import '../models/download_job.dart';
import '../providers/app_state.dart';
import 'api_service.dart';
import 'database_service.dart';

class DownloadManager {
  static final DownloadManager _instance = DownloadManager._internal();
  factory DownloadManager() => _instance;
  DownloadManager._internal();

  final ApiService _api = ApiService();
  AppState? _appState;
  bool _isProcessing = false;

  void attach(AppState state) {
    _appState = state;
    // Listen for new pending jobs
    state.addListener(_onStateChange);
  }

  void _onStateChange() {
    if (!_isProcessing) _processQueue();
  }

  Future<void> processJob(String url, AppState state, {String? playlistId, String? jobId}) async {
    _appState = state;
    final job = jobId != null
        ? state.downloads.firstWhere((d) => d.id == jobId,
            orElse: () => state.createDownloadJob(url, playlistId: playlistId))
        : state.createDownloadJob(url, playlistId: playlistId);

    await _executeJob(job, state);
  }

  Future<void> _processQueue() async {
    if (_isProcessing || _appState == null) return;

    final pending = _appState!.downloads
        .where((d) => d.status == DownloadStatus.pending)
        .toList();

    if (pending.isEmpty) return;

    _isProcessing = true;
    try {
      for (final job in pending) {
        await _executeJob(job, _appState!);
      }
    } finally {
      _isProcessing = false;
    }
  }

  Future<void> _executeJob(DownloadJob job, AppState state) async {
    try {
      // ── 1. Fetch metadata ────────────────────────────────────────────────
      state.updateDownload(job.id, status: DownloadStatus.fetchingMeta);

      final track = await _api.getTrackFromUrl(job.url);
      if (track == null) throw Exception('Could not fetch video info. Check the URL.');

      state.updateDownload(
        job.id,
        title: track.title,
        artist: track.artist,
        coverUrl: track.coverUrl,
      );

      // ── 2. Download audio ────────────────────────────────────────────────
      state.updateDownload(job.id, status: DownloadStatus.downloading, progress: 0);

      final manifest = await _api.getAudioManifest(track.id);
      final audioStreams = manifest.audioOnly;
      if (audioStreams.isEmpty) throw Exception('No audio streams available.');

      final streamInfo = audioStreams.reduce(
        (a, b) => a.bitrate.bitsPerSecond > b.bitrate.bitsPerSecond ? a : b,
      );

      final saveDir = await _getSaveDir();
      final filename = '${track.id}.mp3';
      final file = File('${saveDir.path}/$filename');

      int received = 0;
      final total = streamInfo.size.totalBytes;
      final sink = file.openWrite();

      await for (final chunk in _api.getAudioStream(streamInfo)) {
        sink.add(chunk);
        received += chunk.length;
        if (total > 0) {
          state.updateDownload(job.id, progress: received / total);
        }
      }

      await sink.flush();
      await sink.close();

      // ── 3. Build final track with playlistId ──────────────────────────────
      final finalTrack = Track(
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        filename: filename,
        coverUrl: track.coverUrl,
        sourceUrl: track.sourceUrl,
        addedAt: DateTime.now().toIso8601String(),
        format: 'mp3',
        isFavorite: false,
        playlistId: job.playlistId,
      );

      await DatabaseService().insertTrack(finalTrack);

      state.updateDownload(
        job.id,
        status: DownloadStatus.done,
        progress: 1.0,
        completedTrack: finalTrack,
      );

      debugPrint('[DownloadManager] ✓ ${track.title}');
    } catch (e) {
      debugPrint('[DownloadManager] ✗ ${job.url}: $e');
      state.updateDownload(
        job.id,
        status: DownloadStatus.error,
        error: e.toString().split('\n').first,
      );
    }
  }

  Future<Directory> _getSaveDir() async {
    final base = Platform.isAndroid
        ? (await getExternalStorageDirectory())!
        : await getApplicationDocumentsDirectory();
    final dir = Directory('${base.path}/Wavelength');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  void dispose() {
    _appState?.removeListener(_onStateChange);
  }
}
