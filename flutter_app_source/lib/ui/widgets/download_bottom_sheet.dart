import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_state.dart';
import '../../services/download_manager.dart';

class DownloadBottomSheet extends StatefulWidget {
  const DownloadBottomSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChangeNotifierProvider.value(
        value: context.read<AppState>(),
        child: const DownloadBottomSheet(),
      ),
    );
  }

  @override
  State<DownloadBottomSheet> createState() => _DownloadBottomSheetState();
}

class _DownloadBottomSheetState extends State<DownloadBottomSheet> {
  final _controller = TextEditingController();
  String? _selectedPlaylistId;
  bool _isStarting = false;

  static const _accent = Color(0xFF06C167);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String? _detectPlatform(String url) {
    final u = url.toLowerCase();
    if (u.contains('youtube.com') || u.contains('youtu.be')) return 'YouTube';
    if (u.contains('soundcloud.com')) return 'SoundCloud';
    if (u.contains('spotify.com')) return 'Spotify';
    if (u.contains('bandcamp.com')) return 'Bandcamp';
    if (u.contains('vimeo.com')) return 'Vimeo';
    return null;
  }

  Future<void> _startDownload() async {
    final raw = _controller.text.trim();
    if (raw.isEmpty) return;

    setState(() => _isStarting = true);

    final urls = raw
        .split(RegExp(r'[\n,]+'))
        .map((u) => u.trim())
        .where((u) => u.startsWith('http'))
        .toList();

    if (urls.isEmpty) {
      setState(() => _isStarting = false);
      return;
    }

    final appState = context.read<AppState>();
    final playlistId =
        _selectedPlaylistId != null && _selectedPlaylistId != 'none'
            ? _selectedPlaylistId
            : null;

    if (mounted) Navigator.pop(context);
    appState.setActiveView(ActiveView.downloads);

    for (final url in urls) {
      await DownloadManager().processJob(url, appState, playlistId: playlistId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final playlists = appState.playlists;
    final text = _controller.text;
    final platform = text.isNotEmpty ? _detectPlatform(text) : null;
    final hasUrl = text.trim().isNotEmpty;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF111111),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(
            top: BorderSide(color: Color(0xFF2A2A2A)),
          ),
        ),
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFF404040),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Header
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF06C167), Color(0xFF00FF85)],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.download_rounded,
                      color: Colors.black, size: 20),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Add from URL',
                        style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                            letterSpacing: -0.4)),
                    Text('YouTube, SoundCloud, Bandcamp & more',
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.5),
                            fontSize: 12)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // URL input
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF1A1A1A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF2A2A2A)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Icon(Icons.link,
                        size: 16,
                        color: Colors.white.withValues(alpha: 0.4)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      onChanged: (_) => setState(() {}),
                      maxLines: 4,
                      minLines: 2,
                      style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 13,
                          color: Colors.white),
                      decoration: InputDecoration(
                        hintText:
                            'Paste one or more URLs\n(one per line or comma separated)...',
                        hintStyle: TextStyle(
                            color: Colors.white.withValues(alpha: 0.25),
                            fontSize: 13),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                  if (platform != null) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _accent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(platform,
                          style: const TextStyle(
                              color: _accent,
                              fontSize: 10,
                              fontWeight: FontWeight.w700)),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Playlist selector
            if (playlists.isNotEmpty) ...[
              Text('Target Playlist',
                  style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: Colors.white.withValues(alpha: 0.3),
                      letterSpacing: 0.8)),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1A1A),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF2A2A2A)),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: _selectedPlaylistId ?? 'none',
                    dropdownColor: const Color(0xFF1E1E1E),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600),
                    onChanged: (v) => setState(() => _selectedPlaylistId = v),
                    items: [
                      const DropdownMenuItem(
                          value: 'none',
                          child: Text('No Playlist (Default)')),
                      ...playlists.map((p) => DropdownMenuItem(
                          value: p.id, child: Text(p.name))),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Start button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: (hasUrl && !_isStarting) ? _startDownload : null,
                icon: const Icon(Icons.download_rounded, size: 18),
                label: const Text('Start Download',
                    style: TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 15)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: hasUrl ? _accent : const Color(0xFF282828),
                  foregroundColor: hasUrl ? Colors.black : Colors.white38,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
              ),
            ),

            const SizedBox(height: 10),
            Center(
              child: Text(
                'Downloads automatically queue and run in order',
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.25),
                    fontSize: 11,
                    fontFamily: 'monospace'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
