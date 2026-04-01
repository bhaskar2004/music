
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import '../models/track.dart';
import 'api_service.dart';
import 'download_service.dart';
import 'server_config.dart';

/// Audio service that ONLY plays local downloaded files.
/// No YouTube CDN streaming — avoids URL expiry / DNS failures.
class AudioService {
  final AudioPlayer _player = AudioPlayer();

  final List<Track> _queue = [];
  final ConcatenatingAudioSource _playlist =
      ConcatenatingAudioSource(children: []);

  final ValueNotifier<Track?> currentTrack = ValueNotifier<Track?>(null);
  final ValueNotifier<List<Track>> queueNotifier =
      ValueNotifier<List<Track>>([]);
  final ValueNotifier<bool> isShuffleModeEnabled = ValueNotifier<bool>(false);
  final ValueNotifier<LoopMode> loopModeNotifier =
      ValueNotifier<LoopMode>(LoopMode.off);
  final ValueNotifier<String?> playbackError = ValueNotifier<String?>(null);

  final ValueNotifier<Map<String, dynamic>?> lyrics =
      ValueNotifier<Map<String, dynamic>?>(null);
  final ValueNotifier<bool> isLoadingLyrics = ValueNotifier<bool>(false);

  AudioService() {
    _player.currentIndexStream.listen((index) {
      if (index != null && index < _queue.length) {
        final newTrack = _queue[index];
        if (currentTrack.value?.id != newTrack.id) {
          currentTrack.value = newTrack;
          _fetchLyrics(newTrack);
        }
      } else if (_queue.isEmpty) {
        currentTrack.value = null;
        lyrics.value = null;
      }
    });

    _player.playbackEventStream.listen(
      (_) {},
      onError: (Object e, StackTrace st) {
        debugPrint('[AudioService] error: $e');
        playbackError.value =
            e.toString().split('\n').first.split('Exception: ').last;
      },
    );
  }

  AudioPlayer get player => _player;
  List<Track> get queue => List.unmodifiable(_queue);

  // ─── Playback ──────────────────────────────────────────────────────────────

  /// Play a single track (clears queue). Shows error if file not downloaded.
  Future<void> playTrack(Track track) async {
    playbackError.value = null;
    final source = await _buildAudioSource(track);
    if (source == null) return;

    currentTrack.value = track;
    _fetchLyrics(track);
    await _player.stop();
    _queue.clear();
    await _playlist.clear();

    _queue.add(track);
    await _playlist.add(source);
    queueNotifier.value = List.from(_queue);

    await _player.setAudioSource(_playlist);
    await _player.play();
  }

  /// Play a list starting at [startIndex]. Skips tracks not yet downloaded.
  Future<void> playAll(List<Track> tracks, {int startIndex = 0}) async {
    if (tracks.isEmpty) return;
    playbackError.value = null;

    _queue.clear();
    await _playlist.clear();

    // Only include tracks with a local file
    final playable = <Track>[];
    for (final t in tracks) {
      final src = await _buildAudioSource(t);
      if (src != null) {
        _queue.add(t);
        await _playlist.add(src);
        playable.add(t);
      }
    }

    if (playable.isEmpty) {
      playbackError.value =
          'No downloaded tracks found. Please download songs first.';
      return;
    }

    queueNotifier.value = List.from(_queue);

    // Map original startIndex to new index within playable list
    final targetTrack = startIndex < tracks.length ? tracks[startIndex] : tracks.first;
    final newIndex = _queue.indexWhere((t) => t.id == targetTrack.id);
    final safeIndex = newIndex >= 0 ? newIndex : 0;

    await _player.setAudioSource(_playlist, initialIndex: safeIndex);
    currentTrack.value = _queue[safeIndex];
    await _player.play();
  }

