
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart' as yt;
import '../models/track.dart';
import '../models/history_entry.dart';
import 'api_service.dart';
import 'download_service.dart';
import 'storage_service.dart';
import 'server_config.dart';
import 'sync_service.dart';

/// Audio service that ONLY plays local downloaded files.
/// No YouTube CDN streaming — avoids URL expiry / DNS failures.
class AudioService {
  final AudioPlayer _player = AudioPlayer();

  final List<Track> _queue = [];
  final ConcatenatingAudioSource _playlist = // ignore: deprecated_member_use
      ConcatenatingAudioSource(children: []); // ignore: deprecated_member_use

  final ValueNotifier<Track?> currentTrack = ValueNotifier<Track?>(null);
  final ValueNotifier<List<Track>> queueNotifier =
      ValueNotifier<List<Track>>([]);
  final ValueNotifier<bool> isShuffleModeEnabled = ValueNotifier<bool>(false);
  final ValueNotifier<LoopMode> loopModeNotifier =
      ValueNotifier<LoopMode>(LoopMode.off);
  final ValueNotifier<String?> playbackError = ValueNotifier<String?>(null);
  final ValueNotifier<bool> isAutoplayEnabled = ValueNotifier<bool>(true);
  bool _isAutoplayLoading = false;

  final ValueNotifier<Map<String, dynamic>?> lyrics =
      ValueNotifier<Map<String, dynamic>?>(null);
  final ValueNotifier<bool> isLoadingLyrics = ValueNotifier<bool>(false);
  
  // Tracking for history
  Stopwatch? _listenStopwatch;
  String? _lastTrackId;
  static const _historyThresholdSeconds = 30;

  // Sleep Timer
  Timer? _sleepTimer;
  final ValueNotifier<DateTime?> sleepTimerEnd = ValueNotifier<DateTime?>(null);

  // Crossfade state
  Timer? _fadeTimer;

  // Sync state
  bool _isHandlingSync = false;

  AudioService() {
    _player.currentIndexStream.listen((index) {
      if (index != null && index < _queue.length) {
        final newTrack = _queue[index];
        if (currentTrack.value?.id != newTrack.id) {
          _handleTrackChange(newTrack);
        }
      } else if (_queue.isEmpty) {
        _handleTrackChange(null);
      }
    });

    _player.playingStream.listen((playing) {
      if (playing) {
        _listenStopwatch?.start();
      } else {
        _listenStopwatch?.stop();
      }
    });

    _player.processingStateStream.listen((state) {
      if (state == ProcessingState.ready) {
        _fadeIn();
      }
      // Autoplay: when queue is fully exhausted, fetch more similar tracks
      if (state == ProcessingState.completed && isAutoplayEnabled.value) {
        _autoplayNext();
      }
    });

    _player.playbackEventStream.listen((_) {});
    _player.playerStateStream.listen((state) {}, onError: (Object e, StackTrace st) {
        debugPrint('[AudioService] error: $e');
        playbackError.value =
            e.toString().split('\n').first.split('Exception: ').last;
      },
    );

    // Bind Listen Together synchronization
    SyncService().onSyncReceived = (data) {
      final action = data['action'] as String?;
      final ms = data['positionMs'] as int?;
      
      if (action == 'play') {
        if (ms != null) _player.seek(Duration(milliseconds: ms));
        resume(broadcast: false);
      } else if (action == 'pause') {
        pause(broadcast: false);
      } else if (action == 'seek' && ms != null) {
        seek(Duration(milliseconds: ms), broadcast: false);
      } else if (action == 'change_track') {
        final trackData = data['track'] as Map<String, dynamic>?;
        if (trackData != null) {
          final track = Track.fromMap(trackData);
          if (currentTrack.value?.id != track.id) {
             _handleSyncPlayTrack(track, ms);
          }
        }
      }
    };
  }

  Future<void> _handleSyncPlayTrack(Track track, int? ms) async {
    _isHandlingSync = true;
    try {
      await playTrack(track);
      if (ms != null) {
        await _player.seek(Duration(milliseconds: ms));
      }
    } finally {
      // Delay disabling sync lock to prevent race conditions echoing back
      Future.delayed(const Duration(milliseconds: 500), () => _isHandlingSync = false);
    }
  }

  void _handleTrackChange(Track? newTrack) {
    // Save history for previous track if threshold met
    if (_lastTrackId != null && _listenStopwatch != null) {
      final elapsed = _listenStopwatch!.elapsed.inSeconds;
      if (elapsed >= _historyThresholdSeconds) {
        StorageService().saveHistoryEntry(HistoryEntry(
          trackId: _lastTrackId!,
          timestamp: DateTime.now(),
          durationSeconds: elapsed,
        ));
      }
    }

    // Reset for new track
    _lastTrackId = newTrack?.id;
    _listenStopwatch = Stopwatch();
    if (_player.playing) _listenStopwatch!.start();

    currentTrack.value = newTrack;
    if (newTrack != null) {
      _fetchLyrics(newTrack);
      if (!_isHandlingSync) {
        SyncService().broadcastPlayback(
          action: 'change_track',
          trackId: newTrack.id,
          positionMs: _player.position.inMilliseconds,
          trackJson: newTrack.toMap(),
        );
      }
    } else {
      lyrics.value = null;
    }
  }

