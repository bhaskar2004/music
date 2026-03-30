import 'dart:io';
import 'package:dio/dio.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import '../models/track.dart';
import 'api_service.dart';
import 'database_service.dart';

class DownloadService {
  static final Dio _dio = Dio();
  static final Set<String> _activeDownloads = {};
  static final ValueNotifier<Set<String>> activeDownloadsNotifier = ValueNotifier({});

  static void init() {}

  static bool isDownloading(String trackId) => _activeDownloads.contains(trackId);

  static Future<String?> downloadTrackToDevice(Track track, {Function(double)? onProgress}) async {
    if (_activeDownloads.contains(track.id)) return null;
    
    _activeDownloads.add(track.id);
    activeDownloadsNotifier.value = Set.from(_activeDownloads);

    Directory? customDir;
    try {
      if (Platform.isAndroid) {
        var status = await Permission.manageExternalStorage.status;
        if (status.isDenied) status = await Permission.manageExternalStorage.request();
        if (status.isGranted) {
          customDir = Directory('/storage/emulated/0/Music/Wavelength');
        } else if (await Permission.audio.request().isGranted || await Permission.storage.request().isGranted) {
          customDir = Directory('/storage/emulated/0/Music/Wavelength');
        } else {
          final docs = await getApplicationDocumentsDirectory();
          customDir = Directory('${docs.path}/Wavelength');
        }
      } else {
        final docs = await getApplicationDocumentsDirectory();
        customDir = Directory('${docs.path}/Wavelength');
      }

      if (customDir != null && !await customDir.exists()) {
        await customDir.create(recursive: true);
      }

      final file = File('${customDir!.path}/${track.filename}');
      if (await file.exists()) return file.path;

      final api = ApiService();
      print("Attempting to get stream manifest for: ${track.id}");
      final manifest = await api.getAudioManifest(track.id);
      final audioStreams = manifest.audioOnly;
      
      if (audioStreams.isEmpty) throw Exception("No available audio streams found.");
      
      final streamInfo = audioStreams.reduce((curr, next) => 
        curr.bitrate.bitsPerSecond > next.bitrate.bitsPerSecond ? curr : next);
      
      // Fixed: youtube_explode stream client can sometimes hang. 
      // We use a timeout on the stream acquisition.
      final stream = api.getAudioStream(streamInfo).timeout(const Duration(seconds: 20), onTimeout: (sink) {
        sink.addError(Exception("Download stream timed out."));
      });

      final fileStream = file.openWrite();
      int received = 0;
      final total = streamInfo.size.totalBytes;
      
      await for (final data in stream) {
        received += data.length;
        fileStream.add(data);
        if (onProgress != null) onProgress(received / total);
      }

      await fileStream.flush();
      await fileStream.close();

      await DatabaseService().insertTrack(track);
      return file.path;
    } catch (e) {
      print("Download error: $e");
      rethrow;
    } finally {
      _activeDownloads.remove(track.id);
      activeDownloadsNotifier.value = Set.from(_activeDownloads);
    }
  }
}
