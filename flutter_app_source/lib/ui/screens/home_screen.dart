import 'package:flutter/material.dart';
import '../../models/track.dart';
import '../../services/database_service.dart';
import '../widgets/track_tile.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Track> _library = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLibrary();
  }

  Future<void> _loadLibrary() async {
    try {
      final tracks = await DatabaseService().getTracks();
      if (mounted) {
        setState(() {
          _library = tracks;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Wavelength',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -1.0, color: Color(0xFF06C167)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync, color: Colors.white54),
            onPressed: _loadLibrary,
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadLibrary,
        color: const Color(0xFF06C167),
        backgroundColor: const Color(0xFF121212),
        child: _isLoading && _library.isEmpty
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF06C167)))
            : _library.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                    itemCount: _library.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: TrackTile(
                          track: _library[index],
                          onFavoriteToggle: _loadLibrary,
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.music_note_outlined, size: 64, color: Colors.white.withOpacity(0.1)),
          const SizedBox(height: 16),
          Text(
            'Your library is empty',
            style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 18, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          Text(
            'Search for music to add to your library',
            style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 14),
          ),
        ],
      ),
    );
  }
}
