import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:just_audio/just_audio.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../../models/track.dart';
import 'queue_view.dart';

class PlayerScreen extends StatefulWidget {
  const PlayerScreen({super.key});

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  static const _accent = Color(0xFF06C167);

  bool _dragging = false;
  double _dragValue = 0;

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
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 32),
          color: Colors.white,
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Now Playing',
          style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF888888),
              letterSpacing: 0.5),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.queue_music_rounded, color: Colors.white54),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const QueueView()),
            ),
          ),
        ],
      ),
      body: ValueListenableBuilder<Track?>(
        valueListenable: audio.currentTrack,
        builder: (ctx, track, _) {
          if (track == null) {
            return const Center(
              child: Text('No track playing',
                  style: TextStyle(color: Colors.white38)),
            );
          }

          final isFav = appState.favorites.contains(track.id);

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              children: [
                const SizedBox(height: 16),

                // ── Artwork ──────────────────────────────────────────────
                Expanded(
                  flex: 5,
                  child: Center(
                    child: Container(
                      constraints:
                          const BoxConstraints(maxWidth: 340, maxHeight: 340),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: _accent.withValues(alpha: 0.15),
                            blurRadius: 40,
                            spreadRadius: 8,
                            offset: const Offset(0, 12),
                          ),
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.6),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: AspectRatio(
                          aspectRatio: 1,
                          child: track.coverUrl != null
                              ? CachedNetworkImage(
                                  imageUrl: track.coverUrl!,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) =>
                                      _ArtPlaceholder(title: track.title),
                                )
                              : _ArtPlaceholder(title: track.title),
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                // ── Title / Artist / Favorite ─────────────────────────────
                Expanded(
                  flex: 2,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              track.title,
                              style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.5,
                                  color: Colors.white),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              track.artist,
                              style: const TextStyle(
                                  fontSize: 15,
                                  color: Color(0xFF888888),
                                  fontWeight: FontWeight.w500),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      GestureDetector(
                        onTap: () => appState.toggleFavorite(track.id),
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
                            size: 26,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Seek bar ─────────────────────────────────────────────
                StreamBuilder<Duration>(
                  stream: audio.player.positionStream,
                  builder: (ctx, snapshot) {
                    final pos = snapshot.data ?? Duration.zero;
                    final dur =
                        audio.player.duration ?? Duration.zero;
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
                            overlayShape: const RoundSliderOverlayShape(
                                overlayRadius: 16),
                            activeTrackColor: Colors.white,
                            inactiveTrackColor: Colors.white12,
                            thumbColor: Colors.white,
                            overlayColor: Colors.white12,
                          ),
                          child: Slider(
                            value:
                                total > 0 ? current.clamp(0.0, total) : 0,
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
                          padding:
                              const EdgeInsets.symmetric(horizontal: 4),
                          child: Row(
                            mainAxisAlignment:
                                MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _fmt(Duration(
                                    milliseconds: current.toInt())),
                                style: const TextStyle(
                                    color: Color(0xFF888888),
                                    fontSize: 12,
                                    fontFamily: 'monospace'),
                              ),
                              Text(
                                _fmt(dur),
                                style: const TextStyle(
                                    color: Color(0xFF888888),
                                    fontSize: 12,
                                    fontFamily: 'monospace'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 12),

                // ── Controls ─────────────────────────────────────────────
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
                          final loading =
                              snap.data?.processingState ==
                                      ProcessingState.loading ||
                                  snap.data?.processingState ==
                                      ProcessingState.buffering;

                          return GestureDetector(
                            onTap: () => playing
                                ? audio.pause()
                                : audio.resume(),
                            child: Container(
                              width: 72,
                              height: 72,
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                              child: loading
                                  ? const Padding(
                                      padding: EdgeInsets.all(20),
                                      child: CircularProgressIndicator(
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

                const SizedBox(height: 20),
              ],
            ),
          );
        },
      ),
    );
  }
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
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(
            icon,
            size: size,
            color: active ? Colors.white : Colors.white38,
          ),
          if (active)
            Positioned(
              bottom: -6,
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
    );
  }
}

class _ArtPlaceholder extends StatelessWidget {
  final String title;
  const _ArtPlaceholder({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF111111),
      child: Center(
        child: Text(
          title.isNotEmpty ? title[0].toUpperCase() : '?',
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
