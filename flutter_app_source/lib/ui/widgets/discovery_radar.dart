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
              filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                children: [
                   // Handle
                   Center(
                     child: Container(
                       width: 36, height: 4,
                       margin: const EdgeInsets.only(bottom: 20),
                       decoration: BoxDecoration(
                         color: accentColor.withValues(alpha: 0.2),
                         borderRadius: BorderRadius.circular(2),
                       ),
                     ),
                   ),
                   
                   Row(
                     children: [
                       _RadarIcon(color: accentColor, isScanning: appState.isLoadingRecommendations),
                       const SizedBox(width: 14),
                       Expanded(
                         child: Column(
                           crossAxisAlignment: CrossAxisAlignment.start,
                           children: [
                             Text(
                               'DISCOVERY RADAR',
                               style: GoogleFonts.outfit(
                                 fontSize: 14,
                                 fontWeight: FontWeight.w900,
                                 letterSpacing: 2.0,
                                 color: accentColor,
                               ),
                             ),
                             Text(
                               appState.isLoadingRecommendations ? 'Scanning frequencies...' : '${appState.recommendedTracks.length} matches found',
                               style: GoogleFonts.inter(
                                 fontSize: 10,
                                 fontWeight: FontWeight.w600,
                                 color: isDark ? Colors.white24 : Colors.black26,
                                 letterSpacing: 0.5,
                               ),
                             ),
                           ],
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
    final currentTrack = audio.currentTrack.value;
    final isCurrent = currentTrack?.id == track.id || currentTrack?.sourceUrl == track.sourceUrl;
    
    final isDownloaded = appState.library.any((t) => t.sourceUrl == track.sourceUrl);
    final isDownloading = appState.downloads.any((d) => d.url == track.sourceUrl && d.status != DownloadStatus.done && d.status != DownloadStatus.error);
    final accentColor = appState.currentAccentColor;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => audio.playTrack(track),
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isCurrent 
                  ? accentColor.withValues(alpha: 0.08) 
                  : (isDark ? Colors.white.withValues(alpha: 0.03) : Colors.black.withValues(alpha: 0.03)),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isCurrent 
                    ? accentColor.withValues(alpha: 0.2) 
                    : Colors.white.withValues(alpha: 0.05)
              ),
            ),
            child: Row(
              children: [
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: track.coverUrl != null
                        ? CachedNetworkImage(
                            imageUrl: track.coverUrl!,
                            width: 52, height: 52, fit: BoxFit.cover,
                          )
                        : Container(width: 52, height: 52, color: Colors.black12),
                    ),
                    if (isCurrent)
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Center(child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 24)),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        track.title,
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.w700, 
                          fontSize: 15,
                          color: isDark ? Colors.white : Colors.black,
                          letterSpacing: -0.2,
                        ),
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        track.artist.toUpperCase(),
                        style: GoogleFonts.inter(
                          color: isDark ? Colors.white38 : Colors.black38, 
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                ),
                _DiscoveryAction(
                  isDownloaded: isDownloaded,
                  isDownloading: isDownloading,
                  onTap: () {
                    if (!isDownloaded && !isDownloading) {
                      DownloadManager().processJob(track.sourceUrl, appState);
                    }
                  },
                  accentColor: accentColor,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DiscoveryAction extends StatelessWidget {
  final bool isDownloaded;
  final bool isDownloading;
  final VoidCallback onTap;
  final Color accentColor;

  const _DiscoveryAction({
    required this.isDownloaded,
    required this.isDownloading,
    required this.onTap,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    if (isDownloaded) {
      return Icon(Icons.check_circle_rounded, color: accentColor, size: 22);
    }
    if (isDownloading) {
      return SizedBox(
        width: 20, height: 20,
        child: CircularProgressIndicator(strokeWidth: 2, color: accentColor),
      );
    }
    return IconButton(
      visualDensity: VisualDensity.compact,
      icon: const Icon(Icons.add_rounded),
      onPressed: onTap,
    );
  }
}

class _RadarIcon extends StatefulWidget {
  final Color color;
  final bool isScanning;
  const _RadarIcon({required this.color, required this.isScanning});

  @override
  State<_RadarIcon> createState() => _RadarIconState();
}

class _RadarIconState extends State<_RadarIcon> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat();
  }
  @override
  void dispose() { _controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            if (widget.isScanning)
              ...List.generate(2, (i) {
                final p = (_controller.value + (i / 2)) % 1.0;
                return Container(
                  width: 24 + (p * 20),
                  height: 24 + (p * 20),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: widget.color.withValues(alpha: 1 - p), width: 1.5),
                  ),
                );
              }),
            Icon(Icons.radar_rounded, color: widget.color, size: 24),
          ],
        );
      },
    );
  }
}