  void setSleepTimer(Duration? duration) {
    _sleepTimer?.cancel();
    if (duration == null || duration.inSeconds == 0) {
      sleepTimerEnd.value = null;
      return;
    }

    sleepTimerEnd.value = DateTime.now().add(duration);
    _sleepTimer = Timer(duration, () {
      pause();
      sleepTimerEnd.value = null;
    });
  }

  void _fadeIn() {
    _fadeTimer?.cancel();
    _player.setVolume(0);
    double vol = 0;
    _fadeTimer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      vol += 0.05;
      if (vol >= 1.0) {
        _player.setVolume(1.0);
        timer.cancel();
      } else {
        _player.setVolume(vol);
      }
    });
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

  /// Play a list starting at [startIndex].
  Future<void> playAll(List<Track> tracks, {int startIndex = 0}) async {
    if (tracks.isEmpty) return;
    playbackError.value = null;

    _queue.clear();
    await _playlist.clear();

    // Map original startIndex to tracks
    final mainTrack = startIndex >= 0 && startIndex < tracks.length ? tracks[startIndex] : tracks.first;

    // Building sources one by one can be slow. 
    // We prioritize the tapped track to start playback quickly.
    final firstSource = await _buildAudioSource(mainTrack);
    if (firstSource != null) {
      _queue.add(mainTrack);
      await _playlist.add(firstSource);
    }

    // Add others. We don't wait for all of them to start playing the first one.
    // However, to keep code simple and avoid race conditions with just_audio's playlist,
    // we'll still build them in sequence but start playback as soon as the first is ready.
    
    if (_queue.isNotEmpty) {
      await _player.setAudioSource(_playlist);
      currentTrack.value = _queue[0];
      unawaited(_player.play());
    }

    // Fill the rest of the queue in background
    for (final t in tracks) {
      if (t.id == mainTrack.id) continue;
      final src = await _buildAudioSource(t);
      if (src != null) {
        _queue.add(t);
        await _playlist.add(src);
      }
    }

    if (_queue.isEmpty) {
      playbackError.value = 'Failed to load any tracks for playback.';
      return;
    }

    queueNotifier.value = List.from(_queue);
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

  void toggleAutoplay() {
    isAutoplayEnabled.value = !isAutoplayEnabled.value;
    debugPrint('[AudioService] Autoplay: ${isAutoplayEnabled.value}');
  }

  // ─── Autoplay / Radio ─────────────────────────────────────────────────────

  Future<void> _autoplayNext() async {
    if (_isAutoplayLoading) return;
    final last = currentTrack.value;
    if (last == null) return;

    _isAutoplayLoading = true;
    debugPrint('[AudioService] Autoplay: fetching similar tracks for "${last.title}"');

    try {
      // Collect IDs already in queue to avoid duplicates
      final existingIds = _queue.map((t) => t.id).toSet();
      final related = await ApiService().searchRelatedTracks(last, excludeIds: existingIds);

      if (related.isEmpty) {
        debugPrint('[AudioService] Autoplay: no related tracks found');
        return;
      }

      debugPrint('[AudioService] Autoplay: adding ${related.length} tracks to queue');

      for (final track in related) {
        final src = await _buildAudioSource(track);
        if (src != null) {
          _queue.add(track);
          await _playlist.add(src);
        }
      }

      queueNotifier.value = List.from(_queue);

      // Start playing the next track
      if (_player.hasNext) {
        await _player.seekToNext();
        await _player.play();
      }
    } catch (e) {
      debugPrint('[AudioService] Autoplay error: $e');
    } finally {
      _isAutoplayLoading = false;
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  /// Extracts a YouTube video ID from a URL like:
  /// - https://www.youtube.com/watch?v=dQw4w9WgXcQ
  /// - https://youtu.be/dQw4w9WgXcQ
  /// - https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share
  /// Returns null if not a valid YouTube URL.
  static String? _extractYouTubeVideoId(String url) {
    // Try standard watch URLs
    final watchMatch = RegExp(r'[?&]v=([a-zA-Z0-9_-]{11})').firstMatch(url);
    if (watchMatch != null) return watchMatch.group(1);

    // Try youtu.be short URLs
    final shortMatch = RegExp(r'youtu\.be/([a-zA-Z0-9_-]{11})').firstMatch(url);
    if (shortMatch != null) return shortMatch.group(1);

    return null;
  }

  /// Builds a MediaItem tag for notification / lock-screen metadata.
  MediaItem _buildMediaItem(Track track) {
    Uri? artUri;
    if (track.coverUrl != null) {
      if (track.coverUrl!.startsWith('http')) {
        artUri = Uri.parse(track.coverUrl!);
      } else {
        artUri = Uri.file(track.coverUrl!);
      }
    }
    return MediaItem(
      id: track.id,
      album: track.album,
      title: track.title,
      artist: track.artist,
      artUri: artUri,
    );
  }

  /// Returns an AudioSource backed by the local file, or null + sets error.
  ///
  /// Priority chain:
  ///   1. Local downloaded file
  ///   2. Server file stream (`/api/stream/{uuid}`) — for synced library tracks
  ///   3. Server YouTube proxy (`/api/stream/youtube?v={videoId}`) — for YouTube search results
  ///   4. Direct YouTube stream via youtube_explode_dart — fallback when no server
  Future<AudioSource?> _buildAudioSource(Track track) async {
    final localPath = await DownloadService.getLocalFilePath(track);

    // ── 1. Local file ───────────────────────────────────────────────────────
    if (localPath != null) {
      debugPrint('[AudioService] Playing local: $localPath');
      return AudioSource.uri(
        Uri.file(localPath),
        tag: _buildMediaItem(track),
      );
    }

    final serverBase = ServerConfig.baseUrl;
    final isYouTube = track.sourceUrl.contains('youtube.com') || track.sourceUrl.contains('youtu.be');

    // Detect whether this is a server library track (UUID id) or a YouTube
    // search result (11-char YouTube video ID as id).
    final isServerLibraryTrack = RegExp(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$').hasMatch(track.id);

    // ── 2. Server file stream (for synced library tracks) ───────────────────
    // These tracks already have an mp3 on the server at /api/stream/{uuid}.
    if (isServerLibraryTrack && serverBase.isNotEmpty) {
      final streamUrl = '$serverBase/api/stream/${track.id}';
      debugPrint('[AudioService] Streaming server library track: $streamUrl');
      return AudioSource.uri(
        Uri.parse(streamUrl),
        tag: _buildMediaItem(track),
      );
    }

    // ── 3. YouTube streaming (for search results) ───────────────────────────
    if (isYouTube) {
      // Extract the real video ID from the source URL (don't trust track.id
      // for synced tracks — it's a UUID, not a video ID).
      final videoId = _extractYouTubeVideoId(track.sourceUrl) ?? track.id;

      // 3a. Server-side YouTube proxy
      if (serverBase.isNotEmpty) {
        final streamUrl = '$serverBase/api/stream/youtube?v=$videoId';
        debugPrint('[AudioService] Streaming via server YouTube proxy: $streamUrl');
        return AudioSource.uri(
          Uri.parse(streamUrl),
          tag: _buildMediaItem(track),
        );
      }

      // 3b. Direct YouTube stream (no server available)
      try {
        debugPrint('[AudioService] Fetching direct YouTube URL for "${track.title}" (videoId=$videoId)');
        final yt.StreamManifest manifest = await ApiService().getAudioManifest(videoId);
        final streamInfo = manifest.audioOnly.sortByBitrate().last;
        final directUrl = streamInfo.url.toString();

        return AudioSource.uri(
          Uri.parse(directUrl),
          tag: _buildMediaItem(track),
        );
      } catch (e) {
        debugPrint('[AudioService] YouTube direct stream failed: $e');
        playbackError.value =
            'Could not stream "${track.title}". Connect to server or download first.';
        return null;
      }
    }

    // ── 4. Non-YouTube, non-local, server stream ────────────────────────────
    if (serverBase.isNotEmpty) {
      final streamUrl = '$serverBase/api/stream/${track.id}';
      debugPrint('[AudioService] Streaming from server: $streamUrl');
      return AudioSource.uri(
        Uri.parse(streamUrl),
        tag: _buildMediaItem(track),
      );
    }

    // Nothing worked
    playbackError.value =
        '"${track.title}" is not downloaded yet. Tap the download icon or set server URL in settings.';
    debugPrint('[AudioService] No playback source available for ${track.title}');
    return null;
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

  Future<void> seek(Duration position, {bool broadcast = true}) async {
    if (broadcast) {
      SyncService().broadcastPlayback(
        action: 'seek',
        trackId: currentTrack.value?.id ?? '',
        positionMs: position.inMilliseconds,
      );
    }
    await _player.seek(position);
  }

  void pause({bool broadcast = true}) {
    if (broadcast) {
      SyncService().broadcastPlayback(
        action: 'pause',
        trackId: currentTrack.value?.id ?? '',
        positionMs: _player.position.inMilliseconds,
      );
    }
    _player.pause();
  }

  void resume({bool broadcast = true}) {
    if (broadcast) {
      SyncService().broadcastPlayback(
        action: 'play',
        trackId: currentTrack.value?.id ?? '',
        positionMs: _player.position.inMilliseconds,
      );
    }
    _player.play();
  }

  void dispose() => _player.dispose();
}