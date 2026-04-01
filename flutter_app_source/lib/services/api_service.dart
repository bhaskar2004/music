import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart' as yt;
import '../models/track.dart';
import '../models/playlist.dart';
import 'server_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  // Lightweight singleton for search & metadata (no CDN URLs involved)
  final yt.YoutubeExplode _yt = yt.YoutubeExplode();
  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  /// Fetches the entire library and playlists from the Next.js server
  Future<Map<String, dynamic>> fetchServerLibrary() async {
    final serverBase = ServerConfig.baseUrl;
    if (serverBase.isEmpty) return {'tracks': [], 'playlists': []};

    try {
      final response = await _dio.get('$serverBase/api/library');
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        
        // Process tracks
        final tracksJson = data['tracks'] as List<dynamic>;
        final tracks = tracksJson.map((t) {
          final track = Track.fromJson(t);
          if (track.coverUrl != null && track.coverUrl!.startsWith('/')) {
            return track.copyWith(coverUrl: '$serverBase${track.coverUrl}');
          }
          return track;
        }).toList();

        // Process playlists
        final playlistsJson = data['playlists'] as List<dynamic>? ?? [];
        final playlists = playlistsJson.map((p) => Playlist.fromMap(p)).toList();

        return {
          'tracks': tracks,
          'playlists': playlists,
        };
      }
      return {'tracks': [], 'playlists': []};
    } catch (e) {
      debugPrint('[ApiService] fetchServerLibrary error: $e');
      return {'tracks': [], 'playlists': []};
    }
  }

  /// Searches YouTube directly from the device
  Future<List<Track>> searchTracks(String query) async {
    try {
      final searchResults = await _yt.search.search(query);
      return searchResults.map((video) {
        return Track(
          id: video.id.value,
          title: video.title,
          artist: video.author,
          album: 'Unknown',
          duration: video.duration?.inSeconds ?? 0,
          filename: '${video.id.value}.mp3',
          coverUrl: video.thumbnails.highResUrl,
          sourceUrl: video.url,
          format: 'mp3',
        );
      }).toList();
    } catch (e) {
      debugPrint('Search error: $e');
      return [];
    }
  }

  /// Fetches track metadata from a direct YouTube URL
  Future<Track?> getTrackFromUrl(String url) async {
    try {
      final videoId = yt.VideoId.parseVideoId(url);
      final video = await _yt.videos
          .get(videoId)
          .timeout(const Duration(seconds: 60));
      return Track(
        id: video.id.value,
        title: video.title,
        artist: video.author,
        album: 'Unknown',
        duration: video.duration?.inSeconds ?? 0,
        filename: '${video.id.value}.mp3',
        coverUrl: video.thumbnails.highResUrl,
        sourceUrl: video.url,
        format: 'mp3',
      );
    } catch (e) {
      debugPrint('Error fetching video from URL ($url): $e');
      return null;
    }
  }

  /// Fetches lyrics from the Next.js backend
  Future<Map<String, dynamic>?> fetchLyrics(String artist, String title) async {
    final serverBase = ServerConfig.baseUrl;
    if (serverBase.isEmpty) return null;

    try {
      final response = await _dio.get(
        '$serverBase/api/lyrics',
        queryParameters: {'title': title, 'artist': artist},
      );
      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('[ApiService] fetchLyrics error: $e');
      return null;
    }
  }

  /// Fetches the audio manifest using the singleton (for non-download use).
  Future<yt.StreamManifest> getAudioManifest(String videoId) async {
    return await _yt.videos.streamsClient.getManifest(videoId).timeout(
      const Duration(seconds: 60),
      onTimeout: () {
        throw Exception('Metadata fetch timed out. Check your connection.');
      },
    );
  }

  void dispose() {
    // Singleton — do not close between calls
  }
}
