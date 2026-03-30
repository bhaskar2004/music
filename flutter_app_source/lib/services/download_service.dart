import 'dart:io';
import 'package:dio/dio.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import '../models/track.dart';
import 'api_service.dart';
import 'database_service.dart';

class DownloadService {
  static final Dio _dio = Dio(BaseOptions(
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    },
  ));

  static void init() {
    // No-op for current standalone dio implementation
  }

  /// Downloads the highest quality audio stream directly to the Android physical Music directory.
  /// 100% independent - no Node.js backend required.
  static Future<String?> downloadTrackToDevice(Track track) async {
    Directory? customDir;
    bool usingInternalStorage = false;

    if (Platform.isAndroid) {
      // 1. Try to get Permission.manageExternalStorage (All Files Access)
      var status = await Permission.manageExternalStorage.status;
      if (status.isDenied) {
        status = await Permission.manageExternalStorage.request();
      }

      if (status.isGranted) {
        customDir = Directory('/storage/emulated/0/Music/Wavelength');
      } else {
        // 2. Fallback to basic storage/audio permissions for Android 10 and below or scoped storage
        if (await Permission.audio.request().isGranted || 
            await Permission.storage.request().isGranted) {
           // For scoped storage, /storage/emulated/0/Music might still work if it's a media folder
           customDir = Directory('/storage/emulated/0/Music/Wavelength');
        } else {
          // 3. Last fallback: Internal App Storage (No permissions needed)
          print("Permissions denied. Falling back to internal app storage.");
          final docs = await getApplicationDocumentsDirectory();
          customDir = Directory('${docs.path}/Wavelength');
          usingInternalStorage = true;
        }
      }
    } else {
      final docs = await getApplicationDocumentsDirectory();
      customDir = Directory('${docs.path}/Wavelength');
    }

    final file = File('${customDir.path}/${track.filename}');
    if (await file.exists()) {
      print("File already exists locally.");
      return file.path;
    }

    final api = ApiService();
    try {
      print("Attempting to get stream URL for: ${track.id}");
      final streamUrl = await api.getAudioStreamUrl(track.id);
      print("Found stream URL, starting download to: ${file.path}");
      
      await _dio.download(
        streamUrl,
        file.path,
        onReceiveProgress: (received, total) {
          if (total != -1) {
             print('Download progress [${track.title}]: ${(received / total * 100).toStringAsFixed(0)}%');
          }
        },
      );

      print("Download completed successfully for: ${track.title}");
      await DatabaseService().insertTrack(track);
      return file.path;
    } catch (e) {
      print("Fatal download error for ${track.title}: $e");
      // Clean up partial file if download failed
      if (await file.exists()) {
        await file.delete();
      }
      rethrow;
    } finally {
      api.dispose();
    }
  }
}
