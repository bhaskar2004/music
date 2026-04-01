import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/track.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';

class QueueView extends StatelessWidget {
  const QueueView({super.key});

  String _formatDuration(int s) {
    final m = s ~/ 60;
    final sec = s % 60;
    return '$m:${sec.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final audio = context.read<AudioService>();
    final appState = context.read<AppState>();

    return Scaffold(
      body: SafeArea(
        child: ValueListenableBuilder<List<Track>>(
          valueListenable: audio.queueNotifier,
          builder: (ctx, queue, _) {
            final totalSec =
                queue.fold<int>(0, (sum, t) => sum + t.duration);

            return CustomScrollView(
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ShaderMask(
                              shaderCallback: (b) =>
                                  const LinearGradient(colors: [
                                Color(0xFF06C167),
                                Color(0xFF00FF85)
                              ]).createShader(b),
                              child: const Text('Queue',
                                  style: TextStyle(
                                      fontSize: 32,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -1.5)),
                            ),
                            Text(
                              '${queue.length} tracks · ${_formatDuration(totalSec)}',
                              style: const TextStyle(
                                  color: Color(0xFF888888),
                                  fontSize: 13,
                                  fontFamily: 'monospace'),
                            ),
                          ],
                        ),
                        if (queue.isNotEmpty)
                          GestureDetector(
                            onTap: () {
                              audio.pause();
                              audio.queueNotifier.value = [];
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 7),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE53E3E)
                                    .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                    color: const Color(0xFFE53E3E)
                                        .withValues(alpha: 0.2)),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.delete_outline_rounded,
                                      color: Color(0xFFE53E3E), size: 14),
                                  SizedBox(width: 5),
                                  Text('Clear Queue',
                                      style: TextStyle(
                                          color: Color(0xFFE53E3E),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

                if (queue.isEmpty)
                  SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.queue_music_rounded,
                              color: Color(0xFF333333), size: 48),
                          const SizedBox(height: 16),
                          const Text('No tracks in queue',
                              style: TextStyle(
                                  color: Color(0xFF888888), fontSize: 15)),
                          const SizedBox(height: 16),
                          if (appState.library.isNotEmpty)
                            GestureDetector(
                              onTap: () =>
                                  audio.playAll(appState.library),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 20, vertical: 10),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(colors: [
                                    Color(0xFF06C167),
                                    Color(0xFF00FF85)
                                  ]),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.play_arrow_rounded,
                                        color: Colors.black, size: 18),
                                    SizedBox(width: 6),
                                    Text('Play All from Library',
                                        style: TextStyle(
                                            color: Colors.black,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 13)),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  )
                else ...[
                  // Now playing
                  ValueListenableBuilder<Track?>(
                    valueListenable: audio.currentTrack,
                    builder: (ctx, current, _) {
                      if (current == null) return const SliverToBoxAdapter();
                      return SliverToBoxAdapter(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding:
                                  EdgeInsets.fromLTRB(20, 20, 20, 8),
                              child: Text('NOW PLAYING',
                                  style: TextStyle(
                                      color: Color(0xFF06C167),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 1.0,
                                      fontFamily: 'monospace')),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16),
                              child: _QueueRow(
                                  track: current,
                                  isActive: true,
                                  onPlay: null),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  // Up next
                  ValueListenableBuilder<Track?>(
                    valueListenable: audio.currentTrack,
                    builder: (ctx, current, _) {
                      final currentIdx =
                          queue.indexWhere((t) => t.id == current?.id);
                      final upNext = currentIdx >= 0
                          ? queue.sublist(currentIdx + 1)
                          : queue;

                      if (upNext.isEmpty) {
                        return const SliverToBoxAdapter();
                      }

                      return SliverMainAxisGroup(slivers: [
                        SliverToBoxAdapter(
                          child: Padding(
                            padding:
                                const EdgeInsets.fromLTRB(20, 20, 20, 8),
                            child: Text(
                              'UP NEXT — ${upNext.length} TRACKS',
                              style: const TextStyle(
                                  color: Color(0xFF888888),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.0,
                                  fontFamily: 'monospace'),
                            ),
                          ),
                        ),
                        SliverPadding(
                          padding:
                              const EdgeInsets.fromLTRB(16, 0, 16, 120),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (ctx2, i) => _QueueRow(
                                track: upNext[i],
                                isActive: false,
                                onPlay: () {
                                  audio.playAll(queue,
                                      startIndex:
                                          queue.indexOf(upNext[i]));
                                },
                              ),
                              childCount: upNext.length,
                            ),
                          ),
                        ),
                      ]);
                    },
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _QueueRow extends StatelessWidget {
  final Track track;
  final bool isActive;
  final VoidCallback? onPlay;

  const _QueueRow(
      {required this.track, required this.isActive, this.onPlay});

  String _fmt(int s) {
    final m = s ~/ 60;
    final sec = s % 60;
    return '$m:${sec.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPlay,
      child: Container(
        margin: const EdgeInsets.only(bottom: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isActive
              ? const Color(0xFF06C167).withValues(alpha: 0.05)
              : const Color(0xFF0A0A0A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive
                ? const Color(0xFF06C167).withValues(alpha: 0.2)
                : const Color(0xFF1E1E1E),
          ),
        ),
        child: Row(
          children: [
            // Thumbnail
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                  color: const Color(0xFF1E1E1E),
                  borderRadius: BorderRadius.circular(6)),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: track.coverUrl != null
                    ? (track.coverUrl!.startsWith('http')
                        ? CachedNetworkImage(
                            imageUrl: track.coverUrl!,
                            fit: BoxFit.cover)
                        : Image.file(
                            File(track.coverUrl!),
                            fit: BoxFit.cover,
                          ))
                    : const Icon(Icons.music_note,
                        color: Colors.white24, size: 20),
              ),
            ),
            const SizedBox(width: 12),

            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    track.title,
                    style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: isActive
                            ? const Color(0xFF06C167)
                            : Colors.white),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(track.artist,
                      style: const TextStyle(
                          color: Color(0xFF888888), fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),

            const SizedBox(width: 8),
            Text(_fmt(track.duration),
                style: const TextStyle(
                    color: Color(0xFF888888),
                    fontSize: 12,
                    fontFamily: 'monospace')),

            if (isActive) ...[
              const SizedBox(width: 10),
              const _EqDots(),
            ],
          ],
        ),
      ),
    );
  }
}

class _EqDots extends StatelessWidget {
  const _EqDots();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [1.0, 0.6, 0.9].map((h) {
        return Container(
          width: 3,
          height: 12 * h,
          margin: const EdgeInsets.symmetric(horizontal: 1),
          decoration: BoxDecoration(
            color: const Color(0xFF06C167),
            borderRadius: BorderRadius.circular(99),
          ),
        );
      }).toList(),
    );
  }
}
