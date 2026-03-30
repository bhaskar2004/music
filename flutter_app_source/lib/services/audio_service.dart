import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'package:path_provider/path_provider.dart';
import '../models/track.dart';
import 'api_service.dart';

class AudioService {
  final AudioPlayer _player = AudioPlayer();
  final ApiService _api = ApiService();

  final ValueNotifier<Track?> currentTrack = ValueNotifier<Track?>(null);

  AudioPlayer get player => _player;

  /// Loads a track. Prioritizes local storage for offline playback.
  Future<void> playTrack(Track track) async {
    currentTrack.value = track;
    try {
      AudioSource source;
      
      // Check for local file in Android Music/Wavelength or iOS Documents
      String localPath = "";
      if (Platform.isAndroid) {
        localPath = "/storage/emulated/0/Music/Wavelength/${track.filename}";
      } else {
        final docs = await getApplicationDocumentsDirectory();
        localPath = "${docs.path}/Wavelength/${track.filename}";
      }

      final localFile = File(localPath);
      if (await localFile.exists()) {
        print("Playing local offline file: $localPath");
        source = AudioSource.uri(
          Uri.file(localPath),
          tag: MediaItem(
            id: track.id,
            album: track.album,
            title: track.title,
            artist: track.artist,
            artUri: track.coverUrl != null ? Uri.parse(track.coverUrl!) : null,
          ),
        );
      } else {
        // Stream seamlessly direct from YouTube
        print("Streaming from YouTube: ${track.title}");
        final streamUrl = await _api.getAudioStreamUrl(track.id);
        
        source = AudioSource.uri(
          Uri.parse(streamUrl),
          tag: MediaItem(
            id: track.id,
            album: track.album,
            title: track.title,
            artist: track.artist,
            artUri: track.coverUrl != null ? Uri.parse(track.coverUrl!) : null,
          ),
        );
      }

      await _player.setAudioSource(source);
      await _player.play();
    } catch (e) {
      print("Error loading standalone audio source: $e");
    }
  }

  void pause() => _player.pause();
  void resume() => _player.play();
  
  void dispose() {
    _player.dispose();
    _api.dispose();
  }
}
