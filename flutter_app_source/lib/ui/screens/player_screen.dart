import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:just_audio/just_audio.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../../services/download_manager.dart';
import '../../models/track.dart';
import 'queue_view.dart';

class PlayerScreen extends StatefulWidget {
  const PlayerScreen({super.key});

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen>
    with SingleTickerProviderStateMixin {
  static const _accent = Color(0xFF06C167);
  static const _accentLight = Color(0xFF00FF85);

  bool _dragging = false;
  double _dragValue = 0;
  bool _showLyrics = true;

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final audio = context.read<AudioService>();
    final appState = context.watch<AppState>();

    return Scaffold(
      backgroundColor: Colors.black,
      body: ValueListenableBuilder<Track?>(
        valueListenable: audio.currentTrack,
        builder: (ctx, track, _) {
          if (track == null) {
            return SafeArea(
              child: Column(
                children: [
                  _buildAppBar(context),
                  const Expanded(
                    child: Center(
                      child: Text('No track playing',
                          style: TextStyle(color: Colors.white38, fontSize: 16)),
                    ),
                  ),
                ],
              ),
            );
          }

          final isFav = appState.favorites.contains(track.id);
          final isDownloaded = track.addedAt != null;

          return Stack(
            fit: StackFit.expand,
            children: [
              // Background gradient
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      _accent.withValues(alpha: 0.15),
                      Colors.black.withValues(alpha: 0.95),
                      Colors.black,
                    ],
                    stops: const [0.0, 0.4, 0.7],
                  ),
                ),
              ),

              // Blurred album art background
              if (track.coverUrl != null)
                Positioned.fill(
                  child: ImageFiltered(
                    imageFilter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                    child: Opacity(
                      opacity: 0.15,
                      child: _buildArtwork(track.coverUrl!, isBackground: true, title: track.title),
                    ),
                  ),
                ),

              // Content
              SafeArea(
                child: Column(
                  children: [
                    _buildAppBar(context),

                    const SizedBox(height: 16),

                    // ── Artwork & Lyrics Side-by-Side ───────────────────
                    Expanded(
                      flex: 7,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 600),
                          switchInCurve: Curves.easeOutCubic,
                          switchOutCurve: Curves.easeInCubic,
                          transitionBuilder: (child, anim) {
                            final slide = Tween<Offset>(
                              begin: const Offset(0.05, 0),
                              end: Offset.zero,
                            ).animate(anim);
                            return FadeTransition(
                              opacity: anim,
                              child: SlideTransition(position: slide, child: child),
                            );
                          },
                          child: !_showLyrics
                            ? Center(
                                key: const ValueKey('art_only'),
                                child: Container(
                                  constraints: const BoxConstraints(maxWidth: 320, maxHeight: 320),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(24),
                                    boxShadow: [
                                      BoxShadow(
                                        color: _accent.withValues(alpha: 0.15),
                                        blurRadius: 40,
                                        spreadRadius: 0,
                                        offset: const Offset(0, 10),
                                      ),
                                    ],
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(24),
                                    child: AspectRatio(
                                      aspectRatio: 1,
                                      child: track.coverUrl != null
                                          ? _buildArtwork(track.coverUrl!, title: track.title)
                                          : _ArtPlaceholder(title: track.title),
                                    ),
                                  ),
                                ),
                              )
                            : Row(
                                key: const ValueKey('side_by_side'),
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  // Art on Left
                                  Expanded(
                                    flex: 4,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(16),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.4),
                                            blurRadius: 20,
                                          ),
                                        ],
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(16),
                                        child: AspectRatio(
                                          aspectRatio: 1,
                                          child: track.coverUrl != null
                                              ? _buildArtwork(track.coverUrl!, title: track.title)
                                              : _ArtPlaceholder(title: track.title),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  // Lyrics on Right (centered layout)
                                  Expanded(
                                    flex: 6,
                                    child: Container(
                                      height: 380,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.04),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(20),
                                        child: _buildLyricsView(audio),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // ── Title / Artist / Favorite ─────────────────────────
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  track.title,
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.5,
                                    color: Colors.white,
                                    height: 1.2,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  track.artist,
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Colors.white.withValues(alpha: 0.5),
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          if (!isDownloaded) ...[
                            GestureDetector(
                              onTap: () {
                                DownloadManager().processJob(track.sourceUrl, appState);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Download started...'), duration: Duration(seconds: 2)),
                                );
                              },
                              child: Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.05),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.08),
                                  ),
                                ),
                                child: const Icon(
                                  Icons.download_rounded,
                                  color: Colors.white38,
                                  size: 22,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                          ],
                          GestureDetector(
                            onTap: () => appState.toggleFavorite(track.id),
                            child: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: isFav
                                    ? _accent.withValues(alpha: 0.15)
                                    : Colors.white.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isFav
                                      ? _accent.withValues(alpha: 0.3)
                                      : Colors.white.withValues(alpha: 0.08),
                                ),
                              ),
                              child: AnimatedSwitcher(
                                duration: const Duration(milliseconds: 200),
                                transitionBuilder: (child, anim) =>
                                    ScaleTransition(scale: anim, child: child),
                                child: Icon(
                                  isFav
                                      ? Icons.favorite_rounded
                                      : Icons.favorite_border_rounded,
                                  key: ValueKey(isFav),
                                  color: isFav ? _accent : Colors.white38,
                                  size: 22,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // ── Seek bar ─────────────────────────────────────────
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 28),
                      child: StreamBuilder<Duration>(
                        stream: audio.player.positionStream,
                        builder: (ctx, snapshot) {
                          final pos = snapshot.data ?? Duration.zero;
                          final dur = audio.player.duration ?? Duration.zero;
                          final total = dur.inMilliseconds.toDouble();
                          final current = _dragging
                              ? _dragValue
                              : (total > 0
                                  ? pos.inMilliseconds
                                      .toDouble()
                                      .clamp(0.0, total)
                                  : 0.0);

                          return Column(
                            children: [
                              SliderTheme(
                                data: SliderTheme.of(ctx).copyWith(
                                  trackHeight: 4,
                                  thumbShape: const RoundSliderThumbShape(
                                      enabledThumbRadius: 7),
                                  overlayShape:
                                      const RoundSliderOverlayShape(
                                          overlayRadius: 18),
                                  activeTrackColor: _accent,
                                  inactiveTrackColor:
                                      Colors.white.withValues(alpha: 0.08),
                                  thumbColor: Colors.white,
                                  overlayColor:
                                      _accent.withValues(alpha: 0.12),
                                ),
                                child: Slider(
                                  value: total > 0
                                      ? current.clamp(0.0, total)
                                      : 0,
                                  max: total > 0 ? total : 1,
                                  onChangeStart: (v) =>
                                      setState(() => _dragging = true),
                                  onChanged: (v) =>
                                      setState(() => _dragValue = v),
                                  onChangeEnd: (v) {
                                    audio.player.seek(
                                        Duration(milliseconds: v.toInt()));
                                    setState(() => _dragging = false);
                                  },
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _fmt(Duration(
                                          milliseconds: current.toInt())),
                                      style: TextStyle(
                                        color: Colors.white
                                            .withValues(alpha: 0.4),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                    Text(
                                      _fmt(dur),
                                      style: TextStyle(
                                        color: Colors.white
                                            .withValues(alpha: 0.4),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ),

                    const SizedBox(height: 16),

                    // ── Controls ─────────────────────────────────────────
                    Expanded(
                      flex: 2,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          // Shuffle
                          ValueListenableBuilder<bool>(
                            valueListenable: audio.isShuffleModeEnabled,
                            builder: (_, shuffle, __) => _CtrlBtn(
                              icon: Icons.shuffle_rounded,
                              active: shuffle,
                              onTap: audio.toggleShuffle,
                              size: 22,
                            ),
                          ),

                          // Previous
                          _CtrlBtn(
                            icon: Icons.skip_previous_rounded,
                            onTap: audio.playPrevious,
                            size: 38,
                          ),

                          // Play/Pause
                          StreamBuilder<PlayerState>(
                            stream: audio.player.playerStateStream,
                            builder: (_, snap) {
                              final playing = snap.data?.playing ?? false;
                              final loading = snap.data?.processingState ==
                                      ProcessingState.loading ||
                                  snap.data?.processingState ==
                                      ProcessingState.buffering;

                              return GestureDetector(
                                onTap: () => playing
                                    ? audio.pause()
                                    : audio.resume(),
                                child: Container(
                                  width: 76,
                                  height: 76,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [_accent, _accentLight],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color:
                                            _accent.withValues(alpha: 0.3),
                                        blurRadius: 20,
                                        spreadRadius: 2,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                  ),
                                  child: loading
                                      ? const Padding(
                                          padding: EdgeInsets.all(22),
                                          child:
                                              CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            color: Colors.black,
                                          ),
                                        )
                                      : Icon(
                                          playing
                                              ? Icons.pause_rounded
                                              : Icons.play_arrow_rounded,
                                          size: 42,
                                          color: Colors.black,
                                        ),
                                ),
                              );
                            },
                          ),

                          // Next
                          _CtrlBtn(
                            icon: Icons.skip_next_rounded,
                            onTap: audio.playNext,
                            size: 38,
                          ),

                          // Repeat
                          ValueListenableBuilder<LoopMode>(
                            valueListenable: audio.loopModeNotifier,
                            builder: (_, mode, __) => _CtrlBtn(
                              icon: mode == LoopMode.one
                                  ? Icons.repeat_one_rounded
                                  : Icons.repeat_rounded,
                              active: mode != LoopMode.off,
                              onTap: audio.toggleRepeat,
                              size: 22,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildArtwork(String url, {bool isBackground = false, required String title}) {
    // If it's a local file path (from DownloadService)
    if (!url.startsWith('http')) {
      return Image.file(
        File(url),
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _ArtPlaceholder(title: title),
      );
    }

    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      placeholder: (context, url) => _ArtPlaceholder(title: title),
      errorWidget: (context, url, error) => _ArtPlaceholder(title: title),
    );
  }

  Widget _buildLyricsView(AudioService audio) {
    return ValueListenableBuilder<bool>(
      valueListenable: audio.isLoadingLyrics,
      builder: (ctx, loading, _) {
        if (loading) {
          return const Center(
            child: Text('Loading lyrics...',
                style: TextStyle(color: Colors.white38, fontSize: 14)),
          );
        }
        return ValueListenableBuilder<Map<String, dynamic>?>(
          valueListenable: audio.lyrics,
          builder: (ctx, lyricsData, _) {
            if (lyricsData == null) {
              return const Center(
                child: Text('Lyrics not found',
                    style: TextStyle(color: Colors.white38, fontSize: 14)),
              );
            }

            final synced = lyricsData['syncedLyrics'] as String?;
            final plain = lyricsData['plainLyrics'] as String?;

            if (synced != null) {
              return _SyncedLyricsViewer(
                lrc: synced,
                player: audio.player,
              );
            } else if (plain != null) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Text(
                  plain,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 16,
                    height: 1.6,
                  ),
                ),
              );
            }

            return const Center(
              child: Text('Lyrics not available',
                  style: TextStyle(color: Colors.white38, fontSize: 14)),
            );
          },
        );
      },
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 32),
            color: Colors.white,
            onPressed: () => Navigator.pop(context),
          ),
          Text(
            'NOW PLAYING',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: Colors.white.withValues(alpha: 0.4),
              letterSpacing: 1.5,
            ),
          ),
          IconButton(
            icon: Icon(
              _showLyrics ? Icons.music_note_rounded : Icons.notes_rounded,
              color: _showLyrics ? _accent : Colors.white.withValues(alpha: 0.5),
            ),
            onPressed: () => setState(() => _showLyrics = !_showLyrics),
          ),
          IconButton(
            icon: Icon(Icons.queue_music_rounded,
                color: Colors.white.withValues(alpha: 0.5)),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const QueueView()),
            ),
          ),
        ],
      ),
    );
  }
}

