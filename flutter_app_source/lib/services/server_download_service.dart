import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../models/track.dart';
import 'download_service.dart';
import 'server_config.dart';
import 'storage_service.dart';

/// Result returned when a server-side download completes.
class ServerDownloadResult {
  final Track track;
  final String localPath;
  ServerDownloadResult({required this.track, required this.localPath});
}

/// Handles downloading songs via the Next.js server's `/api/download` endpoint.
///
/// Flow:
///   1. POST /api/download  { url }  → SSE stream with progress events
///   2. Parse SSE events: status, metadata, progress, done, error
///   3. On 'done', download the audio file from /audio/{filename}
///   4. Save locally to device storage
class ServerDownloadService {
  static final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 30),
    // Don't set receiveTimeout — the SSE stream is long-lived
  ));

  /// Downloads a track via the server.
  ///
  /// [url] — the YouTube (or other platform) URL
  /// [playlistId] — optional playlist to assign the track to
  /// [onStatus] — called with stage name ('metadata', 'downloading', 'processing')
  /// [onProgress] — called with download progress 0-100
  /// [onMetadata] — called with title, artist, album, thumbnail
  ///
  /// Throws on failure.
  static Future<ServerDownloadResult> download({
    required String url,
    String? playlistId,
    void Function(String stage, String message)? onStatus,
    void Function(double percent)? onProgress,
    void Function(String title, String artist, String? coverUrl)? onMetadata,
  }) async {
    final serverBase = ServerConfig.baseUrl;
    if (serverBase.isEmpty) {
      throw Exception('Server URL not configured. Please set it in settings.');
    }

    // ── 1. Start server-side download via SSE ─────────────────────────────
    debugPrint('[ServerDL] POST $serverBase/api/download  url=$url');

    final response = await _dio.post<ResponseBody>(
      '$serverBase/api/download',
      data: jsonEncode({'url': url}),
      options: Options(
        headers: {'Content-Type': 'application/json'},
        responseType: ResponseType.stream,
      ),
    );

    final stream = response.data?.stream;
    if (stream == null) {
      throw Exception('No response stream from server.');
    }

    // ── 2. Parse SSE event stream ─────────────────────────────────────────
    String buffer = '';
    Map<String, dynamic>? trackPayload;
    String? errorMessage;

    await for (final chunk in stream) {
      buffer += utf8.decode(chunk);

      // SSE frames are separated by double newlines
      while (buffer.contains('\n\n')) {
        final idx = buffer.indexOf('\n\n');
        final frame = buffer.substring(0, idx);
        buffer = buffer.substring(idx + 2);

        if (frame.trim().isEmpty) continue;

        String eventName = 'message';
        String dataLine = '';

        for (final line in frame.split('\n')) {
          if (line.startsWith('event: ')) {
            eventName = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            dataLine = line.substring(6).trim();
          }
        }

        if (dataLine.isEmpty) continue;

        Map<String, dynamic> payload;
        try {
          payload = jsonDecode(dataLine) as Map<String, dynamic>;
        } catch (_) {
          continue;
        }

        switch (eventName) {
          case 'status':
            final stage = payload['stage'] as String? ?? '';
            final message = payload['message'] as String? ?? '';
            debugPrint('[ServerDL] status: $stage — $message');
            onStatus?.call(stage, message);
            break;

          case 'metadata':
            final title = payload['title'] as String? ?? 'Unknown';
            final artist = payload['artist'] as String? ?? 'Unknown';
            final coverUrl = payload['thumbnail'] as String?;
            debugPrint('[ServerDL] metadata: $title by $artist');
            onMetadata?.call(title, artist, coverUrl);
            break;

          case 'progress':
            final percent = (payload['percent'] as num?)?.toDouble() ?? 0;
            onProgress?.call(percent);
            break;

          case 'done':
            trackPayload = payload['track'] as Map<String, dynamic>?;
            debugPrint('[ServerDL] done: ${trackPayload?['title']}');
            break;

          case 'error':
            errorMessage = payload['message'] as String? ?? 'Unknown server error';
            debugPrint('[ServerDL] error: $errorMessage');
            break;
        }
      }
    }

    if (errorMessage != null) {
      throw Exception(errorMessage);
    }

    if (trackPayload == null) {
      throw Exception('Server did not return track info.');
    }

    // ── 3. Download the audio file from the server ────────────────────────
    final filename = trackPayload['filename'] as String;
    final serverFileUrl = '$serverBase/audio/$filename';

    debugPrint('[ServerDL] Downloading file: $serverFileUrl');
    onStatus?.call('saving', 'Saving to device…');

    final saveDir = await DownloadService.getSaveDirectory();
    final localFile = File('${saveDir.path}/$filename');
    final tmpFile = File('${localFile.path}.part');

    await _dio.download(
      serverFileUrl,
      tmpFile.path,
      options: Options(receiveTimeout: const Duration(minutes: 5)),
      onReceiveProgress: (received, total) {
        if (total > 0) {
          onProgress?.call((received / total * 100).clamp(0, 100));
        }
      },
    );

    // Verify file integrity
    final tmpSize = await tmpFile.length();
    if (tmpSize < 1024) {
      if (await tmpFile.exists()) await tmpFile.delete();
      throw Exception('Downloaded file too small ($tmpSize bytes), likely corrupt.');
    }

    await tmpFile.rename(localFile.path);
    debugPrint('[ServerDL] ✓ Saved to ${localFile.path} ($tmpSize bytes)');

    // ── 4. Download thumbnail if provided ─────────────────────────────────
    String? localCoverUrl;
    final serverCoverUrl = trackPayload['coverUrl'] as String?;
    if (serverCoverUrl != null && serverCoverUrl.isNotEmpty) {
      try {
        // The coverUrl from server is like "/audio/uuid_cover.jpg"
        final coverFileUrl = '$serverBase$serverCoverUrl';
        final coverFilename = serverCoverUrl.split('/').last;
        final coverFile = File('${saveDir.path}/$coverFilename');

        await _dio.download(coverFileUrl, coverFile.path);
        localCoverUrl = coverFile.path;
        debugPrint('[ServerDL] ✓ Cover saved to ${coverFile.path}');
      } catch (e) {
        // Non-fatal — use the remote thumbnail URL instead
        debugPrint('[ServerDL] Cover download failed: $e');
        localCoverUrl = serverCoverUrl.startsWith('http')
            ? serverCoverUrl
            : null;
      }
    }

    // ── 5. Build Track and persist ────────────────────────────────────────
    final track = Track(
      id: trackPayload['id'] as String? ?? filename.replaceAll('.mp3', ''),
      title: trackPayload['title'] as String? ?? 'Unknown',
      artist: trackPayload['artist'] as String? ?? 'Unknown',
      album: trackPayload['album'] as String? ?? 'Unknown',
      duration: trackPayload['duration'] as int? ?? 0,
      filename: filename,
      coverUrl: localCoverUrl ?? (trackPayload['coverUrl'] as String?),
      sourceUrl: url,
      addedAt: DateTime.now().toIso8601String(),
      format: trackPayload['format'] as String? ?? 'mp3',
      playlistId: playlistId,
    );

    await StorageService().insertTrack(track);

    return ServerDownloadResult(track: track, localPath: localFile.path);
  }

  /// Quick health-check: can we reach the server?
  static Future<bool> isServerReachable() async {
    try {
      final response = await _dio.get(
        '${ServerConfig.baseUrl}/api/search?q=test',
        options: Options(
          receiveTimeout: const Duration(seconds: 5),
          validateStatus: (_) => true, // Accept any status code
        ),
      );
      return response.statusCode != null;
    } catch (_) {
      return false;
    }
  }
}
