import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/track.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../screens/player_screen.dart';

class NowPlayingBar extends StatelessWidget {
  const NowPlayingBar({super.key});

  static const _accent = Color(0xFF06C167);
  static const _accentLight = Color(0xFF00FF85);

  @override
  Widget build(BuildContext context) {
    // Use context.read (not watch!) since AudioService is NOT a ChangeNotifier.
    // Reactivity comes from ValueListenableBuilder below.
    final audio = context.read<AudioService>();

    return ValueListenableBuilder<Track?>(
      valueListenable: audio.currentTrack,
      builder: (ctx, track, _) {
        if (track == null) return const SizedBox.shrink();

        final appState = context.watch<AppState>();
        final isFav = appState.favorites.contains(track.id);

        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              PageRouteBuilder(
                pageBuilder: (_, __, ___) => MultiProvider(
                  providers: [
                    ChangeNotifierProvider<AppState>.value(value: appState),
                    Provider<AudioService>.value(value: audio),
                  ],
                  child: const PlayerScreen(),
                ),
                transitionsBuilder: (_, anim, __, child) => SlideTransition(
                  position: Tween(
                    begin: const Offset(0, 1),
                    end: Offset.zero,
                  ).animate(
                      CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
                  child: child,
                ),
              ),
            );
          },
          child: Container(
            margin: const EdgeInsets.fromLTRB(8, 0, 8, 4),
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.08),
              ),
              boxShadow: [
                BoxShadow(
                  color: _accent.withValues(alpha: 0.08),
                  blurRadius: 24,
                  spreadRadius: 0,
                  offset: const Offset(0, 4),
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.5),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
                child: Container(
                  color: const Color(0xFF0D0D0D).withValues(alpha: 0.85),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Seek progress strip
                      _SeekStrip(audio: audio),

                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                        child: Row(
                          children: [
                            // Artwork with glow
                            Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: [
                                  BoxShadow(
                                    color: _accent.withValues(alpha: 0.15),
                                    blurRadius: 12,
                                    spreadRadius: 0,
                                  ),
                                ],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: (track.coverUrl != null)
                                    ? CachedNetworkImage(
                                        imageUrl: track.coverUrl!,
                                        width: 48,
                                        height: 48,
                                        fit: BoxFit.cover,
                                        errorWidget: (_, __, ___) =>
                                            _artPlaceholder(),
                                      )
                                    : _artPlaceholder(),
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
                                      fontSize: 14,
                                      color: Colors.white,
                                      letterSpacing: -0.3,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    track.artist,
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.5),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),

                            // Favorite button
                            GestureDetector(
                              onTap: () => appState.toggleFavorite(track.id),
                              child: Padding(
                                padding: const EdgeInsets.all(8),
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
                                    size: 20,
                                  ),
                                ),
                              ),
                            ),

                            // Play/Pause button
                            StreamBuilder<bool>(
                              stream: audio.player.playingStream,
                              builder: (context, snapshot) {
                                final playing = snapshot.data ?? false;
                                return GestureDetector(
                                  onTap: () =>
                                      playing ? audio.pause() : audio.resume(),
                                  child: Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        colors: [_accent, _accentLight],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      ),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      playing
                                          ? Icons.pause_rounded
                                          : Icons.play_arrow_rounded,
                                      color: Colors.black,
                                      size: 24,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _artPlaceholder() {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF1A1A1A),
            _accent.withValues(alpha: 0.1),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Icon(Icons.music_note_rounded, color: Colors.white24, size: 22),
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
                  Container(
                    color: Colors.white.withValues(alpha: 0.06),
                  ),
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