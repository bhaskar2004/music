import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/track.dart';
import '../../providers/app_state.dart';
import '../../services/api_service.dart';
import '../../services/download_manager.dart';
import '../widgets/track_tile.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  final _searchCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  late final TabController _tab;

  List<Track> _results = [];
  List<Track> _serverTracks = [];
  bool _isSearching = false;
  bool _isFetchingUrl = false;
  bool _isFetchingServer = false;
  double _dlProgress = 0;

  // New selection state for server tracks
  final Set<String> _serverSelectedIds = {};
  bool _serverSelectionMode = false;

  static const _accent = Color(0xFF06C167);

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _tab.addListener(() {
      if (_tab.indexIsChanging && _tab.index != 0) {
        setState(() {
          _serverSelectionMode = false;
          _serverSelectedIds.clear();
        });
      }
    });
    _fetchServerLibrary();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _urlCtrl.dispose();
    _tab.dispose();
    super.dispose();
  }

  Future<void> _fetchServerLibrary() async {
    setState(() => _isFetchingServer = true);
    try {
      final data = await _api.fetchServerLibrary();
      if (mounted) {
        setState(() {
          _serverTracks = data['tracks'] as List<Track>;
        });
      }
    } finally {
      if (mounted) setState(() => _isFetchingServer = false);
    }
  }

  void _toggleServerSelection(String id) {
    setState(() {
      if (_serverSelectedIds.contains(id)) {
        _serverSelectedIds.remove(id);
        if (_serverSelectedIds.isEmpty) _serverSelectionMode = false;
      } else {
        _serverSelectedIds.add(id);
      }
    });
  }

  void _enterServerSelection(String id) {
    setState(() {
      _serverSelectionMode = true;
      _serverSelectedIds.add(id);
    });
  }

  Future<void> _downloadSelectedFromServer() async {
    final appState = context.read<AppState>();
    final tracksToDownload = _serverTracks
        .where((t) => _serverSelectedIds.contains(t.id))
        .toList();

    if (tracksToDownload.isEmpty) return;

    setState(() {
      _serverSelectionMode = false;
      _serverSelectedIds.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('Adding ${tracksToDownload.length} songs to downloads…'),
      backgroundColor: const Color(0xFF1E1E1E),
    ));

    for (final track in tracksToDownload) {
      try {
        await DownloadManager().processJob(track.sourceUrl, appState);
      } catch (e) {
        if (e.toString().contains('ALREADY_EXISTS')) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('"${track.title}" is already in your library.'),
              backgroundColor: Colors.blueGrey.shade800,
              duration: const Duration(seconds: 1),
            ));
          }
        }
      }
    }

    appState.setActiveView(ActiveView.downloads);
  }

  Future<void> _downloadAllFromServer() async {
    if (_serverTracks.isEmpty) return;

    final appState = context.read<AppState>();

    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('Adding all ${_serverTracks.length} songs to downloads…'),
      backgroundColor: const Color(0xFF1E1E1E),
    ));

    for (final track in _serverTracks) {
      try {
        await DownloadManager().processJob(track.sourceUrl, appState);
      } catch (e) {
        if (e.toString().contains('ALREADY_EXISTS')) {
          // Skip silently for "Sync All" to avoid SnackBar flood, 
          // or show a summary later. For now, just skip.
        }
      }
    }

    appState.setActiveView(ActiveView.downloads);
  }

  Future<void> _search() async {
    if (_searchCtrl.text.trim().isEmpty) return;
    setState(() {
      _isSearching = true;
      _results = [];
    });
    try {
      final r = await _api.searchTracks(_searchCtrl.text.trim());
      if (mounted) setState(() => _results = r);
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  Future<void> _downloadUrl() async {
    final url = _urlCtrl.text.trim();
    if (url.isEmpty) return;
    setState(() {
      _isFetchingUrl = true;
      _dlProgress = 0;
    });

    final appState = context.read<AppState>();

    try {
      final track = await _api.getTrackFromUrl(url);
      if (track == null) throw Exception('Could not fetch video info.');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Downloading "${track.title}"…'),
          duration: const Duration(seconds: 2),
          backgroundColor: const Color(0xFF1E1E1E),
        ));
        _urlCtrl.clear();
        appState.setActiveView(ActiveView.downloads);
      }

      await DownloadManager().processJob(url, appState);
    } catch (e) {
      if (mounted) {
        final isDuplicate = e.toString().contains('ALREADY_EXISTS');
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(isDuplicate ? 'This song is already in your library.' : 'Error: ${e.toString().split('\n').first}'),
          backgroundColor: isDuplicate ? Colors.blueGrey.shade800 : Colors.redAccent,
        ));
      }
    } finally {
      if (mounted) setState(() => _isFetchingUrl = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _serverSelectionMode
          ? AppBar(
              backgroundColor: const Color(0xFF1A1A1A),
              leading: IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => setState(() {
                  _serverSelectionMode = false;
                  _serverSelectedIds.clear();
                }),
              ),
              title: Text('${_serverSelectedIds.length} Selected',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              actions: [
                TextButton.icon(
                  onPressed: _serverSelectedIds.isEmpty ? null : _downloadSelectedFromServer,
                  icon: const Icon(Icons.download_rounded, size: 18),
                  label: const Text('Sync'),
                  style: TextButton.styleFrom(foregroundColor: _accent),
                ),
                const SizedBox(width: 8),
              ],
            )
          : AppBar(
              title: ShaderMask(
                shaderCallback: (b) => const LinearGradient(
                        colors: [Color(0xFF06C167), Color(0xFF00FF85)])
                    .createShader(b),
                child: const Text('Search & Download',
                    style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5)),
              ),
              bottom: TabBar(
                controller: _tab,
                indicatorColor: _accent,
                indicatorWeight: 2,
                labelColor: _accent,
                unselectedLabelColor: Colors.white38,
                labelStyle:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                tabs: const [
                  Tab(text: 'Web Library'),
                  Tab(text: 'YouTube'),
                  Tab(text: 'Direct Link'),
                ],
              ),
            ),
      body: TabBarView(
        controller: _tab,
        children: [
          // ── Web Library Tab ──────────────────────────────────────────
          _isFetchingServer
              ? const Center(
                  child: CircularProgressIndicator(color: _accent),
                )
              : _serverTracks.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.cloud_off_rounded,
                              size: 48, color: Colors.white12),
                          const SizedBox(height: 16),
                          const Text('No songs found on server',
                              style: TextStyle(color: Colors.white38)),
                          const SizedBox(height: 24),
                          TextButton.icon(
                            onPressed: _fetchServerLibrary,
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Refresh'),
                            style: TextButton.styleFrom(foregroundColor: _accent),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchServerLibrary,
                      color: _accent,
                      backgroundColor: const Color(0xFF1A1A1A),
                      child: CustomScrollView(
                        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                        slivers: [
                          if (!_serverSelectionMode)
                            SliverToBoxAdapter(
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                                child: Row(
                                  children: [
                                    Text(
                                      '${_serverTracks.length} tracks found',
                                      style: TextStyle(
                                          color: Colors.white.withValues(alpha: 0.4),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500),
                                    ),
                                    const Spacer(),
                                    TextButton.icon(
                                      onPressed: _downloadAllFromServer,
                                      icon: const Icon(Icons.sync_rounded, size: 16),
                                      label: const Text('Sync All',
                                          style: TextStyle(fontSize: 12)),
                                      style: TextButton.styleFrom(
                                        foregroundColor: _accent,
                                        visualDensity: VisualDensity.compact,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                            sliver: SliverGrid(
                              gridDelegate:
                                  const SliverGridDelegateWithMaxCrossAxisExtent(
                                maxCrossAxisExtent: 180,
                                mainAxisSpacing: 12,
                                crossAxisSpacing: 12,
                                childAspectRatio: 0.72,
                              ),
                              delegate: SliverChildBuilderDelegate(
                                (ctx, i) {
                                  final track = _serverTracks[i];
                                  return TrackTile(
                                    track: track,
                                    tracks: _serverTracks,
                                    isSelectionMode: _serverSelectionMode,
                                    isSelected: _serverSelectedIds.contains(track.id),
                                    onToggleSelection: () => _toggleServerSelection(track.id),
                                    onLongPressSelection: () => _enterServerSelection(track.id),
                                  );
                                },
                                childCount: _serverTracks.length,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

          // ── YouTube Search Tab ──────────────────────────────────────
          Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A1A1A),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF2A2A2A)),
                        ),
                        child: TextField(
                          controller: _searchCtrl,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 14),
                          decoration: const InputDecoration(
                            hintText: 'Search YouTube…',
                            hintStyle: TextStyle(color: Color(0xFF444444)),
                            border: InputBorder.none,
                            icon: Icon(Icons.search_rounded,
                                color: Color(0xFF888888)),
                          ),
                          onSubmitted: (_) => _search(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    GestureDetector(
                      onTap: _isSearching ? null : _search,
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: _accent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: _isSearching
                            ? const Padding(
                                padding: EdgeInsets.all(10),
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.black),
                              )
                            : const Icon(Icons.search_rounded,
                                color: Colors.black, size: 22),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _results.isEmpty && !_isSearching
                    ? const _SearchHint()
                    : GridView.builder(
                        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                        gridDelegate:
                            const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 180,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.72,
                        ),
                        itemCount: _results.length,
                        itemBuilder: (ctx, i) => TrackTile(
                          track: _results[i],
                          tracks: _results,
                        ),
                      ),
              ),
            ],
          ),

          // ── Direct Link Tab ──────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(24),
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 40),
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [Color(0xFF06C167), Color(0xFF00FF85)]),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(Icons.link_rounded,
                        color: Colors.black, size: 32),
                  ),
                  const SizedBox(height: 20),
                  const Text('Direct Download',
                      style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5)),
                  const SizedBox(height: 8),
                  const Text(
                    'Paste any YouTube URL to download audio directly to your library',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF888888), fontSize: 14),
                  ),
                  const SizedBox(height: 28),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A1A1A),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF2A2A2A)),
                    ),
                    child: TextField(
                      controller: _urlCtrl,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: const InputDecoration(
                        hintText: 'https://youtube.com/watch?v=…',
                        hintStyle:
                            TextStyle(color: Color(0xFF444444), fontSize: 13),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (_isFetchingUrl && _dlProgress > 0) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: _dlProgress,
                        backgroundColor: const Color(0xFF1E1E1E),
                        valueColor: const AlwaysStoppedAnimation(_accent),
                        minHeight: 5,
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: _isFetchingUrl ? null : _downloadUrl,
                      icon: _isFetchingUrl
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.black),
                            )
                          : const Icon(Icons.download_rounded),
                      label: Text(
                        _isFetchingUrl ? 'Downloading…' : 'Download Audio',
                        style: const TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _accent,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchHint extends StatelessWidget {
  const _SearchHint();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.music_note_outlined, color: Color(0xFF333333), size: 52),
          SizedBox(height: 12),
          Text('Search for songs, artists, or albums',
              style: TextStyle(color: Color(0xFF555555), fontSize: 14)),
        ],
      ),
    );
  }
}
