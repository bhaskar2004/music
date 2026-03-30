import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import '../models/track.dart';

class ApiService {
  final YoutubeExplode _yt = YoutubeExplode();

  /// Searches YouTube directly from the device (No Next.js backend needed)
  Future<List<Track>> searchTracks(String query) async {
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
  }

  /// Fetches track metadata from a direct YouTube URL
  Future<Track?> getTrackFromUrl(String url) async {
    try {
      final video = await _yt.videos.get(url);
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
      print("Error fetching video from URL: $e");
      return null;
    }
  }

  /// Fetches the audio manifest for a specific video ID
  Future<StreamManifest> getAudioManifest(String videoId) async {
    return await _yt.videos.streamsClient.getManifest(videoId);
  }

  /// Fetches the actual audio stream for a specific StreamInfo
  Stream<List<int>> getAudioStream(StreamInfo streamInfo) {
    return _yt.videos.streamsClient.get(streamInfo);
  }

  /// Fetches the direct audio stream URL for a specific video ID 
  Future<String> getAudioStreamUrl(String videoId) async {
    try {
      final manifest = await getAudioManifest(videoId);
      final audioStreams = manifest.audioOnly;
      
      if (audioStreams.isEmpty) {
        throw Exception("No available audio streams found for this track.");
      }
      
      final audioStreamInfo = audioStreams.reduce((curr, next) => curr.bitrate.bitsPerSecond > next.bitrate.bitsPerSecond ? curr : next);
      return audioStreamInfo.url.toString();
    } catch (e) {
      print("Error fetching audio stream for $videoId: $e");
      rethrow;
    }
  }

  void dispose() {
    _yt.close();
  }
}
