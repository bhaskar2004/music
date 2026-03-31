import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/track.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../../services/download_service.dart';


class TrackTile extends StatefulWidget {
  final Track track;
  final int index;

  const TrackTile({super.key, required this.track, required this.index});

  @override
  State<TrackTile> createState() => _TrackTileState();
}

class _TrackTileState extends State<TrackTile> {
  static const _accent = Color(0xFF06C167);
  static const _bgColors = [
    Color(0xFF000000),
    Color(0xFF0A0A0A),
    Color(0xFF111111),
    Color(0xFF0D0D0D),
  ];

  bool _isDownloaded = false;

  @override
  void initState() {
    super.initState();
    _checkLocal();
  }

  Future<void> _checkLocal() async {
    final p = await DownloadService.getLocalFilePath(widget.track);
    if (mounted) setState(() => _isDownloaded = p != null);
  }

  void _onTap(BuildContext context) {
    final appState = context.read<AppState>();
    if (appState.isSelectionMode) {
      appState.toggleTrackSelection(widget.track.id);
      return;
    }
    final audio = context.read<AudioService>();
    final library = appState.filteredTracks;
    audio.playAll(library, startIndex: library.indexOf(widget.track));
  }

  void _showContextMenu(BuildContext context) {
    final appState = context.read<AppState>();
    final audio = context.read<AudioService>();
    final track = widget.track;
    final playlists = appState.playlists;
    final isFav = track.isFavorite;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => ChangeNotifierProvider.value(
        value: appState,
        child: _TrackMenu(
          track: track,
          playlists: playlists,
          isFavorite: isFav,
          isDownloaded: _isDownloaded,
          onPlayNext: () {
            audio.playNextTrack(track);
            Navigator.pop(context);
          },
          onAddToQueue: () {
            audio.addToQueue(track);
            Navigator.pop(context);
          },
          onToggleFavorite: () {
            appState.toggleFavorite(track.id);
            Navigator.pop(context);
          },
          onMoveToPlaylist: (pid) {
            appState.moveTrackToPlaylist(track.id, pid);
            Navigator.pop(context);
          },
          onRemoveFromPlaylist: () {
            appState.moveTrackToPlaylist(track.id, null);
            Navigator.pop(context);
          },
          onDelete: () async {
            Navigator.pop(context);
            // Stop if playing
            if (audio.currentTrack.value?.id == track.id) {
              audio.pause();
            }
            // Delete file
            final dir = await DownloadService.getSaveDirectory();
            final file = File('${dir.path}/${track.filename}');
            if (await file.exists()) await file.delete();
            await appState.removeTrack(track.id);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final audio = Provider.of<AudioService>(context, listen: false);
    final isSelected = appState.selectedIds.contains(widget.track.id);
    final isSelectionMode = appState.isSelectionMode;
    final bg = _bgColors[widget.index % _bgColors.length];

    return ValueListenableBuilder<Track?>(
      valueListenable: audio.currentTrack,
      builder: (ctx, currentTrack, _) {
        final isPlaying = currentTrack?.id == widget.track.id;

        return GestureDetector(
          onTap: () => _onTap(context),
          onLongPress: () {
            if (!isSelectionMode) {
              appState.setSelectionMode(true);
              appState.toggleTrackSelection(widget.track.id);
            }
          },
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF0A0A0A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isPlaying
                    ? _accent.withValues(alpha: 0.5)
                    : isSelected
                        ? _accent.withValues(alpha: 0.6)
                        : const Color(0xFF1E1E1E),
              ),
              boxShadow: isPlaying
                  ? [
                      BoxShadow(
                          color: _accent.withValues(alpha: 0.15),
                          blurRadius: 12)
                    ]
                  : null,
            ),
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Cover art
                Expanded(
                  child: Stack(
                    children: [
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: bg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: widget.track.coverUrl != null
                              ? CachedNetworkImage(
                                  imageUrl: widget.track.coverUrl!,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => _Placeholder(
                                      title: widget.track.title),
                                )
                              : _Placeholder(title: widget.track.title),
                        ),
                      ),

                      // Play overlay / EQ animation
                      if (isPlaying || isSelectionMode)
                        Positioned.fill(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.45),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: isSelectionMode
                                  ? _SelectionCheckbox(selected: isSelected)
                                  : isPlaying
                                      ? const _EqIndicator()
                                      : null,
                            ),
                          ),
                        ),

                      // Favorite badge
                      if (widget.track.isFavorite)
                        Positioned(
                          top: 6,
                          left: 6,
                          child: Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Icon(Icons.favorite_rounded,
                                size: 12, color: _accent),
                          ),
                        ),

                      // Playing dot
                      if (isPlaying)
                        Positioned(
                          top: 6,
                          right: 6,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: _accent,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),

                      // Context menu button
                      if (!isSelectionMode)
                        Positioned(
                          top: 4,
                          right: 4,
                          child: GestureDetector(
                            onTap: () => _showContextMenu(context),
                            child: Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                    color: Colors.white.withValues(
                                        alpha: 0.1)),
                              ),
                              child: const Icon(Icons.more_horiz_rounded,
                                  size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 10),

                // Title
                Text(
                  widget.track.title,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: isPlaying ? _accent : Colors.white,
                    letterSpacing: -0.2,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),

                // Artist
                Text(
                  widget.track.artist,
                  style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF888888),
                      fontWeight: FontWeight.w500),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),

                const SizedBox(height: 6),

                // Duration row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _formatDuration(widget.track.duration),
                      style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF555555),
                          fontFamily: 'monospace'),
                    ),
                    if (_isDownloaded)
                      const Icon(Icons.check_circle,
                          size: 12, color: _accent)
                    else
                      const Icon(Icons.cloud_download_outlined,
                          size: 12, color: Color(0xFF444444)),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}

