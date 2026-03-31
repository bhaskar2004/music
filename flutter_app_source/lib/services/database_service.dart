import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/track.dart';
import '../models/playlist.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  static Database? _database;

  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final path = join(await getDatabasesPath(), 'wavelength_library.db');
    return await openDatabase(
      path,
      version: 2, // bumped for migration
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE tracks(
        id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        album TEXT,
        duration INTEGER,
        filename TEXT,
        coverUrl TEXT,
        sourceUrl TEXT,
        addedAt TEXT,
        format TEXT,
        isFavorite INTEGER DEFAULT 0,
        playlistId TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE playlists(
        id TEXT PRIMARY KEY,
        name TEXT,
        coverUrl TEXT,
        createdAt TEXT
      )
    ''');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      // Add playlistId column to existing tracks table
      try {
        await db.execute('ALTER TABLE tracks ADD COLUMN playlistId TEXT');
      } catch (_) {}

      // Create playlists table if it doesn't exist
      await db.execute('''
        CREATE TABLE IF NOT EXISTS playlists(
          id TEXT PRIMARY KEY,
          name TEXT,
          coverUrl TEXT,
          createdAt TEXT
        )
      ''');
    }
  }

  // ─── Tracks ──────────────────────────────────────────────────────────────

  Future<void> insertTrack(Track track) async {
    final db = await database;
    await db.insert('tracks', track.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Track>> getTracks() async {
    final db = await database;
    final maps = await db.query('tracks', orderBy: 'addedAt DESC');
    return maps.map(Track.fromMap).toList();
  }

  Future<void> toggleFavorite(Track track) async {
    final db = await database;
    final rows = await db.query('tracks', where: 'id = ?', whereArgs: [track.id]);

    if (rows.isEmpty) {
      await insertTrack(track.copyWith(isFavorite: true));
    } else {
      final current = (rows.first['isFavorite'] ?? 0) == 1;
      await db.update(
        'tracks',
        {'isFavorite': current ? 0 : 1},
        where: 'id = ?',
        whereArgs: [track.id],
      );
    }
  }

  Future<void> updateTrackPlaylist(String trackId, String? playlistId) async {
    final db = await database;
    await db.update(
      'tracks',
      {'playlistId': playlistId},
      where: 'id = ?',
      whereArgs: [trackId],
    );
  }

  Future<void> deleteTrack(String id) async {
    final db = await database;
    await db.delete('tracks', where: 'id = ?', whereArgs: [id]);
  }

  // ─── Playlists ────────────────────────────────────────────────────────────

  Future<void> insertPlaylist(Playlist playlist) async {
    final db = await database;
    await db.insert('playlists', playlist.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Playlist>> getPlaylists() async {
    final db = await database;
    final maps = await db.query('playlists', orderBy: 'createdAt ASC');
    return maps.map(Playlist.fromMap).toList();
  }

  Future<void> deletePlaylist(String id) async {
    final db = await database;
    await db.delete('playlists', where: 'id = ?', whereArgs: [id]);
    // Remove playlist association from all tracks
    await db.update(
      'tracks',
      {'playlistId': null},
      where: 'playlistId = ?',
      whereArgs: [id],
    );
  }
}
