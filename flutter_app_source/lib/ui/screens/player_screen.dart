import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:just_audio/just_audio.dart';
import '../../services/audio_service.dart';
import '../../models/track.dart';
import 'queue_view.dart';

class PlayerScreen extends StatelessWidget {
  const PlayerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final audioService = Provider.of<AudioService>(context);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.keyboard_arrow_down, size: 30),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {},
          ),
        ],
      ),
      body: ValueListenableBuilder<Track?>(
        valueListenable: audioService.currentTrack,
        builder: (context, track, child) {
          if (track == null) return const Center(child: Text("No track playing"));

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Artwork
                AspectRatio(
                  aspectRatio: 1,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.white.withValues(alpha: 0.6),
                          blurRadius: 30,
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: track.coverUrl != null
                          ? CachedNetworkImage(
                              imageUrl: track.coverUrl!,
                              fit: BoxFit.cover,
                            )
                          : const Icon(Icons.music_note, size: 100, color: Colors.white10),
                    ),
                  ),
                ),
                const SizedBox(height: 48),
                // Title and Artist
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            track.title,
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            track.artist,
                            style: TextStyle(fontSize: 18, color: Colors.white.withValues(alpha: 0.6)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.favorite_border, color: Colors.white54, size: 28),
                      onPressed: () {},
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                // Slider
                StreamBuilder<Duration>(
                  stream: audioService.player.positionStream,
                  builder: (context, snapshot) {
                    final position = snapshot.data ?? Duration.zero;
                    final duration = audioService.player.duration ?? Duration.zero;

                    return Column(
                      children: [
                        SliderTheme(
                          data: SliderTheme.of(context).copyWith(
                            trackHeight: 4,
                            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                            overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
                            activeTrackColor: const Color(0xFF06C167),
                            inactiveTrackColor: Colors.white10,
                            thumbColor: Colors.white,
                          ),
                          child: Slider(
                            value: position.inMilliseconds.toDouble(),
                            max: duration.inMilliseconds.toDouble() > 0 ? duration.inMilliseconds.toDouble() : 1.0,
                            onChanged: (value) {
                              audioService.player.seek(Duration(milliseconds: value.toInt()));
                            },
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(_formatDuration(position), style: const TextStyle(color: Colors.white38, fontSize: 12)),
                              Text(_formatDuration(duration), style: const TextStyle(color: Colors.white38, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 24),
                // Playback Controls
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    ValueListenableBuilder<bool>(
                      valueListenable: audioService.isShuffleModeEnabled,
                      builder: (context, isShuffle, _) {
                        return IconButton(
                          icon: Icon(Icons.shuffle, color: isShuffle ? const Color(0xFF06C167) : Colors.white24),
                          onPressed: () => audioService.toggleShuffle(),
                        );
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.skip_previous_rounded, size: 40, color: Colors.white),
                      onPressed: () => audioService.playPrevious(),
                    ),
                    // Play/Pause
                    StreamBuilder<PlayerState>(
                      stream: audioService.player.playerStateStream,
                      builder: (context, snapshot) {
                        final playing = snapshot.data?.playing ?? false;
                        return Container(
                          width: 80,
                          height: 80,
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          child: IconButton(
                            icon: Icon(
                              playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                              size: 48,
                              color: Colors.black,
                            ),
                            onPressed: () => playing ? audioService.pause() : audioService.resume(),
                          ),
                        );
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.skip_next_rounded, size: 40, color: Colors.white),
                      onPressed: () => audioService.playNext(),
                    ),
                    ValueListenableBuilder<LoopMode>(
                      valueListenable: audioService.loopModeNotifier,
                      builder: (context, mode, _) {
                        IconData iconData = Icons.repeat;
                        Color color = Colors.white24;
                        if (mode == LoopMode.all) {
                          color = const Color(0xFF06C167);
                        } else if (mode == LoopMode.one) {
                          iconData = Icons.repeat_one;
                          color = const Color(0xFF06C167);
                        }
                        return IconButton(
                          icon: Icon(iconData, color: color),
                          onPressed: () => audioService.toggleRepeat(),
                        );
                      },
                    ),
                  ],
                ),
                const Spacer(),
                // Bottom Actions
                Padding(
                  padding: const EdgeInsets.only(bottom: 48.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.devices_rounded, color: Colors.white54),
                        onPressed: () {},
                      ),
                      IconButton(
                        icon: const Icon(Icons.playlist_play_rounded, color: Colors.white54, size: 30),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const QueueView()),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return "$minutes:$seconds";
  }
}
