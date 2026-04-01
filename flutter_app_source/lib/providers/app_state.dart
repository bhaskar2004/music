import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../models/track.dart';
import '../models/playlist.dart';
import '../models/download_job.dart';
import '../services/storage_service.dart';

enum SortOption { recent, title, artist, duration }

enum ActiveView { library, favorites, queue, downloads }

class AppState extends ChangeNotifier {
  List<Track> _library = [];
  List<Playlist> _playlists = [];
  List<DownloadJob> _downloads = [];

  ActiveView _activeView = ActiveView.library;
  String? _activePlaylistId;
  SortOption _sortBy = SortOption.recent;
  String _searchQuery = '';
  bool _isSelectionMode = false;
  final Set<String> _selectedIds = {};
  bool _isAddingSongs = false;

  // ─── Getters ──────────────────────────────────────────────────────────────

  List<Track> get library => List.unmodifiable(_library);
  List<Playlist> get playlists => List.unmodifiable(_playlists);
  List<DownloadJob> get downloads => List.unmodifiable(_downloads);
  ActiveView get activeView => _activeView;
  String? get activePlaylistId => _activePlaylistId;
  SortOption get sortBy => _sortBy;
  String get searchQuery => _searchQuery;
  bool get isSelectionMode => _isSelectionMode;
  Set<String> get selectedIds => Set.unmodifiable(_selectedIds);
  bool get isAddingSongs => _isAddingSongs;
  int get pendingDownloadsCount =>
      _downloads.where((d) => d.isActive).length;

  List<String> get favorites =>
      _library.where((t) => t.isFavorite).map((t) => t.id).toList();

  Playlist? get activePlaylist => _activePlaylistId != null
      ? _playlists.cast<Playlist?>().firstWhere(
            (p) => p?.id == _activePlaylistId,
            orElse: () => null)
      : null;

  List<Track> get filteredTracks {
    List<Track> tracks = [..._library];

    if (_activePlaylistId != null) {
      if (_isAddingSongs) {
        tracks = tracks.where((t) => !t.playlistIds.contains(_activePlaylistId)).toList();
      } else {
        tracks = tracks.where((t) => t.playlistIds.contains(_activePlaylistId)).toList();
      }
    }

    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      tracks = tracks
          .where((t) =>
              t.title.toLowerCase().contains(q) ||
              t.artist.toLowerCase().contains(q) ||
              t.album.toLowerCase().contains(q))
          .toList();
    }

    switch (_sortBy) {
      case SortOption.title:
        tracks.sort((a, b) => a.title.compareTo(b.title));
      case SortOption.artist:
        tracks.sort((a, b) => a.artist.compareTo(b.artist));
      case SortOption.duration:
        tracks.sort((a, b) => b.duration.compareTo(a.duration));
      case SortOption.recent:
        tracks.sort((a, b) => (b.addedAt ?? '').compareTo(a.addedAt ?? ''));
    }

