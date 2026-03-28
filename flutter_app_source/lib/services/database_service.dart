import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/track.dart';

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
    String path = join(await getDatabasesPath(), 'wavelength_library.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
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
        format TEXT
      )
    ''');
  }

  Future<void> insertTrack(Track track) async {
    final db = await database;
    await db.insert(
      'tracks',
      track.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Track>> getTracks() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('tracks', orderBy: 'addedAt DESC');
    return List.generate(maps.length, (i) {
      return Track.fromMap(maps[i]);
    });
  }

  Future<void> deleteTrack(String id) async {
    final db = await database;
    await db.delete(
      'tracks',
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
