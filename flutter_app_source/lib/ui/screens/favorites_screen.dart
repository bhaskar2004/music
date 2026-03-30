import 'package:flutter/material.dart';
import '../../models/track.dart';
import '../../services/database_service.dart';
import '../widgets/track_tile.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({Key? key}) : super(key: key);

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Track> _favorites = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    try {
      final tracks = await DatabaseService().getTracks();
      if (mounted) {
        setState(() {
          _favorites = tracks.where((t) => t.isFavorite).toList();
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
          'Favorites',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -1.0, color: Color(0xFF06C167)),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadFavorites,
        color: const Color(0xFF06C167),
        backgroundColor: const Color(0xFF121212),
        child: _isLoading && _favorites.isEmpty
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF06C167)))
            : _favorites.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.favorite_border, size: 64, color: Colors.white.withOpacity(0.1)),
                        const SizedBox(height: 16),
                        Text(
                          'No favorites yet',
                          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 18, fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Tap the heart to save your favorite songs',
                          style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 14),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                    itemCount: _favorites.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: TrackTile(
                          track: _favorites[index],
                          onFavoriteToggle: _loadFavorites,
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
