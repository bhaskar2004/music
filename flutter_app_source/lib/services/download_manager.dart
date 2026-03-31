import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/track.dart';
import '../models/download_job.dart';
import '../providers/app_state.dart';
import 'api_service.dart';
import 'download_service.dart';
import 'storage_service.dart';

class DownloadManager {
  static final DownloadManager _instance = DownloadManager._internal();
  factory DownloadManager() => _instance;
  DownloadManager._internal();

  final ApiService _api = ApiService();
  AppState? _appState;
  bool _processing = false;

  void attach(AppState state) {
    _appState = state;
    state.addListener(_onStateChange);
  }

  void _onStateChange() => _processQueue();

  Future<void> processJob(String url, AppState state,
      {String? playlistId, String? jobId}) async {
    _appState = state;
    DownloadJob job;
    if (jobId != null) {
      final existing = state.downloads
          .cast<DownloadJob?>()
          .firstWhere((d) => d?.id == jobId, orElse: () => null);
      job = existing ?? state.createDownloadJob(url, playlistId: playlistId);
    } else {
      job = state.createDownloadJob(url, playlistId: playlistId);
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
    try {
      await DownloadService.requestStoragePermission();

      // ── 1. Fetch metadata ────────────────────────────────────────────────
      state.updateDownload(job.id, status: DownloadStatus.fetchingMeta);
      final track = await _api.getTrackFromUrl(job.url);
      if (track == null) {
        throw Exception(
            'Could not fetch video info. Check the URL and try again.');
      }

      state.updateDownload(
          job.id, title: track.title, artist: track.artist, coverUrl: track.coverUrl);

      // ── 2. Skip if already on disk ───────────────────────────────────────
      final saveDir = await DownloadService.getSaveDirectory();
      final filename = '${track.id}.mp3';
      final file = File('${saveDir.path}/$filename');

      if (!await file.exists()) {
        // ── 3. Fetch audio stream → write to local file ──────────────────
        state.updateDownload(job.id, status: DownloadStatus.downloading, progress: 0);

        final manifest = await _api.getAudioManifest(track.id);
        final audioStreams = manifest.audioOnly;
        if (audioStreams.isEmpty) throw Exception('No audio streams available.');

        final streamInfo = audioStreams.reduce(
            (a, b) => a.bitrate.bitsPerSecond > b.bitrate.bitsPerSecond ? a : b);

        final total = streamInfo.size.totalBytes;
        int received = 0;
        final sink = file.openWrite();
        try {
          await for (final chunk in _api.getAudioStream(streamInfo)) {
            sink.add(chunk);
            received += chunk.length;
            if (total > 0) {
              state.updateDownload(job.id, progress: received / total);
            }
          }
          await sink.flush();
        } finally {
          await sink.close();
        }
        debugPrint('[DL] ✓ ${track.title} → ${file.path}');
      } else {
        debugPrint('[DL] Already on disk: ${file.path}');
        state.updateDownload(job.id, progress: 1.0);
      }

      // ── 4. Persist metadata to local JSON (no SQLite) ────────────────────
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
        playlistId: job.playlistId,
      );
      await StorageService().insertTrack(finalTrack);

      state.updateDownload(job.id,
          status: DownloadStatus.done, progress: 1.0, completedTrack: finalTrack);
    } catch (e) {
      debugPrint('[DL] ✗ ${job.url}: $e');
      state.updateDownload(
        job.id,
        status: DownloadStatus.error,
        error: e.toString().split('Exception: ').last.split('\n').first,
      );
    }
  }

  void dispose() => _appState?.removeListener(_onStateChange);
}