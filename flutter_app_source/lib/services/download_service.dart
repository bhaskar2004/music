import 'dart:io';
import 'package:dio/dio.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import '../models/track.dart';
import 'api_service.dart';
import 'database_service.dart';

class DownloadService {
  static final Dio _dio = Dio();

  static void init() {
    // No-op for current standalone dio implementation
  }

  /// Downloads the highest quality audio stream directly to the Android physical Music directory.
  /// 100% independent - no Node.js backend required.
  static Future<String?> downloadTrackToDevice(Track track) async {
    if (Platform.isAndroid) {
      if (await Permission.manageExternalStorage.request().isGranted ||
          await Permission.storage.request().isGranted) {
        // Permissions granted
      } else {
        throw Exception("Storage permission required to download songs directly.");
      }
    }

    Directory? customDir;
    if (Platform.isAndroid) {
      customDir = Directory('/storage/emulated/0/Music/Wavelength');
    } else {
      customDir = Directory((await getApplicationDocumentsDirectory()).path + '/Wavelength');
    }

    if (!await customDir.exists()) {
      await customDir.create(recursive: true);
    }

    final file = File('${customDir.path}/${track.filename}');
    if (await file.exists()) {
      print("File already exists locally.");
      return file.path;
    }

    final api = ApiService();
    try {
      // 1. Get the direct stream URL from YouTube without any backend
      final streamUrl = await api.getAudioStreamUrl(track.id);
      
      // 2. Download the file streams robustly
      await _dio.download(
        streamUrl,
        file.path,
        onReceiveProgress: (received, total) {
          if (total != -1) {
             print('Download progress: ${(received / total * 100).toStringAsFixed(0)}%');
          }
        },
      );

      // 3. Persist metadata to local library database
      await DatabaseService().insertTrack(track);

      return file.path;
    } finally {
      api.dispose();
    }
  }
}
