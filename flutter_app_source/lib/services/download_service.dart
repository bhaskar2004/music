import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/track.dart';

class DownloadService {
  static void init() {}

  // ─── Save directory ────────────────────────────────────────────────────────

  /// Android  → /sdcard/Android/data/<pkg>/files/Wavelength/
  ///            Falls back to app documents if external storage unavailable
  /// iOS      → <documentsDir>/Wavelength/
  static Future<Directory> getSaveDirectory() async {
    final Directory base;
    if (Platform.isAndroid) {
      // Some devices return null for external storage
      final externalDir = await getExternalStorageDirectory();
      if (externalDir != null) {
        base = externalDir;
      } else {
        debugPrint('[DownloadService] External storage unavailable, using app documents');
        base = await getApplicationDocumentsDirectory();
      }
    } else {
      base = await getApplicationDocumentsDirectory();
    }
    final dir = Directory('${base.path}/Wavelength');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  /// Full path to a track's audio file if it exists on disk and is valid.
  static Future<String?> getLocalFilePath(Track track) async {
    final dir = await getSaveDirectory();
    final file = File('${dir.path}/${track.filename}');
    if (await file.exists()) {
      // Verify file isn't corrupt (> 1KB)
      final size = await file.length();
      if (size > 1024) {
        return file.path;
      } else {
        debugPrint('[DownloadService] Corrupt file detected for ${track.title} (${size}B), removing');
        await file.delete();
        return null;
      }
    }
    return null;
  }

  static Future<bool> isDownloaded(Track track) async =>
      (await getLocalFilePath(track)) != null;

  // ─── Permissions ───────────────────────────────────────────────────────────

  static Future<void> requestStoragePermission() async {
    if (!Platform.isAndroid) return;
    int sdk = 0;
    try {
      sdk = (await DeviceInfoPlugin().androidInfo).version.sdkInt;
    } catch (_) {}

    if (sdk >= 33) {
      await Permission.audio.request();
    } else if (sdk < 29) {
      final s = await Permission.storage.request();
      if (s.isDenied) throw Exception('Storage permission required.');
    }
    // SDK 29-32: scoped storage, no permission needed for app-specific dirs
  }
}