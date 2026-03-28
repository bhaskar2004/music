import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import '../models/track.dart';

class ApiService {
  final YoutubeExplode _yt = YoutubeExplode();
  static const String _defaultUrl = 'http://10.0.2.2:3000';

  Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('server_url') ?? _defaultUrl;
  }

  Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', url);
  }

  /// Fetches the shared library from the Node.js backend
  Future<List<Track>> fetchLibrary() async {
    try {
      final host = await getBaseUrl();
      final response = await http.get(Uri.parse('$host/api/library'));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) {
          // Flatten thumbnail/image handling
          String? coverUrl = json['coverUrl'];
          if (coverUrl != null && coverUrl.startsWith('/')) {
            coverUrl = '$host$coverUrl';
          }
          return Track(
            id: json['id'],
            title: json['title'],
            artist: json['artist'],
            album: json['album'] ?? 'Unknown',
            duration: json['duration'],
            filename: json['filename'],
            coverUrl: coverUrl,
            sourceUrl: json['sourceUrl'],
            format: json['format'] ?? 'mp3',
          );
        }).toList();
      }
      return [];
    } catch (e) {
      print('Error fetching library from backend: $e');
      return [];
    }
  }

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
