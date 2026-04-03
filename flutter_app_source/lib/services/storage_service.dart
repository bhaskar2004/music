import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import '../models/track.dart';
import '../models/playlist.dart';
import '../models/history_entry.dart';
import '../models/app_config.dart';

/// Replaces SQLite. All data lives in two JSON files on device local storage:
///   appDocDir/wavelength_library.json
///   appDocDir/wavelength_playlists.json
class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  // ─── Path helpers ─────────────────────────────────────────────────────────

  Future<File> _libraryFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/wavelength_library.json');
  }

  Future<File> _playlistsFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/wavelength_playlists.json');
  }

  Future<File> _historyFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/wavelength_history.json');
  }

  Future<File> _configFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/wavelength_config.json');
  }

  // ─── Tracks ───────────────────────────────────────────────────────────────

  Future<List<Track>> getTracks() async {
    try {
      final file = await _libraryFile();
      if (!await file.exists()) return [];
      final raw = await file.readAsString();
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => Track.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('[StorageService] getTracks error: $e');
      return [];
    }
  }

  Future<void> _saveTracks(List<Track> tracks) async {
    final file = await _libraryFile();
    await file.writeAsString(
      jsonEncode(tracks.map((t) => t.toMap()).toList()),
    );
  }

  Future<void> insertTrack(Track track) async {
    final tracks = await getTracks();
    // Remove duplicate, insert at front (most recent first)
    tracks.removeWhere((t) => t.id == track.id);
    tracks.insert(0, track);
    await _saveTracks(tracks);
  }

  Future<void> toggleFavorite(String trackId) async {
    final tracks = await getTracks();
    final idx = tracks.indexWhere((t) => t.id == trackId);
    if (idx < 0) return;
    final t = tracks[idx];
    tracks[idx] = t.copyWith(isFavorite: !t.isFavorite);
    await _saveTracks(tracks);
  }

  Future<void> toggleTrackPlaylist(String trackId, String playlistId) async {
    final tracks = await getTracks();
    final idx = tracks.indexWhere((t) => t.id == trackId);
    if (idx < 0) return;
    final t = tracks[idx];
    final list = List<String>.from(t.playlistIds);
    if (list.contains(playlistId)) {
      list.remove(playlistId);
    } else {
      list.add(playlistId);
    }
    tracks[idx] = t.copyWith(playlistIds: list);
    await _saveTracks(tracks);
  }

  Future<void> deleteTrack(String trackId) async {
    final tracks = await getTracks();
    tracks.removeWhere((t) => t.id == trackId);
    await _saveTracks(tracks);
  }

  // ─── Playlists ─────────────────────────────────────────────────────────────

  Future<List<Playlist>> getPlaylists() async {
    try {
      final file = await _playlistsFile();
      if (!await file.exists()) return [];
      final raw = await file.readAsString();
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => Playlist.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('[StorageService] getPlaylists error: $e');
      return [];
    }
  }

  Future<void> _savePlaylists(List<Playlist> playlists) async {
    final file = await _playlistsFile();
    await file.writeAsString(
      jsonEncode(playlists.map((p) => p.toMap()).toList()),
    );
  }

  Future<void> insertPlaylist(Playlist playlist) async {
    final playlists = await getPlaylists();
    playlists.removeWhere((p) => p.id == playlist.id);
    playlists.add(playlist);
    await _savePlaylists(playlists);
  }

  Future<void> deletePlaylist(String playlistId) async {
    final playlists = await getPlaylists();
    playlists.removeWhere((p) => p.id == playlistId);
    await _savePlaylists(playlists);

    // Detach all tracks from this playlist
    final tracks = await getTracks();
    final updated = tracks.map((t) {
      if (t.playlistIds.contains(playlistId)) {
        final newList = List<String>.from(t.playlistIds)..remove(playlistId);
        return t.copyWith(playlistIds: newList);
      }
      return t;
    }).toList();
    await _saveTracks(updated);
  }

  Future<void> savePlaylists(List<Playlist> playlists) async {
    await _savePlaylists(playlists);
  }

  Future<void> saveTracks(List<Track> tracks) async {
    await _saveTracks(tracks);
  }

  // ─── History ─────────────────────────────────────────────────────────────

  Future<List<HistoryEntry>> getHistory() async {
    try {
      final file = await _historyFile();
      if (!await file.exists()) return [];
      final raw = await file.readAsString();
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => HistoryEntry.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('[StorageService] getHistory error: $e');
      return [];
    }
  }

  Future<void> saveHistoryEntry(HistoryEntry entry) async {
    final history = await getHistory();
    history.add(entry);
    // Keep only last 2000 entries to avoid massive files
    if (history.length > 2000) {
      history.removeRange(0, history.length - 2000);
    }
    final file = await _historyFile();
    await file.writeAsString(
      jsonEncode(history.map((e) => e.toMap()).toList()),
    );
  }

  // ─── App Config ──────────────────────────────────────────────────────────

  Future<AppConfig> getConfig() async {
    try {
      final file = await _configFile();
      if (!await file.exists()) return AppConfig();
      final raw = await file.readAsString();
      return AppConfig.fromMap(Map<String, dynamic>.from(jsonDecode(raw)));
    } catch (e) {
      debugPrint('[StorageService] getConfig error: $e');
      return AppConfig();
    }
  }

  Future<void> saveConfig(AppConfig config) async {
    final file = await _configFile();
    await file.writeAsString(jsonEncode(config.toMap()));
  }
}
