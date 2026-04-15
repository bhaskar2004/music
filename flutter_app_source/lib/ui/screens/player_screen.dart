import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:just_audio/just_audio.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../../services/download_manager.dart';
import '../../models/track.dart';
import '../../services/sync_service.dart';
import '../../services/theme_service.dart';
import '../widgets/vinyl_record.dart';
import '../widgets/glass_card.dart';
import '../widgets/neon_visualizer.dart';
import '../widgets/discovery_radar.dart';
import 'queue_view.dart';

class PlayerScreen extends StatefulWidget {
  const PlayerScreen({super.key});

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen>
    with SingleTickerProviderStateMixin {
  bool _dragging = false;
  double _dragValue = 0;
  bool _showLyrics = false;

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  void initState() {
    super.initState();
    // Use a post-frame callback to ensure context is ready
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final audio = context.read<AudioService>();
      final appState = context.read<AppState>();
      
      // Initial trigger for current track
      if (audio.currentTrack.value != null) {
        _handleTrackChange(audio.currentTrack.value!, appState);
      }

      // Listen for future track changes
      audio.currentTrack.addListener(() {
        if (audio.currentTrack.value != null) {
          _handleTrackChange(audio.currentTrack.value!, appState);
        }
      });
    });
  }

  Future<void> _handleTrackChange(Track track, AppState appState) async {
    // 1. Dynamic Theming
    final color = await ThemeService().extractAccentColor(track.coverUrl);
    if (color != null) {
      appState.updateAccentColor(color);
    }
    
    // 2. Discovery Radar
    appState.findRecommendations(track);
  }

  @override
  Widget build(BuildContext context) {
    final audio = context.read<AudioService>();
    final appState = context.watch<AppState>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Premium Branding (Dynamic)
    final premiumAccent = appState.currentAccentColor;
    final premiumBg = isDark ? const Color(0xFF0D0D0D) : const Color(0xFFFAFAF9);

    return Scaffold(
      backgroundColor: premiumBg,
      body: ValueListenableBuilder<Track?>(
        valueListenable: audio.currentTrack,
        builder: (ctx, track, _) {
          if (track == null) {
            return SafeArea(
              child: Column(
                children: [
                  _buildAppBar(context, audio, isDark),
                  const Expanded(
                    child: Center(
                      child: Text('No track playing',
                          style: TextStyle(color: Colors.black26, fontSize: 16)),
                    ),
                  ),
                ],
              ),
            );
          }

          return Stack(
            fit: StackFit.expand,
            children: [
              // Subtle background wash
              Positioned(
                top: -100,
                left: -100,
                child: Container(
                  width: 400,
                  height: 400,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        premiumAccent.withOpacity(isDark ? 0.08 : 0.05),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),

              // Content
              SafeArea(
                child: Column(
                  children: [
                    _buildAppBar(context, audio, isDark),
                    
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // ── Artwork / Lyrics View ──────────────────
                            Expanded(
                              flex: 5,
                              child: AnimatedSwitcher(
                                duration: const Duration(milliseconds: 600),
                                transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: child),
                                child: !_showLyrics 
                                  ? StreamBuilder<bool>(
                                      stream: audio.player.playingStream,
                                      builder: (context, snapshot) {
                                        final isPlaying = snapshot.data ?? audio.isPlaying;
                                        return Stack(
                                          alignment: Alignment.center,
                                          children: [
                                            NeonVisualizer(
                                              color: premiumAccent,
                                              isPlaying: isPlaying,
                                              size: MediaQuery.of(context).size.width * 0.72,
                                            ),
                                            VinylRecord(
                                              key: const ValueKey('vinyl'),
                                              coverUrl: track.coverUrl,
                                              isPlaying: isPlaying,
                                              size: MediaQuery.of(context).size.width * 0.72,
                                            ),
                                          ],
                                        );
                                      },
                                    )
                                  : Container(
                                      key: const ValueKey('lyrics'),
                                      child: _buildLyricsView(audio),
                                    ),
                              ),
                            ),

                            const SizedBox(height: 32),

                            // ── Track Title & Artist ────────────────────
                            Column(
                              children: [
                                Text(
                                  track.title,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.outfit(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w600,
                                    fontStyle: FontStyle.italic,
                                    letterSpacing: -0.5,
                                    color: isDark ? Colors.white : const Color(0xFF111111),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  track.artist.toUpperCase(),
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 1.5,
                                    color: isDark ? Colors.white38 : Colors.black38,
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 40),

                            // ── Controls Card ──────────────────────────
                            GlassCard(
                              borderRadius: 32,
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _buildSeekBar(audio, premiumAccent),
                                  const SizedBox(height: 24),
                                  _buildControls(audio, premiumAccent, isDark),
                                ],
                              ),
                            ),
                            
                            const SizedBox(height: 20),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              const DiscoveryRadar(),
            ],
          );
        },
      ),
    );
  }

  Widget _buildAppBar(BuildContext context, AudioService audio, bool isDark) {
    final premiumAccent = context.read<AppState>().currentAccentColor;
    final mutedColor = isDark ? Colors.white38 : Colors.black38;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          _AppBarBtn(
            icon: Icons.expand_more_rounded,
            onTap: () => Navigator.pop(context),
            isDark: isDark,
          ),
          
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'NOW PLAYING',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: mutedColor,
                    letterSpacing: 1.2,
                  ),
                ),
                ValueListenableBuilder<String?>(
                  valueListenable: SyncService().currentPartyId,
                  builder: (ctx, partyId, _) {
                    if (partyId == null) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: premiumAccent.withOpacity(0.12),
                          border: Border.all(color: premiumAccent.withOpacity(0.2)),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.groups_rounded, size: 10, color: premiumAccent),
                            const SizedBox(width: 4),
                            Text(
                              'PARTY: $partyId',
                              style: GoogleFonts.inter(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: premiumAccent,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),

          Row(
            children: [
              _AppBarBtn(
                icon: _showLyrics ? Icons.music_note_rounded : Icons.notes_rounded,
                active: _showLyrics,
                isDark: isDark,
                onTap: () => setState(() => _showLyrics = !_showLyrics),
              ),
              const SizedBox(width: 8),
              _AppBarBtn(
                icon: Icons.timer_rounded,
                isDark: isDark,
                active: audio.sleepTimerEnd.value != null,
                onTap: () => _showSleepTimerDialog(context, audio),
              ),
              const SizedBox(width: 8),
              _AppBarBtn(
                icon: Icons.radar_rounded,
                isDark: isDark,
                onTap: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (ctx) => const DiscoveryRadar(),
                  );
                },
              ),
              const SizedBox(width: 8),
              ValueListenableBuilder<Track?>(
                valueListenable: audio.currentTrack,
                builder: (ctx, track, _) {
                  if (track == null) return const SizedBox.shrink();
                  final appState = context.read<AppState>();
                  final inLibrary = appState.library.any((t) => t.sourceUrl == track.sourceUrl);
                  
                  return _AppBarBtn(
                    icon: inLibrary ? Icons.check_circle_rounded : Icons.download_for_offline_rounded,
                    active: inLibrary,
                    isDark: isDark,
                    onTap: inLibrary ? null : () async {
                      try {
                        await DownloadManager().processJob(track.sourceUrl, appState);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Download started...')),
                        );
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Error: ${e.toString().split(':').last}')),
                        );
                      }
                    },
                  );
                },
              ),
              const SizedBox(width: 8),
              _AppBarBtn(
                icon: Icons.queue_music_rounded,
                isDark: isDark,
                onTap: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (ctx) => const QueueView(),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSeekBar(AudioService audio, Color accent) {
    return StreamBuilder<Duration>(
      stream: audio.player.positionStream,
      builder: (ctx, snapshot) {
        final pos = snapshot.data ?? Duration.zero;
        final dur = audio.player.duration ?? Duration.zero;
        final total = dur.inMilliseconds.toDouble();
        final current = _dragging
            ? _dragValue
            : (total > 0 ? pos.inMilliseconds.toDouble().clamp(0.0, total) : 0.0);

        return Column(
          children: [
            SliderTheme(
              data: SliderTheme.of(ctx).copyWith(
                trackHeight: 3,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
                activeTrackColor: accent,
                inactiveTrackColor: accent.withOpacity(0.1),
                thumbColor: accent,
                overlayColor: accent.withOpacity(0.1),
              ),
              child: Slider(
                value: total > 0 ? current : 0,
                max: total > 0 ? total : 1,
                onChangeStart: (v) => setState(() => _dragging = true),
                onChanged: (v) => setState(() => _dragValue = v),
                onChangeEnd: (v) {
                  audio.seek(Duration(milliseconds: v.toInt()));
                  setState(() => _dragging = false);
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_fmt(Duration(milliseconds: current.toInt())),
                      style: const TextStyle(color: Colors.black26, fontSize: 11, fontWeight: FontWeight.w600)),
                  Text(_fmt(dur),
                      style: const TextStyle(color: Colors.black26, fontSize: 11, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildControls(AudioService audio, Color accent, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _CtrlBtn(
          icon: Icons.shuffle_rounded,
          active: audio.isShuffleModeEnabled.value,
          onTap: audio.toggleShuffle,
          size: 20,
        ),
        _CtrlBtn(
          icon: Icons.skip_previous_rounded,
          onTap: audio.playPrevious,
          size: 32,
        ),
        StreamBuilder<bool>(
          stream: audio.player.playingStream,
          builder: (context, snapshot) {
            final isPlaying = snapshot.data ?? audio.isPlaying;
            return GestureDetector(
              onTap: () => isPlaying ? audio.pause() : audio.resume(),
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white10 : Colors.black.withOpacity(0.04),
                  shape: BoxShape.circle,
                  border: Border.all(color: isDark ? Colors.white10 : Colors.black12),
                ),
                child: Icon(
                  isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                  size: 32,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            );
          },
        ),
        _CtrlBtn(
          icon: Icons.skip_next_rounded,
          onTap: audio.playNext,
          size: 32,
        ),
        _CtrlBtn(
          icon: Icons.repeat_rounded,
          active: audio.loopModeNotifier.value != LoopMode.off,
          onTap: audio.toggleRepeat,
          size: 20,
        ),
      ],
    );
  }

  Widget _buildLyricsView(AudioService audio) {
    final premiumAccent = context.read<AppState>().currentAccentColor;
    return ValueListenableBuilder<bool>(
      valueListenable: audio.isLoadingLyrics,
      builder: (ctx, loading, _) {
        if (loading) {
          return Center(child: CircularProgressIndicator(strokeWidth: 2, color: premiumAccent));
        }
        return ValueListenableBuilder<Map<String, dynamic>?>(
          valueListenable: audio.lyrics,
          builder: (ctx, lyricsData, _) {
            if (lyricsData == null) {
              return Center(
                child: Text('Lyrics not found',
                    style: GoogleFonts.inter(color: Colors.black26, fontSize: 14)),
              );
            }
            final synced = lyricsData['syncedLyrics'] as String?;
            final plain = lyricsData['plainLyrics'] as String?;

            if (synced != null) {
              return _SyncedLyricsViewer(lrc: synced, player: audio.player);
            } else if (plain != null) {
              return _PlainLyricsViewer(lyrics: plain);
            }
            return const Center(child: Text('No lyrics available'));
          },
        );
      },
    );
  }

  void _showSleepTimerDialog(BuildContext context, AudioService audio) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF161616) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Sleep Timer',
                style: GoogleFonts.outfit(
                  color: isDark ? Colors.white : Colors.black,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 24),
              _SleepTimerOption(label: 'Off', onTap: () { audio.setSleepTimer(null); Navigator.pop(ctx); }),
              _SleepTimerOption(label: '15 Minutes', onTap: () { audio.setSleepTimer(const Duration(minutes: 15)); Navigator.pop(ctx); }),
              _SleepTimerOption(label: '30 Minutes', onTap: () { audio.setSleepTimer(const Duration(minutes: 30)); Navigator.pop(ctx); }),
              _SleepTimerOption(label: '45 Minutes', onTap: () { audio.setSleepTimer(const Duration(minutes: 45)); Navigator.pop(ctx); }),
              _SleepTimerOption(label: '1 Hour', onTap: () { audio.setSleepTimer(const Duration(hours: 1)); Navigator.pop(ctx); }),
            ],
          ),
        ),
      ),
    );
  }
}

class _AppBarBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool active;
  final bool isDark;

  const _AppBarBtn({required this.icon, required this.onTap, this.active = false, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final premiumAccent = context.read<AppState>().currentAccentColor;
    final bgColor = isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.04);
    final iconColor = active ? premiumAccent : (isDark ? Colors.white70 : Colors.black54);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40, height: 40,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: active ? premiumAccent.withOpacity(0.2) : (isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05)),
          ),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
    );
  }
}

