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
  bool _isSearching = false;
  bool _isFetchingUrl = false;
  double _dlProgress = 0;

  static const _accent = Color(0xFF06C167);

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _urlCtrl.dispose();
    _tab.dispose();
    super.dispose();
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
        // Go to downloads view
        appState.setActiveView(ActiveView.downloads);
      }

      await DownloadManager().processJob(url, appState);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
              'Error: ${e.toString().split('\n').first}'),
          backgroundColor: Colors.redAccent,
        ));
      }
    } finally {
      if (mounted) setState(() => _isFetchingUrl = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
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
          labelStyle: const TextStyle(
              fontWeight: FontWeight.w700, fontSize: 13),
          tabs: const [
            Tab(text: 'Search YouTube'),
            Tab(text: 'Paste URL'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          // ── Search tab ───────────────────────────────────────────────
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
                          border: Border.all(
                              color: const Color(0xFF2A2A2A)),
                        ),
                        child: TextField(
                          controller: _searchCtrl,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 14),
                          decoration: const InputDecoration(
                            hintText: 'Search YouTube…',
                            hintStyle:
                                TextStyle(color: Color(0xFF444444)),
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
                                    strokeWidth: 2,
                                    color: Colors.black),
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
                        padding: const EdgeInsets.fromLTRB(
                            16, 0, 16, 100),
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
                        ),
                      ),
              ),
            ],
          ),

          // ── URL tab ───────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [
                      Color(0xFF06C167),
                      Color(0xFF00FF85)
                    ]),
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
                  style: TextStyle(
                      color: Color(0xFF888888), fontSize: 14),
                ),
                const SizedBox(height: 28),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A1A1A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF2A2A2A)),
                  ),
                  child: TextField(
                    controller: _urlCtrl,
                    style: const TextStyle(
                        color: Colors.white, fontSize: 13),
                    decoration: const InputDecoration(
                      hintText: 'https://youtube.com/watch?v=…',
                      hintStyle: TextStyle(
                          color: Color(0xFF444444), fontSize: 13),
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
                      valueColor:
                          const AlwaysStoppedAnimation(_accent),
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
                                strokeWidth: 2,
                                color: Colors.black),
                          )
                        : const Icon(
                            Icons.download_rounded),
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
          Icon(Icons.music_note_outlined,
              color: Color(0xFF333333), size: 52),
          SizedBox(height: 12),
          Text('Search for songs, artists, or albums',
              style: TextStyle(
                  color: Color(0xFF555555), fontSize: 14)),
        ],
      ),
    );
  }
}