// ─── Sub-widgets ──────────────────────────────────────────────────────────────

class _Placeholder extends StatelessWidget {
  final String title;
  const _Placeholder({required this.title});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        color: const Color(0xFF0A0A0A),
        child: Center(
          child: Text(
            title.isNotEmpty
                ? title[0].toUpperCase()
                : '?',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: Colors.white.withValues(alpha: 0.1),
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectionCheckbox extends StatelessWidget {
  final bool selected;
  const _SelectionCheckbox({required this.selected});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: selected
            ? const Color(0xFF06C167)
            : Colors.black.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: selected
              ? const Color(0xFF06C167)
              : Colors.white70,
          width: 2,
        ),
      ),
      child: selected
          ? const Icon(Icons.check_rounded,
              size: 16, color: Colors.black)
          : null,
    );
  }
}

class _EqIndicator extends StatefulWidget {
  const _EqIndicator();

  @override
  State<_EqIndicator> createState() => _EqIndicatorState();
}

class _EqIndicatorState extends State<_EqIndicator>
    with TickerProviderStateMixin {
  late final List<AnimationController> _controllers;
  late final List<Animation<double>> _animations;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      3,
      (i) => AnimationController(
        vsync: this,
        duration: Duration(milliseconds: 600 + i * 150),
      )..repeat(reverse: true),
    );
    _animations = _controllers
        .map((c) => Tween(begin: 0.2, end: 1.0).animate(c))
        .toList();
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(3, (i) {
        return AnimatedBuilder(
          animation: _animations[i],
          builder: (_, __) => Container(
            width: 3,
            height: 14 * _animations[i].value,
            margin: const EdgeInsets.symmetric(horizontal: 1.5),
            decoration: BoxDecoration(
              color: const Color(0xFF06C167),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        );
      }),
    );
  }
}

// ─── Context menu ─────────────────────────────────────────────────────────────

class _TrackMenu extends StatelessWidget {
  final Track track;
  final List playlists;
  final bool isFavorite;
  final bool isDownloaded;
  final VoidCallback onPlayNext;
  final VoidCallback onAddToQueue;
  final VoidCallback onToggleFavorite;
  final void Function(String) onMoveToPlaylist;
  final VoidCallback onRemoveFromPlaylist;
  final VoidCallback onDelete;

  const _TrackMenu({
    required this.track,
    required this.playlists,
    required this.isFavorite,
    required this.isDownloaded,
    required this.onPlayNext,
    required this.onAddToQueue,
    required this.onToggleFavorite,
    required this.onMoveToPlaylist,
    required this.onRemoveFromPlaylist,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF111111),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          const SizedBox(height: 12),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFF404040),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(height: 16),

          // Track info header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                if (track.coverUrl != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: CachedNetworkImage(
                      imageUrl: track.coverUrl!,
                      width: 44,
                      height: 44,
                      fit: BoxFit.cover,
                    ),
                  )
                else
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E1E1E),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(Icons.music_note,
                        color: Colors.white24, size: 20),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(track.title,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      Text(track.artist,
                          style: const TextStyle(
                              color: Color(0xFF888888), fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),
          const Divider(color: Color(0xFF1E1E1E), height: 1),

          // Queue section
          _MenuSection(label: 'QUEUE'),
          _MenuItem(
            icon: Icons.skip_next_rounded,
            label: 'Play Next',
            onTap: onPlayNext,
          ),
          _MenuItem(
            icon: Icons.queue_music_rounded,
            label: 'Add to Queue',
            onTap: onAddToQueue,
          ),

          const Divider(color: Color(0xFF1E1E1E), height: 1),

          // Playlists section
          if (playlists.isNotEmpty) ...[
            _MenuSection(label: 'MOVE TO PLAYLIST'),
            ...playlists.map((p) => _MenuItem(
                  icon: Icons.folder_rounded,
                  label: p.name,
                  isActive: track.playlistId == p.id,
                  onTap: () => onMoveToPlaylist(p.id),
                )),
            if (track.playlistId != null)
              _MenuItem(
                icon: Icons.folder_off_rounded,
                label: 'Remove from Playlist',
                onTap: onRemoveFromPlaylist,
              ),
            const Divider(color: Color(0xFF1E1E1E), height: 1),
          ],

          // Favorite
          _MenuItem(
            icon: isFavorite
                ? Icons.favorite_rounded
                : Icons.favorite_border_rounded,
            label:
                isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
            isActive: isFavorite,
            activeColor: const Color(0xFF06C167),
            onTap: onToggleFavorite,
          ),

          // Source URL
          if (track.sourceUrl.isNotEmpty)
            _MenuItem(
              icon: Icons.open_in_new_rounded,
              label: 'View Source',
              onTap: () {
                Navigator.pop(context);
                // In a real app, launch URL
              },
            ),

          const Divider(color: Color(0xFF1E1E1E), height: 1),

          _MenuItem(
            icon: Icons.delete_outline_rounded,
            label: 'Remove from Library',
            isDanger: true,
            onTap: onDelete,
          ),
        ],
      ),
    );
  }
}

class _MenuSection extends StatelessWidget {
  final String label;
  const _MenuSection({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
      child: Text(
        label,
        style: const TextStyle(
            color: Color(0xFF555555),
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDanger;
  final bool isActive;
  final Color activeColor;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.label,
    this.isDanger = false,
    this.isActive = false,
    this.activeColor = const Color(0xFF06C167),
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDanger
        ? const Color(0xFFE53E3E)
        : isActive
            ? activeColor
            : Colors.white70;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        child: Row(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 14),
            Text(label,
                style: TextStyle(
                    color: color,
                    fontSize: 14,
                    fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}
