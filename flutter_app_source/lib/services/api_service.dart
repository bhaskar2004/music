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

  /// Fetches the direct audio stream URL for a specific video ID 
  Future<String> getAudioStreamUrl(String videoId) async {
    final manifest = await _yt.videos.streamsClient.getManifest(videoId);
    final audioStreamInfo = manifest.audioOnly.withHighestBitrate();
    return audioStreamInfo.url.toString();
  }

  void dispose() {
    _yt.close();
  }
}
