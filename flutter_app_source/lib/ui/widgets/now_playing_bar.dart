import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:just_audio/just_audio.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../../models/track.dart';
import '../screens/player_screen.dart';

class NowPlayingBar extends StatelessWidget {
  const NowPlayingBar({super.key});


  @override
  Widget build(BuildContext context) {
    final audio = context.read<AudioService>();

    return ValueListenableBuilder<Track?>(
      valueListenable: audio.currentTrack,
      builder: (ctx, track, _) {
        if (track == null) return const _EmptyBar();

        return _Bar(track: track, audio: audio);
      },
    );
  }
}

class _Bar extends StatelessWidget {
  final Track track;
  final AudioService audio;

  const _Bar({required this.track, required this.audio});

  static const _accent = Color(0xFF06C167);

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final isFav = appState.favorites.contains(track.id);

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => ChangeNotifierProvider.value(
            value: appState,
            child: const PlayerScreen(),
          ),
          transitionsBuilder: (_, anim, __, child) => SlideTransition(
            position: Tween(
              begin: const Offset(0, 1),
              end: Offset.zero,
            ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
            child: child,
          ),
        ),
      ),
      child: Container(
        margin: const EdgeInsets.fromLTRB(8, 0, 8, 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1A1A1A),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF2A2A2A)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Progress bar at top
            _SeekStrip(audio: audio),

            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 8, 10),
              child: Row(
                children: [
                  // Album art
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0A0A0A),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: track.coverUrl != null
                          ? CachedNetworkImage(
                              imageUrl: track.coverUrl!,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) =>
                                  _Placeholder(title: track.title),
                            )
                          : _Placeholder(title: track.title),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Track info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          track.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: Colors.white,
                            letterSpacing: -0.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          track.artist,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF888888),
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Favorite
                  GestureDetector(
                    onTap: () {
                      appState.toggleFavorite(track.id);
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        transitionBuilder: (child, anim) => ScaleTransition(
                          scale: anim,
                          child: child,
                        ),
                        child: Icon(
                          isFav
                              ? Icons.favorite_rounded
                              : Icons.favorite_border_rounded,
                          key: ValueKey(isFav),
                          color: isFav ? _accent : Colors.white24,
                          size: 20,
                        ),
                      ),
                    ),
                  ),

                  // Prev
                  GestureDetector(
                    onTap: () => audio.playPrevious(),
                    behavior: HitTestBehavior.opaque,
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4),
                      child: Icon(Icons.skip_previous_rounded,
                          color: Colors.white70, size: 26),
                    ),
                  ),

                  // Play/Pause
                  StreamBuilder<PlayerState>(
                    stream: audio.player.playerStateStream,
                    builder: (ctx2, snap) {
                      final state = snap.data;
                      final playing = state?.playing ?? false;
                      final loading =
                          state?.processingState == ProcessingState.loading ||
                          state?.processingState == ProcessingState.buffering;

                      return GestureDetector(
                        onTap: () => playing ? audio.pause() : audio.resume(),
                        behavior: HitTestBehavior.opaque,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: loading
                              ? const SizedBox(
                                  width: 30,
                                  height: 30,
                                  child: Padding(
                                    padding: EdgeInsets.all(4),
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: _accent,
                                    ),
                                  ),
                                )
                              : Icon(
                                  playing
                                      ? Icons.pause_rounded
                                      : Icons.play_arrow_rounded,
                                  color: Colors.white,
                                  size: 30,
                                ),
                        ),
                      );
                    },
                  ),

                  // Next
                  GestureDetector(
                    onTap: () => audio.playNext(),
                    behavior: HitTestBehavior.opaque,
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4),
                      child: Icon(Icons.skip_next_rounded,
                          color: Colors.white70, size: 26),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Thin interactive seek strip at the top of the bar
class _SeekStrip extends StatelessWidget {
  final AudioService audio;
  const _SeekStrip({required this.audio});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Duration>(
      stream: audio.player.positionStream,
      builder: (_, snap) {
        final pos = snap.data ?? Duration.zero;
        final dur = audio.player.duration ?? Duration.zero;
        final pct = dur.inMilliseconds > 0
            ? (pos.inMilliseconds / dur.inMilliseconds).clamp(0.0, 1.0)
            : 0.0;

        return GestureDetector(
          onHorizontalDragUpdate: (details) {
            final box = context.findRenderObject() as RenderBox?;
            if (box == null) return;
            final frac = (details.localPosition.dx / box.size.width)
                .clamp(0.0, 1.0);
            final dur2 = audio.player.duration;
            if (dur2 != null) {
              audio.player.seek(Duration(
                  milliseconds: (frac * dur2.inMilliseconds).toInt()));
            }
          },
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
            child: SizedBox(
              height: 3,
              child: Stack(
                children: [
                  Container(color: Colors.white.withValues(alpha: 0.08)),
                  FractionallySizedBox(
                    widthFactor: pct,
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF06C167), Color(0xFF00FF85)],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _Placeholder extends StatelessWidget {
  final String title;
  const _Placeholder({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF111111),
      alignment: Alignment.center,
      child: Text(
        title.isNotEmpty ? title[0].toUpperCase() : '?',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: Colors.white.withValues(alpha: 0.12),
        ),
      ),
    );
  }
}

class _EmptyBar extends StatelessWidget {
  const _EmptyBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      margin: const EdgeInsets.fromLTRB(8, 0, 8, 8),
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1E1E1E)),
      ),
      alignment: Alignment.center,
      child: const Text(
        'Select a track to begin playing',
        style: TextStyle(
          color: Color(0xFF444444),
          fontSize: 13,
          fontFamily: 'monospace',
        ),
      ),
    );
  }
}
