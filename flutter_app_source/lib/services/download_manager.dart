import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart' as yt;
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
    int attempts = 0;
    const maxAttempts = 3;
    bool success = false;
    dynamic lastError;

    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        await DownloadService.requestStoragePermission();

        // ── 1. Fetch metadata ────────────────────────────────────────────────
        state.updateDownload(job.id, status: DownloadStatus.fetchingMeta);
        final track = await _api.getTrackFromUrl(job.url);
        if (track == null) {
          throw Exception('Could not fetch video info. Check the URL.');
        }

        state.updateDownload(job.id,
            title: track.title, artist: track.artist, coverUrl: track.coverUrl);

        // ── 2. Check disk ───────────────────────────────────────────────────
        final saveDir = await DownloadService.getSaveDirectory();
        final filename = '${track.id}.mp3';
        final file = File('${saveDir.path}/$filename');

        if (await file.exists()) {
          success = true;
          debugPrint('[DL] Already on disk: ${file.path}');
        } else {
          // ── 3. Download logic ──────────────────────────────────────────────
          state.updateDownload(job.id, status: DownloadStatus.downloading, progress: 0);

          final manifest = await _api.getAudioManifest(track.id);
          final audioStreams = manifest.audioOnly.toList();
          
          if (audioStreams.isEmpty) throw Exception('No audio streams available.');

          // Sort streams: Priority is MP4 (often more stable DNS/CDN) then WebM/Opus,
          // within containers sort by bitrate descending.
          audioStreams.sort((a, b) {
            final aIsMp4 = a.container == yt.StreamContainer.mp4;
            final bIsMp4 = b.container == yt.StreamContainer.mp4;
            if (aIsMp4 && !bIsMp4) return -1;
            if (!aIsMp4 && bIsMp4) return 1;
            return b.bitrate.bitsPerSecond.compareTo(a.bitrate.bitsPerSecond);
          });

          // Try each stream until one works
          bool streamSuccess = false;
          for (final streamInfo in audioStreams) {
            final total = streamInfo.size.totalBytes;
            int received = 0;
            final tmpFile = File('${file.path}.part');
            final sink = tmpFile.openWrite();

            try {
              final stream = _api.getAudioStream(streamInfo as yt.StreamInfo);
              await for (final chunk in stream.timeout(const Duration(seconds: 30))) {
                sink.add(chunk);
                received += chunk.length;
                if (total > 0) {
                  state.updateDownload(job.id, progress: (received / total).clamp(0.0, 1.0));
                }
              }
              await sink.flush();
              await sink.close();
              await tmpFile.rename(file.path);
              streamSuccess = true;
              break; // Success with this stream
            } catch (e) {
              await sink.close();
              if (await tmpFile.exists()) await tmpFile.delete();
              debugPrint('[DL] Stream failed (attempt $attempts): $e');
              lastError = e;
              continue; // Try next stream
            }
          }

          if (!streamSuccess) throw lastError ?? Exception('All streams failed.');
          success = true;
          debugPrint('[DL] ✓ ${track.title} downloaded.');
        }

        // ── 4. Persist ──────────────────────────────────────────────────────
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
        lastError = e;
        debugPrint('[DL] Attempt $attempts failed: $e');
        if (attempts < maxAttempts) {
          state.updateDownload(job.id, error: 'Retrying... ($attempts/$maxAttempts)');
          await Future.delayed(Duration(seconds: 2 * attempts)); // Exponential backoff
        } else {
          state.updateDownload(
            job.id,
            status: DownloadStatus.error,
            error: e.toString().contains('SocketException') 
                ? 'Network Error: DNS fallback failed. Try again on Wi-Fi.'
                : e.toString().split('Exception: ').last.split('\n').first,
          );
        }
      }
    }
  }

  void dispose() => _appState?.removeListener(_onStateChange);
}