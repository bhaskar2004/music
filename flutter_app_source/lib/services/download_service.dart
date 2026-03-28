import 'dart:io';
import 'package:flutter_downloader/flutter_downloader.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import '../models/track.dart';
import 'api_service.dart';

class DownloadService {
  static void init() async {
    await FlutterDownloader.initialize(debug: true, ignoreSsl: true);
  }

  /// Downloads the MP3 file from the backend directly into the Android `Music/Wavelength` directory
  /// Using Android Scoped Storage / standard paths.
  static Future<String?> downloadTrackToDevice(Track track) async {
    // 1. Request Storage Permissions (Android 10+ needs Manage External Storage or MediaStore)
    if (Platform.isAndroid) {
      if (await Permission.manageExternalStorage.request().isGranted ||
          await Permission.storage.request().isGranted) {
        // Permissions granted
      } else {
        throw Exception("Storage permission required to download songs");
      }
    }

    // 2. Define standard Android Music Directory
    Directory? customDir;
    if (Platform.isAndroid) {
      // Points exactly to /storage/emulated/0/Music
      customDir = Directory('/storage/emulated/0/Music/Wavelength');
    } else {
      customDir = Directory((await getApplicationDocumentsDirectory()).path + '/Wavelength');
    }

    if (!await customDir.exists()) {
      await customDir.create(recursive: true);
    }

    // Prevent duplicates
    final file = File('${customDir.path}/${track.filename}');
    if (await file.exists()) {
      print("File already exists locally.");
      return file.path;
    }

    // 3. Enqueue download utilizing flutter_downloader (Background Downloader)
    final url = '${ApiService.baseUrl}/audio/${track.filename}';

    final taskId = await FlutterDownloader.enqueue(
      url: url,
      savedDir: customDir.path,
      fileName: track.filename,
      showNotification: true, // Show Android download progress notification
      openFileFromNotification: true, // Allow tapping notification to play
      requiresStorageNotLow: true,
      saveInPublicStorage: true, // Enforce public storage explicitly
    );

    return taskId;
  }
}