class _SleepTimerOption extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _SleepTimerOption({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ListTile(
      title: Text(
        label,
        textAlign: TextAlign.center,
        style: TextStyle(color: isDark ? Colors.white70 : Colors.black87, fontSize: 16),
      ),
      onTap: onTap,
    );
  }
}

class _SyncedLyricsViewer extends StatefulWidget {
  final String lrc;
  final AudioPlayer player;

  const _SyncedLyricsViewer({required this.lrc, required this.player});

  @override
  State<_SyncedLyricsViewer> createState() => _SyncedLyricsViewerState();
}

class _SyncedLyricsViewerState extends State<_SyncedLyricsViewer> {
  final ScrollController _scrollController = ScrollController();
  List<_LrcLine> _lines = [];
  int _currentIndex = -1;

  @override
  void initState() { super.initState(); _parseLrc(); }

  @override
  void didUpdateWidget(_SyncedLyricsViewer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.lrc != widget.lrc) _parseLrc();
  }

  void _parseLrc() {
    final lines = widget.lrc.split('\n');
    final timeRegExp = RegExp(r'\[(\d{2,}):(\d{2})\.(\d{2,3})\]');
    _lines = [];
    for (var line in lines) {
      final matches = timeRegExp.allMatches(line);
      if (matches.isEmpty) continue;
      final text = line.replaceAll(timeRegExp, '').trim();
      if (text.isEmpty) continue;
      for (final match in matches) {
        final m = int.parse(match.group(1)!);
        final s = int.parse(match.group(2)!);
        final msStr = match.group(3)!;
        final ms = msStr.length == 2 ? int.parse(msStr) * 10 : int.parse(msStr);
        _lines.add(_LrcLine(Duration(minutes: m, seconds: s, milliseconds: ms), text));
      }
    }
    _lines.sort((a, b) => a.time.compareTo(b.time));
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return StreamBuilder<Duration>(
      stream: widget.player.positionStream,
      builder: (context, snapshot) {
        final position = snapshot.data ?? Duration.zero;
        int newIndex = -1;
        for (int i = 0; i < _lines.length; i++) {
          if (position >= _lines[i].time) newIndex = i;
          else break;
        }

        if (newIndex != _currentIndex && newIndex != -1) {
          _currentIndex = newIndex;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_scrollController.hasClients) {
              final offset = (_currentIndex * 60.0) - 150;
              _scrollController.animateTo(
                offset.clamp(0, _scrollController.position.maxScrollExtent),
                duration: const Duration(milliseconds: 600),
                curve: Curves.easeInOutCubic,
              );
            }
          });
        }

        return ListView.builder(
          controller: _scrollController,
          padding: const EdgeInsets.symmetric(vertical: 180),
          itemCount: _lines.length,
          itemBuilder: (context, index) {
            final isCurrent = index == _currentIndex;
            return Container(
              height: 60,
              alignment: Alignment.center,
              child: AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 400),
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  color: isCurrent ? (isDark ? Colors.white : Colors.black) : (isDark ? Colors.white24 : Colors.black12),
                  fontSize: isCurrent ? 26 : 20,
                  fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                  fontStyle: isCurrent ? FontStyle.italic : FontStyle.normal,
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(_lines[index].text),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _PlainLyricsViewer extends StatelessWidget {
  final String lyrics;
  const _PlainLyricsViewer({required this.lyrics});
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Text(
        lyrics, textAlign: TextAlign.center,
        style: GoogleFonts.inter(
          color: isDark ? Colors.white.withOpacity(0.7) : Colors.black.withOpacity(0.7),
          fontSize: 18, height: 1.8, fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _LrcLine {
  final Duration time;
  final String text;
  _LrcLine(this.time, this.text);
}

class _CtrlBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool active;
  final double size;
  const _CtrlBtn({required this.icon, required this.onTap, this.active = false, this.size = 28});
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final premiumAccent = context.read<AppState>().currentAccentColor;
    return GestureDetector(
      onTap: onTap,
      child: Icon(icon, size: size, color: active ? premiumAccent : (isDark ? Colors.white24 : Colors.black26)),
    );
  }
}


class _ArtPlaceholder extends StatelessWidget {
  final String title;
  const _ArtPlaceholder({required this.title});
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Center(
        child: Text(
          title.isNotEmpty ? title[0].toUpperCase() : '♪',
          style: const TextStyle(fontSize: 80, fontWeight: FontWeight.w900, color: Colors.white12),
        ),
      ),
    );
  }
}
