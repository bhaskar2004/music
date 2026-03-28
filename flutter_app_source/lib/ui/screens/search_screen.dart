import 'package:flutter/material.dart';
import '../../models/track.dart';
import '../../services/api_service.dart';
import '../../services/download_service.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _searchController = TextEditingController();
  List<Track> _results = [];
  bool _isSearching = false;

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            hintText: 'Search YouTube...',
            hintStyle: TextStyle(color: Colors.white24),
            border: InputBorder.none,
          ),
          onSubmitted: (_) => _onSearch(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Color(0xFF06C167)),
            onPressed: _onSearch,
          )
        ],
      ),
      body: _isSearching
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF06C167)))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _results.length,
              itemBuilder: (context, index) {
                final track = _results[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF121212),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: track.coverUrl != null
                              ? Image.network(track.coverUrl!, width: 56, height: 56, fit: BoxFit.cover)
                              : const Icon(Icons.music_note, color: Colors.white24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(track.title, style: const TextStyle(fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                              Text(track.artist, style: const TextStyle(color: Colors.white54, fontSize: 13)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.download_for_offline, color: Color(0xFF06C167)),
                          onPressed: () async {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Starting download: ${track.title}')),
                            );
                            await DownloadService.downloadTrackToDevice(track);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Download complete!')),
                              );
                            }
                          },
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
