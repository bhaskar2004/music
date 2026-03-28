import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/track.dart';
import '../../services/database_service.dart';
import '../../services/audio_service.dart';
import '../../services/download_service.dart';
import 'search_screen.dart';

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
            icon: const Icon(Icons.search, color: Colors.white),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen())).then((_) => _loadLibrary()),
          ),
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
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: _library.length,
                itemBuilder: (context, index) {
                  final track = _library[index];
                  return FutureBuilder<bool>(
                    future: _isDownloaded(track),
                    builder: (context, snapshot) {
                      final isDownloaded = snapshot.data ?? false;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () => Provider.of<AudioService>(context, listen: false).playTrack(track),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF121212),
                              border: Border.all(color: Colors.white.withOpacity(0.05)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                // Cover Art
                                Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF282828),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: track.coverUrl != null
                                        ? CachedNetworkImage(
                                            imageUrl: track.coverUrl!,
                                            fit: BoxFit.cover,
                                            placeholder: (context, url) => const Icon(Icons.music_note, color: Colors.white24),
                                            errorWidget: (context, url, error) => const Icon(Icons.music_note, color: Colors.white24),
                                          )
                                        : const Icon(Icons.music_note, color: Colors.white24),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                // Text Info
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        track.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 16,
                                          color: Colors.white,
                                          letterSpacing: -0.3,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          if (isDownloaded)
                                            const Padding(
                                              padding: EdgeInsets.only(right: 6),
                                              child: Icon(Icons.check_circle, size: 14, color: Color(0xFF06C167)),
                                            ),
                                          Expanded(
                                            child: Text(
                                              track.artist,
                                              style: TextStyle(
                                                fontWeight: FontWeight.w500,
                                                fontSize: 13,
                                                color: Colors.white.withOpacity(0.6),
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                // Download/Play Actions
                                IconButton(
                                  icon: Icon(
                                    isDownloaded ? Icons.play_arrow : Icons.download_for_offline,
                                    color: isDownloaded ? const Color(0xFF06C167) : Colors.white24,
                                  ),
                                  onPressed: () async {
                                    if (!isDownloaded) {
                                      await DownloadService.downloadTrackToDevice(track);
                                      setState(() {});
                                    } else {
                                      Provider.of<AudioService>(context, listen: false).playTrack(track);
                                    }
                                  },
                                )
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
      ),
    );
  }

  Future<bool> _isDownloaded(Track track) async {
    String localPath = "";
    if (Platform.isAndroid) {
      localPath = "/storage/emulated/0/Music/Wavelength/${track.filename}";
    } else {
      final docs = await getApplicationDocumentsDirectory();
      localPath = "${docs.path}/Wavelength/${track.filename}";
    }
    return File(localPath).exists();
  }
}
