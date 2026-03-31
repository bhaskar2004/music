import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';

import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/track.dart';

class DownloadService {
  static void init() {}

  // ─── Save directory ────────────────────────────────────────────────────────

  /// Android  → /sdcard/Android/data/<pkg>/files/Wavelength/
  /// iOS      → <documentsDir>/Wavelength/
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

  /// Full path to a track's audio file if it exists on disk, else null.
  static Future<String?> getLocalFilePath(Track track) async {
    final dir = await getSaveDirectory();
    final file = File('${dir.path}/${track.filename}');
    return (await file.exists()) ? file.path : null;
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
  }
}