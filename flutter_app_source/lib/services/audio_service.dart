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
  
  // The master queue of tracks
  final List<Track> _queue = [];
  final ConcatenatingAudioSource _playlist = ConcatenatingAudioSource(children: []);

  // State Notifiers
  final ValueNotifier<Track?> currentTrack = ValueNotifier<Track?>(null);
  final ValueNotifier<List<Track>> queueNotifier = ValueNotifier<List<Track>>([]);
  final ValueNotifier<bool> isShuffleModeEnabled = ValueNotifier<bool>(false);
  final ValueNotifier<LoopMode> loopModeNotifier = ValueNotifier<LoopMode>(LoopMode.off);

  AudioService() {
    _init();
  }

  void _init() {
    // Listen to index changes to update currentTrack
    _player.currentIndexStream.listen((index) {
      if (index != null && index < _queue.length) {
        currentTrack.value = _queue[index];
      } else if (_queue.isEmpty) {
        currentTrack.value = null;
      }
    });

    // Listen to playback state to handle errors or auto-play
    _player.playbackEventStream.listen((event) {}, onError: (Object e, StackTrace st) {
      print('A playback error occurred: $e');
    });
  }

  AudioPlayer get player => _player;
  List<Track> get queue => List.unmodifiable(_queue);

  /// Plays a single track instantly (clears the queue)
  Future<void> playTrack(Track track) async {
    _queue.clear();
    _playlist.clear();
    await addToQueue(track);
    await _player.setAudioSource(_playlist);
    await _player.play();
  }

  /// Adds a track to the end of the queue
  Future<void> addToQueue(Track track) async {
    final source = await _createAudioSource(track);
    _queue.add(track);
    await _playlist.add(source);
    queueNotifier.value = List.from(_queue);
  }

  /// Adds a list of tracks to the queue (e.g., Play All)
  Future<void> playAll(List<Track> tracks) async {
    if (tracks.isEmpty) return;
    _queue.clear();
    await _playlist.clear();
    
    for (var track in tracks) {
      final source = await _createAudioSource(track);
      _queue.add(track);
      await _playlist.add(source);
    }
    
    queueNotifier.value = List.from(_queue);
    await _player.setAudioSource(_playlist);
    await _player.play();
  }

  Future<AudioSource> _createAudioSource(Track track) async {
    // Check for local file
    String localPath = "";
    if (Platform.isAndroid) {
      localPath = "/storage/emulated/0/Music/Wavelength/${track.filename}";
    } else {
      final docs = await getApplicationDocumentsDirectory();
      localPath = "${docs.path}/Wavelength/${track.filename}";
    }

    final localFile = File(localPath);
    Uri uri;
    if (await localFile.exists()) {
      uri = Uri.file(localPath);
    } else {
      final streamUrl = await _api.getAudioStreamUrl(track.id);
      uri = Uri.parse(streamUrl);
    }

    return AudioSource.uri(
      uri,
      tag: MediaItem(
        id: track.id,
        album: track.album,
        title: track.title,
        artist: track.artist,
        artUri: track.coverUrl != null ? Uri.parse(track.coverUrl!) : null,
      ),
    );
  }

  // Controls
  Future<void> playNext() async {
    if (_player.hasNext) {
      await _player.seekToNext();
    }
  }

  Future<void> playPrevious() async {
    if (_player.hasPrevious) {
      await _player.seekToPrevious();
    }
  }

  void toggleShuffle() {
    final nextMode = !isShuffleModeEnabled.value;
    isShuffleModeEnabled.value = nextMode;
    _player.setShuffleModeEnabled(nextMode);
  }

  void toggleRepeat() {
    LoopMode next;
    switch (loopModeNotifier.value) {
      case LoopMode.off:
        next = LoopMode.all;
        break;
      case LoopMode.all:
        next = LoopMode.one;
        break;
      case LoopMode.one:
        next = LoopMode.off;
        break;
    }
    loopModeNotifier.value = next;
    _player.setLoopMode(next);
  }

  Future<void> reorderQueue(int oldIndex, int newIndex) async {
    if (oldIndex < newIndex) {
      newIndex -= 1;
    }
    final item = _queue.removeAt(oldIndex);
    _queue.insert(newIndex, item);
    await _playlist.move(oldIndex, newIndex);
    queueNotifier.value = List.from(_queue);
  }

  void pause() => _player.pause();
  void resume() => _player.play();
  
  void dispose() {
    _player.dispose();
    _api.dispose();
  }
}
