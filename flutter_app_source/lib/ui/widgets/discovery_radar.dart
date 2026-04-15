import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../../services/download_manager.dart';
import '../../models/track.dart';
import '../../models/download_job.dart';

class DiscoveryRadar extends StatelessWidget {
  const DiscoveryRadar({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = appState.currentAccentColor;

    return DraggableScrollableSheet(
      initialChildSize: 0.1,
      minChildSize: 0.08,
      maxChildSize: 0.7,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1A1A).withOpacity(0.8) : Colors.white.withOpacity(0.8),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            boxShadow: [
              BoxShadow(
                color: accentColor.withOpacity(0.15),
                blurRadius: 40,
                spreadRadius: -10,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                children: [
                   // Handle
                   Center(
                     child: Container(
                       width: 40, height: 4,
                       decoration: BoxDecoration(
                         color: accentColor.withOpacity(0.3),
                         borderRadius: BorderRadius.circular(2),
                       ),
                     ),
                   ),
                   const SizedBox(height: 12),
                   
                   Row(
                     children: [
                       Icon(Icons.radar_rounded, color: accentColor, size: 24),
                       const SizedBox(width: 12),
                       Text(
                         'DISCOVERY RADAR',
                         style: GoogleFonts.inter(
                           fontSize: 14,
                           fontWeight: FontWeight.w800,
                           letterSpacing: 1.5,
                           color: accentColor,
                         ),
                       ),
                     ],
                   ),
                   const SizedBox(height: 24),
                   
                   if (appState.isLoadingRecommendations)
                     const Center(
                       child: Padding(
                         padding: EdgeInsets.all(40.0),
                         child: CircularProgressIndicator(strokeWidth: 2),
                       ),
                     )
                   else if (appState.recommendedTracks.isEmpty)
                     Center(
                       child: Padding(
                         padding: const EdgeInsets.all(40.0),
                         child: Text(
                           'Tap a song to start scanning...',
                           style: GoogleFonts.inter(color: isDark ? Colors.white24 : Colors.black26, fontSize: 13),
                         ),
                       ),
                     )
                   else
                     ...appState.recommendedTracks.map((track) => _DiscoveryTile(track: track)),

                   const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _DiscoveryTile extends StatelessWidget {
  final Track track;
  const _DiscoveryTile({required this.track});

  @override
  Widget build(BuildContext context) {
    final audio = context.read<AudioService>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final appState = context.read<AppState>();
    final isDownloaded = appState.library.any((t) => t.sourceUrl == track.sourceUrl);
    final isDownloading = appState.downloads.any((d) => d.url == track.sourceUrl && d.status != DownloadStatus.done && d.status != DownloadStatus.error);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () => audio.playTrack(track),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withOpacity(0.04) : Colors.black.withOpacity(0.04),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: track.coverUrl != null
                  ? CachedNetworkImage(
                      imageUrl: track.coverUrl!,
                      width: 48, height: 48, fit: BoxFit.cover,
                    )
                  : Container(width: 48, height: 48, color: Colors.black12),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      track.title,
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w700, 
                        fontSize: 14,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      track.artist,
                      style: GoogleFonts.inter(
                        color: isDark ? Colors.white38 : Colors.black38, 
                        fontSize: 11
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  isDownloaded ? Icons.check_circle_rounded : (isDownloading ? Icons.hourglass_top_rounded : Icons.add_rounded),
                  size: 24, 
                  color: isDownloaded ? Colors.green : (isDark ? Colors.white70 : Colors.black54)
                ),
                onPressed: () {
                  if (!isDownloaded && !isDownloading) {
                    DownloadManager().processJob(track.sourceUrl, appState);
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
