import 'dart:io';
import 'dart:ui';
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

class _PlayerScreenState extends State<PlayerScreen>
    with SingleTickerProviderStateMixin {
  static const _accent = Color(0xFF06C167);
  static const _accentLight = Color(0xFF00FF85);

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

                    // ── Artwork ──────────────────────────────────────────
                    Expanded(
                      flex: 5,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 36),
                          child: Container(
                            constraints: const BoxConstraints(
                                maxWidth: 340, maxHeight: 340),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: [
                                BoxShadow(
                                  color: _accent.withValues(alpha: 0.12),
                                  blurRadius: 60,
                                  spreadRadius: 10,
                                  offset: const Offset(0, 20),
                                ),
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.6),
                                  blurRadius: 30,
                                  offset: const Offset(0, 12),
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
    if (url.startsWith('http')) {
      return CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.cover,
        errorWidget: (_, __, ___) => isBackground ? const SizedBox.shrink() : _ArtPlaceholder(title: title),
      );
    } else {
      final file = File(url);
      if (file.existsSync()) {
        return Image.file(
          file,
          fit: BoxFit.cover,
        );
      }
      return isBackground ? const SizedBox.shrink() : _ArtPlaceholder(title: title);
    }
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
