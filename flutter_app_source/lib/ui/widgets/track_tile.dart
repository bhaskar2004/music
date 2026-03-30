import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/track.dart';
import '../../services/audio_service.dart';
import '../../services/database_service.dart';
import '../../services/download_service.dart';

class TrackTile extends StatefulWidget {
  final Track track;
  final VoidCallback? onDelete;
  final VoidCallback? onFavoriteToggle;

  const TrackTile({
    super.key,
    required this.track,
    this.onDelete,
    this.onFavoriteToggle,
  });

  @override
  State<TrackTile> createState() => _TrackTileState();
}

class _TrackTileState extends State<TrackTile> {
  bool _isDownloaded = false;
  bool _isDownloading = false;
  double _downloadProgress = 0;

  @override
  void initState() {
    super.initState();
    _checkDownloadStatus();
  }

  /// Uses the single shared path helper — consistent with AudioService.
  Future<void> _checkDownloadStatus() async {
    final path = await DownloadService.getLocalFilePath(widget.track);
    if (mounted) setState(() => _isDownloaded = path != null);
  }

  Future<void> _handleDownload(BuildContext context) async {
    if (_isDownloading) return;

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Downloading "${widget.track.title}"…'),
        duration: const Duration(seconds: 2),
        backgroundColor: const Color(0xFF1E1E1E),
      ),
    );

    try {
      await DownloadService.downloadTrackToDevice(
        widget.track,
        onProgress: (p) {
          if (mounted) setState(() => _downloadProgress = p);
        },
      );

      await _checkDownloadStatus();

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Download complete!'),
            backgroundColor: Color(0xFF06C167),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: ${e.toString().split('\n').first}'),
            backgroundColor: Colors.redAccent,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final audioService = Provider.of<AudioService>(context, listen: false);

    return InkWell(
      onTap: () => audioService.playTrack(widget.track),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF121212),
          border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // ── Cover art ──────────────────────────────────────────────────
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFF282828),
                borderRadius: BorderRadius.circular(8),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: widget.track.coverUrl != null
                    ? CachedNetworkImage(
                        imageUrl: widget.track.coverUrl!,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) =>
                            const Icon(Icons.music_note, color: Colors.white24),
                      )
                    : const Icon(Icons.music_note, color: Colors.white24),
              ),
            ),

            const SizedBox(width: 16),

            // ── Track info ─────────────────────────────────────────────────
            Expanded(
              child: ValueListenableBuilder<Track?>(
                valueListenable: audioService.currentTrack,
                builder: (context, currentTrack, _) {
                  final isPlaying = currentTrack?.id == widget.track.id;
                  
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.track.title,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: isPlaying ? const Color(0xFF06C167) : Colors.white,
                          letterSpacing: -0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          if (isPlaying)
                            const Padding(
                              padding: EdgeInsets.only(right: 6),
                              child: Icon(Icons.equalizer_rounded,
                                  size: 14, color: Color(0xFF06C167)),
                            )
                          else if (_isDownloaded)
                            const Padding(
                              padding: EdgeInsets.only(right: 6),
                              child: Icon(Icons.check_circle,
                                  size: 14, color: Color(0xFF06C167)),
                            ),
                          Expanded(
                            child: Text(
                              widget.track.artist,
                              style: TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 13,
                                color: Colors.white.withValues(alpha: 0.6),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                  // Download progress bar
                  if (_isDownloading) ...[
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: _downloadProgress > 0 ? _downloadProgress : null,
                        backgroundColor: Colors.white10,
                        valueColor: const AlwaysStoppedAnimation(Color(0xFF06C167)),
                        minHeight: 3,
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
        ),

        // ── Favorite toggle ────────────────────────────────────────────
            IconButton(
              icon: Icon(
                widget.track.isFavorite ? Icons.favorite : Icons.favorite_border,
                color: widget.track.isFavorite
                    ? const Color(0xFF06C167)
                    : Colors.white24,
                size: 20,
              ),
              onPressed: () async {
                await DatabaseService().toggleFavorite(widget.track);
                widget.onFavoriteToggle?.call();
              },
            ),

            // ── Download / play action ─────────────────────────────────────
            if (_isDownloading)
              Padding(
                padding: const EdgeInsets.all(12),
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    value: _downloadProgress > 0 ? _downloadProgress : null,
                    strokeWidth: 2,
                    color: const Color(0xFF06C167),
                  ),
                ),
              )
            else
              IconButton(
                icon: Icon(
                  _isDownloaded
                      ? Icons.play_arrow_rounded
                      : Icons.download_for_offline_rounded,
                  color: _isDownloaded
                      ? const Color(0xFF06C167)
                      : Colors.white24,
                  size: 28,
                ),
                onPressed: () async {
                  if (_isDownloaded) {
                    await audioService.playTrack(widget.track);
                  } else {
                    await _handleDownload(context);
                  }
                },
              ),
          ],
        ),
      ),
    );
  }
}