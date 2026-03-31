import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../models/track.dart';
import '../models/playlist.dart';
import '../models/download_job.dart';
import '../services/database_service.dart';

enum SortOption { recent, title, artist, duration }

enum ActiveView { library, favorites, queue, downloads }

class AppState extends ChangeNotifier {
  // ─── Data ──────────────────────────────────────────────────────────────────
  List<Track> _library = [];
  List<Playlist> _playlists = [];
  final List<DownloadJob> _downloads = [];

  // ─── UI State ──────────────────────────────────────────────────────────────
  ActiveView _activeView = ActiveView.library;
  String? _activePlaylistId;
  SortOption _sortBy = SortOption.recent;
  String _searchQuery = '';
  bool _isSelectionMode = false;
  final Set<String> _selectedIds = {};
  bool _isAddingSongs = false;
  bool _showDownloadSheet = false;

  // ─── Getters ───────────────────────────────────────────────────────────────
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
  bool get showDownloadSheet => _showDownloadSheet;

  List<String> get favorites =>
      _library.where((t) => t.isFavorite).map((t) => t.id).toList();

  Playlist? get activePlaylist => _activePlaylistId != null
      ? _playlists.cast<Playlist?>().firstWhere(
            (p) => p?.id == _activePlaylistId,
            orElse: () => null,
          )
      : null;

  int get pendingDownloadsCount => _downloads.where((d) => d.isActive).length;

  List<Track> get filteredTracks {
    List<Track> tracks = [..._library];

    if (_activePlaylistId != null) {
      if (_isAddingSongs) {
        tracks = tracks.where((t) => t.playlistId != _activePlaylistId).toList();
      } else {
        tracks = tracks.where((t) => t.playlistId == _activePlaylistId).toList();
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
        break;
      case SortOption.artist:
        tracks.sort((a, b) => a.artist.compareTo(b.artist));
        break;
      case SortOption.duration:
        tracks.sort((a, b) => b.duration.compareTo(a.duration));
        break;
      case SortOption.recent:
        tracks.sort(
            (a, b) => (b.addedAt ?? '').compareTo(a.addedAt ?? ''));
        break;
    }

    return tracks;
  }

  List<Track> get favoriteTracks =>
      _library.where((t) => t.isFavorite).toList();

  // ─── Initialization ────────────────────────────────────────────────────────
  Future<void> initialize() async {
    _library = await DatabaseService().getTracks();
    _playlists = await DatabaseService().getPlaylists();
    notifyListeners();
  }

  // ─── Navigation ────────────────────────────────────────────────────────────
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

  void setShowDownloadSheet(bool val) {
    _showDownloadSheet = val;
    notifyListeners();
  }

  // ─── Sort & Search ─────────────────────────────────────────────────────────
  void setSortBy(SortOption sort) {
    _sortBy = sort;
    notifyListeners();
  }

  void setSearchQuery(String q) {
    _searchQuery = q;
    notifyListeners();
  }

  // ─── Selection Mode ────────────────────────────────────────────────────────
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

  // ─── Library ───────────────────────────────────────────────────────────────
  void addTrack(Track track) {
    // Avoid duplicates
    _library.removeWhere((t) => t.id == track.id);
    _library.insert(0, track);
    notifyListeners();
  }

  Future<void> removeTrack(String id) async {
    await DatabaseService().deleteTrack(id);
    _library.removeWhere((t) => t.id == id);
    notifyListeners();
  }

  Future<void> toggleFavorite(String trackId) async {
    final idx = _library.indexWhere((t) => t.id == trackId);
    if (idx < 0) return;
    final track = _library[idx];
    await DatabaseService().toggleFavorite(track);
    _library[idx] = track.copyWith(isFavorite: !track.isFavorite);
    notifyListeners();
  }

  Future<void> moveTrackToPlaylist(String trackId, String? playlistId) async {
    await DatabaseService().updateTrackPlaylist(trackId, playlistId);
    final idx = _library.indexWhere((t) => t.id == trackId);
    if (idx >= 0) {
      if (playlistId == null) {
        _library[idx] = _library[idx].copyWith(clearPlaylistId: true);
      } else {
        _library[idx] = _library[idx].copyWith(playlistId: playlistId);
      }
    }
    notifyListeners();
  }

  Future<void> bulkMoveToPlaylist(String? playlistId) async {
    final ids = Set<String>.from(_selectedIds);
    for (final id in ids) {
      await moveTrackToPlaylist(id, playlistId);
    }
    _selectedIds.clear();
    _isSelectionMode = false;
    _isAddingSongs = false;
    notifyListeners();
  }

  // ─── Playlists ─────────────────────────────────────────────────────────────
  Future<Playlist> createPlaylist(String name) async {
    final p = Playlist(
      id: const Uuid().v4(),
      name: name,
      createdAt: DateTime.now().toIso8601String(),
    );
    await DatabaseService().insertPlaylist(p);
    _playlists.add(p);
    notifyListeners();
    return p;
  }

  Future<void> deletePlaylist(String id) async {
    await DatabaseService().deletePlaylist(id);
    // Refresh library since tracks' playlistId got nulled in DB
    _library = await DatabaseService().getTracks();
    _playlists.removeWhere((p) => p.id == id);
    if (_activePlaylistId == id) _activePlaylistId = null;
    notifyListeners();
  }

  // ─── Downloads ─────────────────────────────────────────────────────────────
  DownloadJob createDownloadJob(String url, {String? playlistId}) {
    final job = DownloadJob(
      id: const Uuid().v4(),
      url: url,
      playlistId: playlistId,
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
    final job = _downloads[idx];
    job.status = DownloadStatus.pending;
    job.progress = 0;
    job.error = null;
    notifyListeners();
  }
}
