import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import '../models/track.dart';
import 'api_service.dart';

class AudioService {
  final AudioPlayer _player = AudioPlayer();

  AudioPlayer get player => _player;

  /// Loads a track. If it exists locally in Scoped Storage, play offline.
  /// Otherwise, stream it from the backend API.
  Future<void> playTrack(Track track, {String? localPath}) async {
    try {
      AudioSource source;
      
      if (localPath != null && localPath.isNotEmpty) {
        // Play local high-quality offline file
        source = AudioSource.uri(
          Uri.file(localPath),
          tag: MediaItem(
            id: track.id,
            album: track.album,
            title: track.title,
            artist: track.artist,
            artUri: track.coverUrl != null 
                ? Uri.parse('${ApiService.baseUrl}${track.coverUrl}')
                : null,
          ),
        );
      } else {
        // Stream from backend
        source = AudioSource.uri(
          Uri.parse('${ApiService.baseUrl}/stream/${track.id}'),
          tag: MediaItem(
            id: track.id,
            album: track.album,
            title: track.title,
            artist: track.artist,
            artUri: track.coverUrl != null 
                ? Uri.parse('${ApiService.baseUrl}${track.coverUrl}')
                : null,
          ),
        );
      }

      await _player.setAudioSource(source);
      await _player.play();
    } catch (e) {
      print("Error loading audio source: $e");
    }
  }

  void pause() => _player.pause();
  void resume() => _player.play();
  void dispose() => _player.dispose();
}
