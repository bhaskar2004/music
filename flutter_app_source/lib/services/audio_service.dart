import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import '../models/track.dart';
import 'api_service.dart';
import 'download_service.dart';

/// Headers required for YouTube CDN URLs.
/// Without these, YouTube returns 403 and just_audio silently buffers forever.
const _youtubeHeaders = {
  'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Origin': 'https://www.youtube.com',
  'Referer': 'https://www.youtube.com/',
};

class AudioService {
  final AudioPlayer _player = AudioPlayer();
  final ApiService _api = ApiService();

  // Queue management
  final List<Track> _queue = [];
  final ConcatenatingAudioSource _playlist =
      ConcatenatingAudioSource(children: []);

  // Observable state
  final ValueNotifier<Track?> currentTrack = ValueNotifier<Track?>(null);
  final ValueNotifier<List<Track>> queueNotifier =
      ValueNotifier<List<Track>>([]);
  final ValueNotifier<bool> isShuffleModeEnabled = ValueNotifier<bool>(false);
  final ValueNotifier<LoopMode> loopModeNotifier =
      ValueNotifier<LoopMode>(LoopMode.off);
  final ValueNotifier<String?> playbackError = ValueNotifier<String?>(null);

  AudioService() {
    _init();
  }

  void _init() {
    _player.currentIndexStream.listen((index) {
      if (index != null && index < _queue.length) {
        currentTrack.value = _queue[index];
      } else if (_queue.isEmpty) {
        currentTrack.value = null;
      }
    });

    _player.playbackEventStream.listen(
      (_) {},
      onError: (Object e, StackTrace st) {
        debugPrint('AudioService playback error: $e');
        playbackError.value = 'Playback error: ${e.toString().split('\n').first}';
      },
    );
  }

  AudioPlayer get player => _player;
  List<Track> get queue => List.unmodifiable(_queue);

  /// Plays a single track immediately (clears queue).
  Future<void> playTrack(Track track) async {
    playbackError.value = null; // Clear previous errors
    currentTrack.value = track;
    await _player.stop(); // Immediately stop the previous track while loading
    _queue.clear();
    await _playlist.clear();

    final source = await _buildAudioSource(track);
    await _playlist.add(source);
    _queue.add(track);
    queueNotifier.value = List.from(_queue);

    await _player.setAudioSource(_playlist);
    await _player.play();
  }

  /// Adds a track to the end of the current queue.
  Future<void> addToQueue(Track track) async {
    final source = await _buildAudioSource(track);
    _queue.add(track);
    await _playlist.add(source);
    queueNotifier.value = List.from(_queue);
  }

  /// Clears queue and plays all tracks from the beginning.
  Future<void> playAll(List<Track> tracks) async {
    if (tracks.isEmpty) return;
    _queue.clear();
    await _playlist.clear();

    for (final track in tracks) {
      final source = await _buildAudioSource(track);
      _queue.add(track);
      await _playlist.add(source);
    }

    queueNotifier.value = List.from(_queue);
    await _player.setAudioSource(_playlist);
    await _player.play();
  }

  /// Builds an AudioSource for a track.
  ///
  /// Priority: local downloaded file → YouTube stream URL (with required headers).
  Future<AudioSource> _buildAudioSource(Track track) async {
    // Check if the file is already downloaded locally
    final localPath = await DownloadService.getLocalFilePath(track);

    final Uri uri;
    final Map<String, String>? headers;

    if (localPath != null) {
      debugPrint('[AudioService] Playing local file: $localPath');
      uri = Uri.file(localPath);
      headers = null; // Local files don't need headers
    } else {
      debugPrint('[AudioService] Streaming from YouTube: ${track.title}');
      try {
        final streamUrl = await _api.getAudioStreamUrl(track.id);
        uri = Uri.parse(streamUrl);
        headers = _youtubeHeaders; // ← This is the critical fix
      } catch (e) {
        debugPrint('[AudioService] Failed to get stream URL: $e');
        rethrow;
      }
    }

    return AudioSource.uri(
      uri,
      headers: headers,
      tag: MediaItem(
        id: track.id,
        album: track.album,
        title: track.title,
        artist: track.artist,
        artUri:
            track.coverUrl != null ? Uri.parse(track.coverUrl!) : null,
      ),
    );
  }

  Future<void> playNext() async {
    if (_player.hasNext) await _player.seekToNext();
  }

  Future<void> playPrevious() async {
    if (_player.hasPrevious) await _player.seekToPrevious();
  }

  void toggleShuffle() {
    final next = !isShuffleModeEnabled.value;
    isShuffleModeEnabled.value = next;
    _player.setShuffleModeEnabled(next);
  }

  void toggleRepeat() {
    final next = switch (loopModeNotifier.value) {
      LoopMode.off => LoopMode.all,
      LoopMode.all => LoopMode.one,
      LoopMode.one => LoopMode.off,
    };
    loopModeNotifier.value = next;
    _player.setLoopMode(next);
  }

  Future<void> reorderQueue(int oldIndex, int newIndex) async {
    if (oldIndex < newIndex) newIndex -= 1;
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