import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/track.dart';

class ApiService {
  /// NOTE: This points to your computer's local Wi-Fi IP so your physical phone
  /// can talk to the Next.js yt-dlp server running on this machine!
  static const String baseUrl = 'http://10.204.40.47:3000/api';

  Future<List<Track>> fetchLibrary() async {
    final response = await http.get(Uri.parse('$baseUrl/library'));
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data['tracks'] != null) {
        return (data['tracks'] as List)
            .map((json) => Track.fromJson(json))
            .toList();
      }
    }
    throw Exception('Failed to load library');
  }

  /// Initiates a download request to the Next.js backend.
  /// Backend will fetch metadata and convert to MP3.
  Future<void> requestBackendDownload(String url) async {
    final response = await http.post(
      Uri.parse('$baseUrl/download'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'url': url}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to start download on backend');
    }
    // We would typically listen to the SSE stream here for real-time progress,
    // but for simplicity in the flutter wrapper we can poll the library 
    // or rely on flutter_downloader logic if we handle the conversion completely server side
  }
}
