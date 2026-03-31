import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/track.dart';

class DownloadService {
  /// Called once from main() — no-op, kept for compatibility
  static void init() {}

  // ─── Directory ──────────────────────────────────────────────────────────────

  /// Returns the directory Wavelength saves audio files to.
  /// Uses app-scoped external storage so no dangerous permissions are needed
  /// on Android 10+ or iOS.
  static Future<Directory> getSaveDirectory() async {
    final Directory base;
    if (Platform.isAndroid) {
      base = (await getExternalStorageDirectory())!;
    } else {
      base = await getApplicationDocumentsDirectory();
    }
    final dir = Directory('${base.path}/Wavelength');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  /// Returns the full path to a track's downloaded file, or null if not found.
  static Future<String?> getLocalFilePath(Track track) async {
    final dir = await getSaveDirectory();
    final file = File('${dir.path}/${track.filename}');
    return (await file.exists()) ? file.path : null;
  }

  // ─── Permissions ────────────────────────────────────────────────────────────

  static Future<void> requestStoragePermission() async {
    if (!Platform.isAndroid) return;

    int sdk = 0;
    try {
      sdk = (await DeviceInfoPlugin().androidInfo).version.sdkInt;
    } catch (_) {}

    if (sdk >= 33) {
      final s = await Permission.audio.request();
      if (s.isDenied) {
        debugPrint('[DownloadService] Audio permission denied — downloads '
            'still work via app-scoped storage.');
      }
    } else if (sdk < 29) {
      final s = await Permission.storage.request();
      if (s.isDenied) {
        throw Exception('Storage permission required to download tracks.');
      }
    }
    // Android 10-12: app-scoped storage needs no permission
  }
}