class _SyncedLyricsViewer extends StatefulWidget {
  final String lrc;
  final AudioPlayer player;

  const _SyncedLyricsViewer({required this.lrc, required this.player});

  @override
  State<_SyncedLyricsViewer> createState() => _SyncedLyricsViewerState();
}

class _SyncedLyricsViewerState extends State<_SyncedLyricsViewer> {
  final ScrollController _scrollController = ScrollController();
  List<_LrcLine> _lines = [];
  int _currentIndex = -1;

  @override
  void initState() {
    super.initState();
    _parseLrc();
  }

  @override
  void didUpdateWidget(_SyncedLyricsViewer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.lrc != widget.lrc) _parseLrc();
  }

  void _parseLrc() {
    final lines = widget.lrc.split('\n');
    final regExp = RegExp(r'\[(\d+):(\d+\.\d+)\]');
    _lines = [];
    for (var line in lines) {
      final match = regExp.firstMatch(line);
      if (match != null) {
        final mm = int.parse(match.group(1)!);
        final ss = double.parse(match.group(2)!);
        final duration = Duration(
            minutes: mm, seconds: ss.toInt(), milliseconds: ((ss - ss.toInt()) * 1000).toInt());
        final text = line.replaceAll(regExp, '').trim();
        if (text.isNotEmpty) {
          _lines.add(_LrcLine(duration, text));
        }
      }
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Duration>(
      stream: widget.player.positionStream,
      builder: (context, snapshot) {
        final position = snapshot.data ?? Duration.zero;
        int newIndex = -1;
        for (int i = 0; i < _lines.length; i++) {
          if (position >= _lines[i].time) {
            newIndex = i;
          } else {
            break;
          }
        }

        if (newIndex != _currentIndex && newIndex != -1) {
          _currentIndex = newIndex;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_scrollController.hasClients) {
              // Center the current line
              // Container height is approx 340. Line height is 48.
              final offset = (_currentIndex * 48.0) - (340 / 2) + (48 / 2);
              _scrollController.animateTo(
                offset.clamp(0, _scrollController.position.maxScrollExtent),
                duration: const Duration(milliseconds: 600),
                curve: Curves.easeInOutCubic,
              );
            }
          });
        }

        return ListView.builder(
          controller: _scrollController,
          padding: const EdgeInsets.symmetric(vertical: 150, horizontal: 24),
          itemCount: _lines.length,
          itemBuilder: (context, index) {
            final isCurrent = index == _currentIndex;
            return GestureDetector(
              onTap: () {
                widget.player.seek(_lines[index].time);
              },
              behavior: HitTestBehavior.opaque,
              child: Container(
                height: 48,
                alignment: Alignment.center,
                child: AnimatedDefaultTextStyle(
                  duration: const Duration(milliseconds: 300),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isCurrent ? Colors.white : Colors.white.withValues(alpha: 0.2),
                    fontSize: isCurrent ? 22 : 18,
                    fontWeight: isCurrent ? FontWeight.w900 : FontWeight.w600,
                    letterSpacing: isCurrent ? -0.5 : 0,
                  ),
                  child: Text(_lines[index].text),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _LrcLine {
  final Duration time;
  final String text;
  _LrcLine(this.time, this.text);
}

class _CtrlBtn extends StatelessWidget {
  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  final double size;

  const _CtrlBtn({
    required this.icon,
    required this.onTap,
    this.active = false,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              icon,
              size: size,
              color: active ? Colors.white : Colors.white.withValues(alpha: 0.4),
            ),
            if (active)
              Positioned(
                bottom: -4,
                child: Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(
                    color: Color(0xFF06C167),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ArtPlaceholder extends StatelessWidget {
  final String title;
  const _ArtPlaceholder({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF111111),
            const Color(0xFF06C167).withValues(alpha: 0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          title.isNotEmpty ? title[0].toUpperCase() : '♪',
          style: TextStyle(
            fontSize: 80,
            fontWeight: FontWeight.w900,
            color: Colors.white.withValues(alpha: 0.06),
          ),
        ),
      ),
    );
  }
}