  /// Insert a track to play immediately after the current one.
  Future<void> playNextTrack(Track track) async {
    final src = await _buildAudioSource(track);
    if (src == null) return;

    final insertAt = (_player.currentIndex ?? 0) + 1;
    if (insertAt >= _queue.length) {
      _queue.add(track);
      await _playlist.add(src);
    } else {
      _queue.insert(insertAt, track);
      await _playlist.insert(insertAt, src);
    }
    queueNotifier.value = List.from(_queue);
  }

  /// Append a track to the end of the queue.
  Future<void> addToQueue(Track track) async {
    final src = await _buildAudioSource(track);
    if (src == null) return;
    _queue.add(track);
    await _playlist.add(src);
    queueNotifier.value = List.from(_queue);
  }

  Future<void> _fetchLyrics(Track track) async {
    lyrics.value = null;
    isLoadingLyrics.value = true;
    try {
      final data = await ApiService().fetchLyrics(track.artist, track.title);
      lyrics.value = data;
    } catch (e) {
      debugPrint('[AudioService] Error fetching lyrics: $e');
    } finally {
      isLoadingLyrics.value = false;
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  /// Returns an AudioSource backed by the local file, or null + sets error.
  Future<AudioSource?> _buildAudioSource(Track track) async {
    final localPath = await DownloadService.getLocalFilePath(track);

    if (localPath == null) {
      final serverBase = ServerConfig.baseUrl;
      
      // If it's a YouTube search result (not in local library/server library yet), 
      // stream directly from YouTube for immediate playback.
      final isYouTube = track.sourceUrl.contains('youtube.com') || track.sourceUrl.contains('youtu.be');
      final isSearchResult = track.addedAt == null;

      if (isYouTube && isSearchResult) {
        try {
          debugPrint('[AudioService] Fetching direct YouTube URL for ${track.title}');
          final manifest = await ApiService().getAudioManifest(track.id);
          final streamInfo = manifest.audioOnly.withHighestBitrate();
          final directUrl = streamInfo.url.toString();
          
          return AudioSource.uri(
            Uri.parse(directUrl),
            tag: MediaItem(
              id: track.id,
              album: track.album,
              title: track.title,
              artist: track.artist,
              artUri: track.coverUrl != null ? Uri.parse(track.coverUrl!) : null,
            ),
          );
        } catch (e) {
          debugPrint('[AudioService] YouTube direct stream failed: $e');
          // Fallback to server streaming if direct fails
        }
      }

      if (serverBase.isEmpty) {
        playbackError.value =
            '"${track.title}" is not downloaded yet. Tap the download icon or set server URL in settings.';
        debugPrint('[AudioService] File not found and server URL not set for ${track.title}');
        return null;
      }

      final streamUrl = '$serverBase/audio/${track.filename}';
      debugPrint('[AudioService] Streaming from server: $streamUrl');
      
      Uri? artUri;
      if (track.coverUrl != null) {
        if (track.coverUrl!.startsWith('http')) {
          artUri = Uri.parse(track.coverUrl!);
        } else {
          artUri = Uri.file(track.coverUrl!);
        }
      }

      return AudioSource.uri(
        Uri.parse(streamUrl),
        tag: MediaItem(
          id: track.id,
          album: track.album,
          title: track.title,
          artist: track.artist,
          artUri: artUri,
        ),
      );
    }

    debugPrint('[AudioService] Playing local: $localPath');
    Uri? artUri;
    if (track.coverUrl != null) {
      if (track.coverUrl!.startsWith('http')) {
        artUri = Uri.parse(track.coverUrl!);
      } else {
        artUri = Uri.file(track.coverUrl!);
      }
    }

    return AudioSource.uri(
      Uri.file(localPath),
      tag: MediaItem(
        id: track.id,
        album: track.album,
        title: track.title,
        artist: track.artist,
        artUri: artUri,
      ),
    );
  }

  // ─── Controls ──────────────────────────────────────────────────────────────

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

  void dispose() => _player.dispose();
}