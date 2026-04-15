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

/// Audio service that plays local files, server-streamed tracks, or
/// direct YouTube streams (fallback). All sync events are handled here.
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
  final ValueNotifier<bool> isAutoplayEnabled = ValueNotifier<bool>(true);
  bool _isAutoplayLoading = false;

  final ValueNotifier<Map<String, dynamic>?> lyrics =
      ValueNotifier<Map<String, dynamic>?>(null);
  final ValueNotifier<bool> isLoadingLyrics = ValueNotifier<bool>(false);

  // History tracking
  Stopwatch? _listenStopwatch;
  String? _lastTrackId;
  static const _historyThresholdSeconds = 30;

  // Sleep timer
  Timer? _sleepTimer;
  final ValueNotifier<DateTime?> sleepTimerEnd = ValueNotifier<DateTime?>(null);

  // Crossfade
  Timer? _fadeTimer;

  // Prevents echoing sync events back to the room
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
      if (state == ProcessingState.ready) _fadeIn();
      if (state == ProcessingState.completed && isAutoplayEnabled.value) {
        _autoplayNext();
      }
    });

    _player.playerStateStream.listen(
      (_) {},
      onError: (Object e, StackTrace st) {
        debugPrint('[AudioService] Error: $e');
        playbackError.value =
            e.toString().split('\n').first.split('Exception: ').last;
      },
    );

    // ── Sync: incoming playback events ────────────────────────────────────
    SyncService().onSyncReceived = (data) {
      final action = data['action'] as String?;
      
      // Calculate latency compensation (transit time)
      final now = DateTime.now().millisecondsSinceEpoch;
      final timestampMs = (data['timestamp'] as num?)?.toInt();
      final latency = timestampMs != null ? now - timestampMs : 0;
      final safeLatency = latency.clamp(0, 5000); // 5s cap
      
      // Safe int extraction — socket.io may deliver numbers as double
      final ms = (data['positionMs'] as num?)?.toInt();
      final adjustedMs = ms != null ? ms + safeLatency : null;

      switch (action) {
        case 'play':
          if (adjustedMs != null) _player.seek(Duration(milliseconds: adjustedMs));
          resume(broadcast: false);
          break;
        case 'pause':
          pause(broadcast: false);
          break;
        case 'seek':
          if (adjustedMs != null) seek(Duration(milliseconds: adjustedMs), broadcast: false);
          break;
        case 'change_track':
          final trackData = _safeMap(data['track']);
          if (trackData != null) {
            final track = _resolveTrack(trackData);
            if (currentTrack.value?.id != track.id) {
              _handleSyncPlayTrack(track, adjustedMs);
            }
          }
          break;
      }
    };

    // ── Sync: initial state when joining a room ────────────────────────────
    SyncService().onPartyStateReceived = (data) {
      debugPrint('[AudioService] Received party state on join: $data');
      final trackData = _safeMap(data['track']);
      
      // Calculate latency compensation for the initial state
      final now = DateTime.now().millisecondsSinceEpoch;
      final timestampMs = (data['timestamp'] as num?)?.toInt();
      final latency = timestampMs != null ? now - timestampMs : 0;
      final safeLatency = latency.clamp(0, 5000);

      final ms = (data['positionMs'] as num?)?.toInt();
      final adjustedMs = (ms != null && data['isPlaying'] == true) ? ms + safeLatency : ms;
      final isPlaying = data['isPlaying'] as bool? ?? false;

      if (trackData != null) {
        final track = _resolveTrack(trackData);
        _isHandlingSync = true;
        playTrack(track).then((_) {
          if (adjustedMs != null) _player.seek(Duration(milliseconds: adjustedMs));
          if (!isPlaying) _player.pause();
          Future.delayed(
            const Duration(milliseconds: 500),
            () => _isHandlingSync = false,
          );
        });
      }
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// Safely converts dynamic socket data to Map<String, dynamic>.
  static Map<String, dynamic>? _safeMap(dynamic data) {
    if (data == null) return null;
    if (data is Map<String, dynamic>) return data;
    if (data is Map) {
      try {
        return Map<String, dynamic>.from(data);
      } catch (_) {}
    }
    return null;
  }

  /// Builds a Track from received data, resolving relative coverUrls.
  static Track _resolveTrack(Map<String, dynamic> data) {
    Track track = Track.fromMap(data);
    // Prepend server base URL for relative cover URLs (e.g. /audio/uuid_cover.jpg)
    final cover = track.coverUrl;
    if (cover != null && cover.startsWith('/')) {
      final base = ServerConfig.baseUrl;
      if (base.isNotEmpty) {
        track = track.copyWith(coverUrl: '$base$cover');
      }
    }
    return track;
  }

  // ── Track change ──────────────────────────────────────────────────────────

  void _handleTrackChange(Track? newTrack) {
    // Save history for previous track
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

  Future<void> _handleSyncPlayTrack(Track track, int? ms) async {
    _isHandlingSync = true;
    try {
      await playTrack(track);
      if (ms != null) await _player.seek(Duration(milliseconds: ms));
    } finally {
      // Small delay so the currentIndexStream listener sees _isHandlingSync=true
      Future.delayed(
        const Duration(milliseconds: 500),
        () => _isHandlingSync = false,
      );
    }
  }

  // ── Sleep timer ───────────────────────────────────────────────────────────

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
  bool get isPlaying => _player.playing;

  // ── Playback ──────────────────────────────────────────────────────────────

  Future<void> playTrack(Track track) async {
    playbackError.value = null;
    final source = await _buildAudioSource(track);
    if (source == null) return;

    await _player.stop();
    _queue.clear();
    await _playlist.clear();
    _queue.add(track);
    await _playlist.add(source);
    queueNotifier.value = List.from(_queue);
    await _player.setAudioSource(_playlist);
    await _player.play();
  }

  Future<void> playAll(List<Track> tracks, {int startIndex = 0}) async {
    if (tracks.isEmpty) return;
    playbackError.value = null;

    _queue.clear();
    await _playlist.clear();

    final mainTrack =
        (startIndex >= 0 && startIndex < tracks.length) ? tracks[startIndex] : tracks.first;

    final firstSource = await _buildAudioSource(mainTrack);
    if (firstSource != null) {
      _queue.add(mainTrack);
      await _playlist.add(firstSource);
    }

    if (_queue.isNotEmpty) {
      await _player.setAudioSource(_playlist);
      unawaited(_player.play());
    }

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
      debugPrint('[AudioService] Lyrics error: $e');
    } finally {
      isLoadingLyrics.value = false;
    }
  }

  void toggleAutoplay() {
    isAutoplayEnabled.value = !isAutoplayEnabled.value;
  }

  // ── Autoplay ──────────────────────────────────────────────────────────────

  Future<void> _autoplayNext() async {
    if (_isAutoplayLoading) return;
    final last = currentTrack.value;
    if (last == null) return;

    _isAutoplayLoading = true;
    try {
      final existingIds = _queue.map((t) => t.id).toSet();
      final related =
          await ApiService().searchRelatedTracks(last, excludeIds: existingIds);
      if (related.isEmpty) return;

      for (final track in related) {
        final src = await _buildAudioSource(track);
        if (src != null) {
          _queue.add(track);
          await _playlist.add(src);
        }
      }
      queueNotifier.value = List.from(_queue);

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

  // ── Audio source builder ──────────────────────────────────────────────────

  static String? _extractYouTubeVideoId(String url) {
    final watchMatch = RegExp(r'[?&]v=([a-zA-Z0-9_-]{11})').firstMatch(url);
    if (watchMatch != null) return watchMatch.group(1);
    final shortMatch = RegExp(r'youtu\.be/([a-zA-Z0-9_-]{11})').firstMatch(url);
    if (shortMatch != null) return shortMatch.group(1);
    return null;
  }

  MediaItem _buildMediaItem(Track track) {
    Uri? artUri;
    if (track.coverUrl != null) {
      artUri = track.coverUrl!.startsWith('http')
          ? Uri.parse(track.coverUrl!)
          : Uri.file(track.coverUrl!);
    }
    return MediaItem(
      id: track.id,
      album: track.album,
      title: track.title,
      artist: track.artist,
      artUri: artUri,
    );
  }

  Future<AudioSource?> _buildAudioSource(Track track) async {
    // 1. Local file — fastest
    final localPath = await DownloadService.getLocalFilePath(track);
    if (localPath != null) {
      debugPrint('[AudioService] ▶ Local: $localPath');
      return AudioSource.uri(Uri.file(localPath), tag: _buildMediaItem(track));
    }

    final serverBase = ServerConfig.baseUrl;
    final isYouTube =
        track.sourceUrl.contains('youtube.com') || track.sourceUrl.contains('youtu.be');
    final isServerLibraryTrack = RegExp(
      r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
    ).hasMatch(track.id);

    // 2. Server-stored MP3 (UUID track)
    if (isServerLibraryTrack && serverBase.isNotEmpty) {
      final url = '$serverBase/api/stream/${track.id}';
      debugPrint('[AudioService] ▶ Server stream: $url');
      return AudioSource.uri(Uri.parse(url), tag: _buildMediaItem(track));
    }

    // 3a. YouTube via server proxy
    if (isYouTube && serverBase.isNotEmpty) {
      final extractedId = _extractYouTubeVideoId(track.sourceUrl) ?? track.id;
      final videoId = extractedId.replaceFirst('search-', '');
      final url = '$serverBase/api/stream/youtube?v=$videoId';
      debugPrint('[AudioService] ▶ Server YT proxy: $url');
      return AudioSource.uri(Uri.parse(url), tag: _buildMediaItem(track));
    }

    // 3b. YouTube direct (no server)
    if (isYouTube) {
      try {
        final extractedId = _extractYouTubeVideoId(track.sourceUrl) ?? track.id;
        final videoId = extractedId.replaceFirst('search-', '');
        debugPrint('[AudioService] ▶ YouTube direct: $videoId');
        final manifest = await ApiService().getAudioManifest(videoId);
        final streamInfo = manifest.audioOnly.sortByBitrate().last;
        return AudioSource.uri(
          Uri.parse(streamInfo.url.toString()),
          tag: _buildMediaItem(track),
        );
      } catch (e) {
        debugPrint('[AudioService] YouTube direct failed: $e');
        playbackError.value = 'Could not stream "${track.title}". Download it first.';
        return null;
      }
    }

    // 4. Generic server stream fallback
    if (serverBase.isNotEmpty) {
      final url = '$serverBase/api/stream/${track.id}';
      debugPrint('[AudioService] ▶ Fallback server stream: $url');
      return AudioSource.uri(Uri.parse(url), tag: _buildMediaItem(track));
    }

    playbackError.value =
        '"${track.title}" is not downloaded. Download it or configure a server URL.';
    return null;
  }

  // ── Transport controls ────────────────────────────────────────────────────

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

  void dispose() {
    _sleepTimer?.cancel();
    _fadeTimer?.cancel();
    _player.dispose();
  }
}