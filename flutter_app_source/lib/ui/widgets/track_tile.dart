import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:just_audio/just_audio.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/track.dart';

import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../../services/download_service.dart';
import '../../services/download_manager.dart';


class TrackTile extends StatefulWidget {
  final Track track;
  final List<Track>? tracks;
  final bool isSelected;
  final bool isSelectionMode;
  final VoidCallback? onToggleSelection;
  final VoidCallback? onLongPressSelection;

  const TrackTile({
    super.key,
    required this.track,
    this.tracks,
    this.isSelected = false,
    this.isSelectionMode = false,
    this.onToggleSelection,
    this.onLongPressSelection,
  });



  @override
  State<TrackTile> createState() => _TrackTileState();
}

class _TrackTileState extends State<TrackTile> {
  Widget _buildImage(String url) {
    if (url.startsWith('http')) {
      return CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.cover,
        height: double.infinity,
        width: double.infinity,
        errorWidget: (context, url, error) => const Center(
          child: Icon(Icons.broken_image_rounded, color: Colors.white24),
        ),
      );
    } else {
      final file = File(url);
      if (file.existsSync()) {
        return Image.file(
          file,
          fit: BoxFit.cover,
          height: double.infinity,
          width: double.infinity,
        );
      }
      return const Center(
        child: Icon(Icons.broken_image_rounded, color: Colors.white24),
      );
    }
  }

  bool _isPlaying = false;
  bool _isDownloaded = false;

  @override
  void initState() {
    super.initState();
    _checkDownloadStatus();
  }

  Future<void> _checkDownloadStatus() async {
    final appState = context.read<AppState>();
    final inLibrary = appState.library.any((t) => t.sourceUrl == widget.track.sourceUrl);
    if (inLibrary) {
      if (mounted) setState(() => _isDownloaded = true);
      return;
    }
    final exists = await DownloadService.isDownloaded(widget.track);
    if (mounted) setState(() => _isDownloaded = exists);
  }

  void _handleTap() {
    final appState = context.read<AppState>();
    if (widget.isSelectionMode) {
      if (widget.onToggleSelection != null) {
        widget.onToggleSelection!();
      } else {
        appState.toggleTrackSelection(widget.track.id);
      }
      return;
    }
    final audio = context.read<AudioService>();
    final library = widget.tracks ?? appState.filteredTracks; // Use custom list if provided
    audio.playAll(library, startIndex: library.indexOf(widget.track));
  }

  void _showMenu() {
    final appState = context.read<AppState>();
    final audio = context.read<AudioService>();
    final playlists = appState.playlists;
    final track = widget.track;
    final isFav = appState.favorites.contains(track.id);

    final canStream = _isDownloaded || (appState.config.serverUrl?.isNotEmpty ?? false);
    
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _TrackMenu(
        track: track,
        playlists: playlists,
        isFavorite: isFav,
        isDownloaded: _isDownloaded,
        canStream: canStream,
        onDownload: () {
          Navigator.pop(context);
          DownloadManager().processJob(track.sourceUrl, appState);
          appState.setActiveView(ActiveView.downloads);
        },
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
        onTogglePlaylist: (pid) {
          appState.toggleTrackInPlaylist(track.id, pid);
        },
        onDelete: () async {
          Navigator.pop(context);
          if (audio.currentTrack.value?.id == track.id) {
            audio.pause();
          }
          final dir = await DownloadService.getSaveDirectory();
          final file = File('${dir.path}/${track.filename}');
          if (await file.exists()) await file.delete();
          appState.removeTrack(track.id);
          setState(() => _isDownloaded = false);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Use context.read (not watch!) since AudioService is NOT a ChangeNotifier.
    // Reactivity comes from ValueListenableBuilder below.
    final audio = context.read<AudioService>();

    return ValueListenableBuilder<Track?>(
      valueListenable: audio.currentTrack,
      builder: (ctx, currentTrack, _) {
        _isPlaying = currentTrack?.id == widget.track.id;
        final isBuffering = _isPlaying && (audio.player.processingState == ProcessingState.buffering || audio.player.processingState == ProcessingState.loading);

        return GestureDetector(
          onLongPress: () {
            if (widget.onLongPressSelection != null) {
              widget.onLongPressSelection!();
            } else {
              context.read<AppState>().setSelectionMode(true);
            }
          },
          onTap: _handleTap,
          child: Container(
            decoration: BoxDecoration(
              color: widget.isSelected
                  ? const Color(0xFF06C167).withValues(alpha: 0.1)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: widget.isSelected
                    ? const Color(0xFF06C167).withValues(alpha: 0.3)
                    : _isPlaying
                        ? const Color(0xFF06C167).withValues(alpha: 0.15)
                        : Colors.transparent,
              ),
            ),
            child: Column(
              children: [
                Expanded(
                  child: Stack(
                    children: [
                      // Cover
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF121212),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            if (_isPlaying)
                              BoxShadow(
                                color: const Color(0xFF06C167).withValues(alpha: 0.2),
                                blurRadius: 15,
                                spreadRadius: 2,
                              ),
                          ],
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: widget.track.coverUrl != null
                            ? _buildImage(widget.track.coverUrl!)
                            : Center(
                                child: Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF1E1E1E),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.music_note_rounded,
                                      color: Color(0xFF333333), size: 28),
                                ),
                              ),
                      ),

                      // Selection Checkbox
                      if (widget.isSelectionMode)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white24),
                            ),
                            child: Icon(
                              widget.isSelected
                                  ? Icons.check_circle_rounded
                                  : Icons.circle_outlined,
                              color: widget.isSelected
                                  ? const Color(0xFF06C167)
                                  : Colors.white70,
                              size: 24,
                            ),
                          ),
                        ),

                      // Play Overlay / EQ
                      if (_isPlaying)
                        Positioned.fill(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.45),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Center(
                              child: isBuffering 
                                ? const SizedBox(
                                    width: 24, 
                                    height: 24, 
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF06C167))
                                  )
                                : const _EqualizerAnimation(),
                            ),
                          ),
                        ),

                      // Download Status Indicator (Bottom Right)
                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _isDownloaded
                                ? Icons.check_circle_rounded
                                : Icons.download_rounded,
                            color: const Color(0xFF06C167),
                            size: 14,
                          ),
                        ),
                      ),

                      // Menu Button
                      if (!widget.isSelectionMode)
                        Positioned(
                          top: 2,
                          right: 2,
                          child: IconButton(
                            icon: const Icon(Icons.more_vert,
                                color: Colors.white, size: 20),
                            onPressed: _showMenu,
                          ),
                        ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 8, 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.track.title,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          letterSpacing: -0.2,
                          color:
                              _isPlaying ? const Color(0xFF06C167) : Colors.white,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        widget.track.artist,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.45),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TrackMenu extends StatelessWidget {
  final Track track;
  final List playlists;
  final bool isFavorite;
  final bool isDownloaded;
  final bool canStream;
  final VoidCallback onDownload;
  final VoidCallback onPlayNext;
  final VoidCallback onAddToQueue;
  final VoidCallback onToggleFavorite;
  final void Function(String) onTogglePlaylist;
  final VoidCallback onDelete;

  const _TrackMenu({
    required this.track,
    required this.playlists,
    required this.isFavorite,
    required this.isDownloaded,
    required this.canStream,
    required this.onDownload,
    required this.onPlayNext,
    required this.onAddToQueue,
    required this.onToggleFavorite,
    required this.onTogglePlaylist,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF121212),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: track.coverUrl != null
                      ? CachedNetworkImage(
                          imageUrl: track.coverUrl!,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                        )
                      : Container(
                          width: 48,
                          height: 48,
                          color: const Color(0xFF1E1E1E),
                          child: const Icon(Icons.music_note, color: Colors.white24),
                        ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(track.title,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      Text(track.artist,
                          style: const TextStyle(color: Color(0xFF888888), fontSize: 14)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(color: Color(0xFF1E1E1E), height: 1),

          // Download / Already downloaded indicator
          if (!isDownloaded)
            _MenuItem(
              icon: Icons.download_rounded,
              label: 'Download to Device',
              isActive: true,
              activeColor: const Color(0xFF06C167),
              onTap: onDownload,
            )
          else
            _MenuItem(
              icon: Icons.check_circle_rounded,
              label: 'Downloaded',
              isActive: true,
              activeColor: const Color(0xFF06C167),
              onTap: () {},
            ),

          const Divider(color: Color(0xFF1E1E1E), height: 1),

          // Queue section — makes sense when downloaded OR when can stream from server
          if (canStream) ...[
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
          ],

          // Playlists section
          if (playlists.isNotEmpty) ...[
            _MenuSection(label: 'PLAYLISTS'),
            _MenuItem(
              icon: isFavorite ? Icons.favorite : Icons.favorite_border,
              label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
              isActive: isFavorite,
              onTap: onToggleFavorite,
            ),
            Theme(
              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                leading: const Icon(Icons.playlist_add, color: Colors.white70),
                title: const Text('Add to / Remove from Playlist',
                    style: TextStyle(color: Colors.white, fontSize: 14)),
                children: [
                  ...playlists.map((p) {
                    final isIn = track.playlistIds.contains(p.id);
                    return _MenuItem(
                      icon: isIn ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                      label: p.name,
                      onTap: () => onTogglePlaylist(p.id),
                      isActive: isIn,
                      activeColor: const Color(0xFF06C167),
                    );
                  }),
                ],
              ),
            ),
            const Divider(color: Color(0xFF1E1E1E), height: 1),
          ],

          // Dangerous section
          _MenuItem(
            icon: Icons.delete_outline,
            label: 'Delete from Device',
            danger: true,
            onTap: onDelete,
          ),
          const SizedBox(height: 20),
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
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF444444),
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;
  final bool isActive;
  final Color? activeColor;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
    this.isActive = false,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final color = danger
        ? const Color(0xFFE53E3E)
        : (isActive ? (activeColor ?? const Color(0xFF06C167)) : Colors.white);

    return ListTile(
      leading: Icon(icon, color: color.withValues(alpha: 0.7), size: 20),
      title: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 14,
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      onTap: onTap,
    );
  }
}

class _EqualizerAnimation extends StatefulWidget {
  const _EqualizerAnimation();

  @override
  State<_EqualizerAnimation> createState() => _EqualizerAnimationState();
}

class _EqualizerAnimationState extends State<_EqualizerAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 800))
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(4, (index) {
        return _Bar(index: index, controller: _controller);
      }),
    );
  }
}

class _Bar extends StatelessWidget {
  final int index;
  final AnimationController controller;

  const _Bar({required this.index, required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        final double h = (index == 0 || index == 3)
            ? 12 + 8 * (index == 0 ? controller.value : 1 - controller.value)
            : 8 + 16 * (index == 1 ? controller.value : 1 - controller.value);

        return Container(
          width: 3,
          height: h,
          margin: const EdgeInsets.symmetric(horizontal: 1.5),
          decoration: BoxDecoration(
            color: const Color(0xFF06C167),
            borderRadius: BorderRadius.circular(10),
          ),
        );
      },
    );
  }
}