import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:path_provider/path_provider.dart';
import '../../models/track.dart';
import '../../services/audio_service.dart';
import '../../services/database_service.dart';
import '../../services/download_service.dart';

class TrackTile extends StatefulWidget {
  final Track track;
  final VoidCallback? onDelete;
  final VoidCallback? onFavoriteToggle;

  const TrackTile({
    Key? key,
    required this.track,
    this.onDelete,
    this.onFavoriteToggle,
  }) : super(key: key);

  @override
  State<TrackTile> createState() => _TrackTileState();
}

class _TrackTileState extends State<TrackTile> {
  bool _isDownloaded = false;

  @override
  void initState() {
    super.initState();
    _checkDownloadStatus();
  }

  Future<void> _checkDownloadStatus() async {
    String localPath = "";
    if (Platform.isAndroid) {
      localPath = "/storage/emulated/0/Music/Wavelength/${widget.track.filename}";
    } else {
      final docs = await getApplicationDocumentsDirectory();
      localPath = "${docs.path}/Wavelength/${widget.track.filename}";
    }
    final exists = await File(localPath).exists();
    if (mounted) setState(() => _isDownloaded = exists);
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
          border: Border.all(color: Colors.white.withOpacity(0.05)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // Cover Art
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
                        errorWidget: (context, url, error) => const Icon(Icons.music_note, color: Colors.white24),
                      )
                    : const Icon(Icons.music_note, color: Colors.white24),
              ),
            ),
            const SizedBox(width: 16),
            // Text Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.track.title,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (_isDownloaded)
                        const Padding(
                          padding: EdgeInsets.only(right: 6),
                          child: Icon(Icons.check_circle, size: 14, color: Color(0xFF06C167)),
                        ),
                      Expanded(
                        child: Text(
                          widget.track.artist,
                          style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13, color: Colors.white.withOpacity(0.6)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Favorite Button
            IconButton(
              icon: Icon(
                widget.track.isFavorite ? Icons.favorite : Icons.favorite_border,
                color: widget.track.isFavorite ? const Color(0xFF06C167) : Colors.white24,
                size: 20,
              ),
              onPressed: () async {
                await DatabaseService().toggleFavorite(widget.track);
                if (widget.onFavoriteToggle != null) widget.onFavoriteToggle!();
              },
            ),
            // Download/Play Actions
            IconButton(
              icon: Icon(
                _isDownloaded ? Icons.play_arrow_rounded : Icons.download_for_offline_rounded,
                color: _isDownloaded ? const Color(0xFF06C167) : Colors.white24,
                size: 28,
              ),
              onPressed: () async {
                if (!_isDownloaded) {
                  try {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Starting download: ${widget.track.title}'), duration: const Duration(seconds: 2)),
                    );
                    await DownloadService.downloadTrackToDevice(widget.track);
                    await _checkDownloadStatus();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Download complete!'), backgroundColor: Color(0xFF06C167)),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Download failed: ${e.toString().split('\n')[0]}'), backgroundColor: Colors.redAccent),
                      );
                    }
                  }
                } else {
                  audioService.playTrack(widget.track);
                }
              },
            )
          ],
        ),
      ),
    );
  }
}
