import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../screens/player_screen.dart';

class NowPlayingBar extends StatelessWidget {
  const NowPlayingBar({super.key});

  static const _accent = Color(0xFF06C167);

  @override
  Widget build(BuildContext context) {
    final audio = context.watch<AudioService>();
    final track = audio.currentTrack.value;

    if (track == null) return const SizedBox.shrink();

    final appState = context.read<AppState>();
    final isFav = appState.favorites.contains(track.id);

    return GestureDetector(
      onTap: () {
        final audioService = context.read<AudioService>();
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (_, __, ___) => MultiProvider(
              providers: [
                ChangeNotifierProvider<AppState>.value(value: appState),
                Provider<AudioService>.value(value: audioService),
              ],
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
        );
      },
      child: Container(
        margin: const EdgeInsets.fromLTRB(8, 0, 8, 8),
        decoration: BoxDecoration(
          color: const Color(0xFF121212),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF1E1E1E)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _SeekStrip(audio: audio),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 12, 10),
              child: Row(
                children: [
                  // Artwork
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: (track.coverUrl != null)
                        ? CachedNetworkImage(
                            imageUrl: track.coverUrl!,
                            width: 44,
                            height: 44,
                            fit: BoxFit.cover,
                          )
                        : Container(
                            width: 44,
                            height: 44,
                            color: const Color(0xFF1E1E1E),
                            child: const Icon(Icons.music_note,
                                color: Colors.white24, size: 20),
                          ),
                  ),
                  const SizedBox(width: 12),

                  // Info
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
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          track.artist,
                          style: const TextStyle(
                            color: Color(0xFF888888),
                            fontSize: 11,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Favorite
                  IconButton(
                    icon: Icon(
                      isFav ? Icons.favorite : Icons.favorite_border,
                      color: isFav ? _accent : Colors.white70,
                      size: 20,
                    ),
                    onPressed: () => appState.toggleFavorite(track.id),
                  ),

                  // Play/Pause
                  StreamBuilder<bool>(
                    stream: audio.player.playingStream,
                    builder: (context, snapshot) {
                      final playing = snapshot.data ?? false;
                      return IconButton(
                        icon: Icon(
                          playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                          color: _accent,
                          size: 32,
                        ),
                        onPressed: () => playing ? audio.pause() : audio.resume(),
                      );
                    },
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

class _SeekStrip extends StatelessWidget {
  final AudioService audio;
  const _SeekStrip({required this.audio});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Duration>(
      stream: audio.player.positionStream,
      builder: (context, snapPos) {
        final pos = snapPos.data ?? Duration.zero;
        return StreamBuilder<Duration?>(
          stream: audio.player.durationStream,
          builder: (context, snapDur) {
            final dur = snapDur.data ?? Duration.zero;
            final pct = (dur.inMilliseconds > 0)
                ? (pos.inMilliseconds / dur.inMilliseconds).clamp(0.0, 1.0)
                : 0.0;

            return SizedBox(
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
                        borderRadius:
                            BorderRadius.horizontal(right: Radius.circular(2)),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}