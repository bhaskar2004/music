import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_state.dart';
import '../../services/storage_service.dart';
import '../../models/history_entry.dart';
import '../../models/track.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  bool _isLoading = true;
  List<HistoryEntry> _history = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final history = await StorageService().getHistory();
    // Sort by timestamp descending
    history.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    
    if (mounted) {
      setState(() {
        _history = history;
        _isLoading = false;
      });
    }
  }

  String _formatDateTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month}';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final appState = Provider.of<AppState>(context);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: const Text('Recently Played', 
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 24)),
          ),
          if (_history.isEmpty)
            const SliverFillRemaining(
              child: Center(child: Text('No history yet. Start listening!', style: TextStyle(color: Colors.grey))),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final entry = _history[index];
                  final track = appState.library.cast<Track?>().firstWhere(
                    (t) => t?.id == entry.trackId,
                    orElse: () => null,
                  );

                  if (track == null) return const SizedBox.shrink();

                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListTile(
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: track.coverUrl.isNotEmpty
                          ? Image.network(track.coverUrl, width: 44, height: 44, fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(color: Colors.grey[800], width: 44, height: 44))
                          : Container(color: Colors.grey[800], width: 44, height: 44, child: const Icon(Icons.music_note, size: 20)),
                      ),
                      title: Text(track.title, style: const TextStyle(fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text(track.artist, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                      trailing: Text(_formatDateTime(entry.timestamp), style: const TextStyle(color: Colors.grey, fontSize: 11)),
                    ),
                  );
                },
                childCount: _history.length,
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }
}
