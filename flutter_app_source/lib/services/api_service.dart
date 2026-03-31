import 'package:flutter/foundation.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import '../models/track.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final YoutubeExplode _yt = YoutubeExplode();

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
      final videoId = VideoId.parseVideoId(url);
      final video = await _yt.videos
          .get(videoId)
          .timeout(const Duration(seconds: 45));
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

  /// Fetches the audio manifest for a specific video ID
  Future<StreamManifest> getAudioManifest(String videoId) async {
    return await _yt.videos.streamsClient.getManifest(videoId).timeout(
      const Duration(seconds: 45),
      onTimeout: () {
        throw Exception('Metadata fetch timed out. Check your connection.');
      },
    );
  }

  /// Returns a raw byte stream for a specific StreamInfo
  Stream<List<int>> getAudioStream(StreamInfo streamInfo) {
    return _yt.videos.streamsClient.get(streamInfo);
  }

  /// Returns the highest-quality audio stream URL for a video ID
  Future<String> getAudioStreamUrl(String videoId) async {
    final manifest = await getAudioManifest(videoId);
    final streams = manifest.audioOnly;
    if (streams.isEmpty) {
      throw Exception('No audio streams found for this video.');
    }
    final best = streams.reduce(
      (a, b) => a.bitrate.bitsPerSecond > b.bitrate.bitsPerSecond ? a : b,
    );
    return best.url.toString();
  }

  void dispose() {
    // Singleton — do not close between calls
  }
}
