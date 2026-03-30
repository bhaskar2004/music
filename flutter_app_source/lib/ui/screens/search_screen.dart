import 'package:flutter/material.dart';
import '../../models/track.dart';
import '../../services/api_service.dart';
import '../../services/download_service.dart';
import '../widgets/track_tile.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _urlController = TextEditingController();
  List<Track> _results = [];
  bool _isSearching = false;
  bool _isFetchingUrl = false;

  void _onSearch() async {
    if (_searchController.text.trim().isEmpty) return;
    setState(() => _isSearching = true);
    try {
      final results = await _api.searchTracks(_searchController.text);
      if (mounted) setState(() => _results = results);
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  void _onDownloadUrl() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;
    
    setState(() => _isFetchingUrl = true);
    try {
      final track = await _api.getTrackFromUrl(url);
      if (track != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Found: ${track.title}. Starting download...')),
        );
        await DownloadService.downloadTrackToDevice(track);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Download complete!')),
          );
          _urlController.clear();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not fetch video metadata. Verify the URL.')),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isFetchingUrl = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          title: const Text('Search & Download'),
          bottom: const TabBar(
            indicatorColor: Color(0xFF06C167),
            tabs: [
              Tab(text: 'Search'),
              Tab(text: 'Paste URL'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: TextField(
                    controller: _searchController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Search YouTube...',
                      hintStyle: const TextStyle(color: Colors.white24),
                      prefixIcon: const Icon(Icons.search, color: Colors.white54),
                      filled: true,
                      fillColor: const Color(0xFF1E1E1E),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onSubmitted: (_) => _onSearch(),
                  ),
                ),
                Expanded(
                  child: _isSearching
                      ? const Center(child: CircularProgressIndicator(color: Color(0xFF06C167)))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                          itemCount: _results.length,
                          itemBuilder: (context, index) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: TrackTile(
                                track: _results[index],
                                onFavoriteToggle: () => setState(() {}),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.link, size: 64, color: Color(0xFF06C167)),
                  const SizedBox(height: 24),
                  const Text('Direct Download', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Paste a YouTube URL to download audio directly', textAlign: TextAlign.center, style: TextStyle(color: Colors.white54)),
                  const SizedBox(height: 32),
                  TextField(
                    controller: _urlController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'https://youtube.com/watch?v=...',
                      hintStyle: const TextStyle(color: Colors.white24),
                      filled: true,
                      fillColor: const Color(0xFF1E1E1E),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: _isFetchingUrl ? null : _onDownloadUrl,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF06C167),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _isFetchingUrl
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Download Audio', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