    return tracks;
  }

  List<Track> get favoriteTracks => _library.where((t) => t.isFavorite).toList();

  // ─── Init ─────────────────────────────────────────────────────────────────

  Future<void> initialize() async {
    _library = await StorageService().getTracks();
    _playlists = await StorageService().getPlaylists();
    notifyListeners();
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  void setActiveView(ActiveView view) {
    _activeView = view;
    if (view != ActiveView.library) {
      _activePlaylistId = null;
      _isSelectionMode = false;
      _isAddingSongs = false;
      _selectedIds.clear();
    }
    notifyListeners();
  }

  void setActivePlaylist(String? id) {
    _activePlaylistId = id;
    _activeView = ActiveView.library;
    _isSelectionMode = false;
    _isAddingSongs = false;
    _selectedIds.clear();
    _searchQuery = '';
    notifyListeners();
  }

  // ─── Sort & Search ────────────────────────────────────────────────────────

  void setSortBy(SortOption sort) {
    _sortBy = sort;
    notifyListeners();
  }

  void setSearchQuery(String q) {
    _searchQuery = q;
    notifyListeners();
  }

  // ─── Selection ────────────────────────────────────────────────────────────

  void setSelectionMode(bool enabled) {
    _isSelectionMode = enabled;
    if (!enabled) _selectedIds.clear();
    notifyListeners();
  }

  void toggleTrackSelection(String id) {
    if (_selectedIds.contains(id)) {
      _selectedIds.remove(id);
    } else {
      _selectedIds.add(id);
    }
    notifyListeners();
  }

  void clearSelection() {
    _selectedIds.clear();
    notifyListeners();
  }

  void startAddingSongs() {
    _isAddingSongs = true;
    _isSelectionMode = true;
    _selectedIds.clear();
    notifyListeners();
  }

  void cancelAddingSongs() {
    _isAddingSongs = false;
    _isSelectionMode = false;
    _selectedIds.clear();
    notifyListeners();
  }

  // ─── Library ──────────────────────────────────────────────────────────────

  void addTrack(Track track) {
    _library.removeWhere((t) => t.id == track.id);
    _library.insert(0, track);
    notifyListeners();
  }

  Future<void> removeTrack(String id) async {
    await StorageService().deleteTrack(id);
    _library.removeWhere((t) => t.id == id);
    notifyListeners();
  }

  Future<void> toggleFavorite(String trackId) async {
    final idx = _library.indexWhere((t) => t.id == trackId);
    if (idx < 0) return;
    await StorageService().toggleFavorite(trackId);
    _library[idx] = _library[idx].copyWith(isFavorite: !_library[idx].isFavorite);
    notifyListeners();
  }

  Future<void> toggleTrackInPlaylist(String trackId, String playlistId) async {
    await StorageService().toggleTrackPlaylist(trackId, playlistId);
    final idx = _library.indexWhere((t) => t.id == trackId);
    if (idx >= 0) {
      final t = _library[idx];
      final list = List<String>.from(t.playlistIds);
      if (list.contains(playlistId)) {
        list.remove(playlistId);
      } else {
        list.add(playlistId);
      }
      _library[idx] = t.copyWith(playlistIds: list);
    }
    notifyListeners();
  }

  Future<void> bulkAddTracksToPlaylist(String playlistId) async {
    for (final id in Set<String>.from(_selectedIds)) {
      final t = _library.firstWhere((track) => track.id == id);
      if (!t.playlistIds.contains(playlistId)) {
        await toggleTrackInPlaylist(id, playlistId);
      }
    }
    _selectedIds.clear();
    _isSelectionMode = false;
    _isAddingSongs = false;
    notifyListeners();
  }

  // ─── Sync ─────────────────────────────────────────────────────────────────

  Future<void> syncWithServer() async {
    final data = await ApiService().fetchServerLibrary();
    final serverTracks = data['tracks'] as List<Track>;
    final serverPlaylists = data['playlists'] as List<Playlist>;

    if (serverTracks.isEmpty && serverPlaylists.isEmpty) return;

    // Merge tracks (preserve local favs if they exist)
    for (final sTrack in serverTracks) {
      final localIdx = _library.indexWhere((t) => t.id == sTrack.id);
      if (localIdx >= 0) {
        // Update local with server metadata but keep favorite status if it was set
        _library[localIdx] = sTrack.copyWith(
          isFavorite: _library[localIdx].isFavorite || sTrack.isFavorite,
        );
      } else {
        _library.add(sTrack);
      }
    }

    _playlists = serverPlaylists;
    
    await StorageService().saveTracks(_library);
    await StorageService().savePlaylists(_playlists);
    notifyListeners();
  }

  // ─── Playlists ────────────────────────────────────────────────────────────

  Future<Playlist> createPlaylist(String name) async {
    final p = Playlist(
      id: const Uuid().v4(),
      name: name,
      createdAt: DateTime.now().toIso8601String(),
    );
    await StorageService().insertPlaylist(p);
    _playlists.add(p);
    notifyListeners();
    return p;
  }

  Future<void> deletePlaylist(String id) async {
    await StorageService().deletePlaylist(id);
    // Reload library since tracks' playlistIds were cleared in storage
    _library = await StorageService().getTracks();
    _playlists.removeWhere((p) => p.id == id);
    if (_activePlaylistId == id) _activePlaylistId = null;
    notifyListeners();
  }

  // ─── Downloads ────────────────────────────────────────────────────────────

  DownloadJob createDownloadJob(String url, {List<String>? playlistIds}) {
    final job = DownloadJob(
      id: const Uuid().v4(),
      url: url,
      playlistIds: playlistIds ?? [],
      startedAt: DateTime.now(),
    );
    _downloads.insert(0, job);
    notifyListeners();
    return job;
  }

  void updateDownload(
    String jobId, {
    DownloadStatus? status,
    double? progress,
    String? title,
    String? artist,
    String? coverUrl,
    String? error,
    Track? completedTrack,
  }) {
    final idx = _downloads.indexWhere((d) => d.id == jobId);
    if (idx < 0) return;
    final job = _downloads[idx];
    if (status != null) job.status = status;
    if (progress != null) job.progress = progress;
    if (title != null) job.title = title;
    if (artist != null) job.artist = artist;
    if (coverUrl != null) job.coverUrl = coverUrl;
    if (error != null) job.error = error;
    if (completedTrack != null) addTrack(completedTrack);
    notifyListeners();
  }

  void removeDownload(String jobId) {
    _downloads.removeWhere((d) => d.id == jobId);
    notifyListeners();
  }

  void retryDownload(String jobId) {
    final idx = _downloads.indexWhere((d) => d.id == jobId);
    if (idx < 0) return;
    _downloads[idx].status = DownloadStatus.pending;
    _downloads[idx].progress = 0;
    _downloads[idx].error = null;
    notifyListeners();
  }
}