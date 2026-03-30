import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/track.dart';
import 'api_service.dart';
import 'database_service.dart';

class DownloadService {
  static void init() {
    // No-op — kept for compatibility with main.dart call
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Path helpers — SINGLE SOURCE OF TRUTH used by audio_service & track_tile
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns the root directory where Wavelength saves audio files.
  /// Uses path_provider so no dangerous permissions are required.
  static Future<Directory> getSaveDirectory() async {
    final Directory base;
    if (Platform.isAndroid) {
      // getExternalStorageDirectory → /sdcard/Android/data/<pkg>/files
      // Readable/writable by the app with zero extra permissions on all
      // Android versions including 13+.
      base = (await getExternalStorageDirectory())!;
    } else {
      base = await getApplicationDocumentsDirectory();
    }

    final saveDir = Directory('${base.path}/Wavelength');
    if (!await saveDir.exists()) {
      await saveDir.create(recursive: true);
    }
    return saveDir;
  }

  /// Returns the full path to a track's local file if it exists, else null.
  /// Use this everywhere instead of building paths manually.
  static Future<String?> getLocalFilePath(Track track) async {
    final dir = await getSaveDirectory();
    final file = File('${dir.path}/${track.filename}');
    return (await file.exists()) ? file.path : null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Permissions
  // ─────────────────────────────────────────────────────────────────────────

  static Future<void> _requestStoragePermission() async {
    if (!Platform.isAndroid) return;

    int sdkInt = 0;
    try {
      final info = await DeviceInfoPlugin().androidInfo;
      sdkInt = info.version.sdkInt;
    } catch (_) {}

    if (sdkInt >= 33) {
      // Android 13+: READ_MEDIA_AUDIO covers reading audio; we use app-scoped
      // storage so no write permission is needed at all.
      final status = await Permission.audio.request();
      if (status.isDenied) {
        debugPrint('[DownloadService] Audio permission denied on Android 13+. '
            'Downloads will still work (app-scoped storage).');
      }
    } else if (sdkInt >= 29) {
      // Android 10–12: scoped storage; no permission needed for app dir.
    } else {
      // Android 9 and below
      final status = await Permission.storage.request();
      if (status.isDenied) {
        throw Exception('Storage permission is required to download songs.');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Download
  // ─────────────────────────────────────────────────────────────────────────

  /// Downloads the highest-quality audio stream for [track] to local storage.
  ///
  /// [onProgress] receives values from 0.0 → 1.0.
  static Future<String?> downloadTrackToDevice(
    Track track, {
    Function(double)? onProgress,
  }) async {
    await _requestStoragePermission();

    final saveDir = await getSaveDirectory();
    final file = File('${saveDir.path}/${track.filename}');

    if (await file.exists()) {
      debugPrint('[DownloadService] Already downloaded: ${file.path}');
      return file.path;
    }

    final api = ApiService();
    IOSink? sink;

    try {
      debugPrint('[DownloadService] Fetching manifest for ${track.id}');
      final manifest = await api.getAudioManifest(track.id);
      final audioStreams = manifest.audioOnly;

      if (audioStreams.isEmpty) {
        throw Exception('No audio streams found for "${track.title}".');
      }

      // Pick the highest bitrate stream
      final streamInfo = audioStreams.reduce(
        (a, b) =>
            a.bitrate.bitsPerSecond > b.bitrate.bitsPerSecond ? a : b,
      );

      final totalBytes = streamInfo.size.totalBytes;
      int received = 0;

      debugPrint('[DownloadService] Downloading ${track.title} '
          '(${(totalBytes / 1024 / 1024).toStringAsFixed(1)} MB) '
          'to ${file.path}');

      sink = file.openWrite();
      final stream = api.getAudioStream(streamInfo);

      await for (final chunk in stream) {
        sink.add(chunk);
        received += chunk.length;
        if (onProgress != null && totalBytes > 0) {
          onProgress(received / totalBytes);
        }
      }

      await sink.flush();
      await sink.close();
      sink = null;

      // Save metadata to SQLite
      await DatabaseService().insertTrack(track);

      debugPrint('[DownloadService] ✓ Complete: ${track.title}');
      return file.path;
    } catch (e) {
      debugPrint('[DownloadService] ✗ Error downloading "${track.title}": $e');
      // Clean up partial file so we don't mistake it for a complete download
      try {
        if (await file.exists()) await file.delete();
      } catch (_) {}
      rethrow;
    } finally {
      await sink?.close();
      api.dispose();
    }
  }
}