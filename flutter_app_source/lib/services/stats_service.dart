import '../models/history_entry.dart';
import '../models/track.dart';
import 'storage_service.dart';

class StatsService {
  static final StatsService _instance = StatsService._internal();
  factory StatsService() => _instance;
  StatsService._internal();

  /// Calculates total listen time in seconds.
  Future<int> getTotalListenTime(List<HistoryEntry> history) async {
    return history.fold(0, (sum, entry) => sum + entry.durationSeconds);
  }

  /// Calculates listen time for today in seconds.
  Future<int> getTodayListenTime(List<HistoryEntry> history) async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return history
        .where((e) => e.timestamp.isAfter(today))
        .fold(0, (sum, entry) => sum + entry.durationSeconds);
  }

  /// Calculates listen time for yesterday in seconds.
  Future<int> getYesterdayListenTime(List<HistoryEntry> history) async {
    final now = DateTime.now();
    final yesterday = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 1));
    final today = DateTime(now.year, now.month, now.day);
    return history
        .where((e) => e.timestamp.isAfter(yesterday) && e.timestamp.isBefore(today))
        .fold(0, (sum, entry) => sum + entry.durationSeconds);
  }

  /// Returns the top [count] tracks by play count.
  Future<List<MapEntry<String, int>>> getTopTracks(List<HistoryEntry> history, {int count = 5}) async {
    final counts = <String, int>{};
    for (var entry in history) {
      counts[entry.trackId] = (counts[entry.trackId] ?? 0) + 1;
    }
    final sorted = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(count).toList();
  }

  /// Returns the top artists by play count.
  Future<List<MapEntry<String, int>>> getTopArtists(
      List<HistoryEntry> history, List<Track> library, {int count = 5}) async {
    final counts = <String, int>{};
    final trackToArtist = {for (var t in library) t.id: t.artist};

    for (var entry in history) {
      final artist = trackToArtist[entry.trackId] ?? 'Unknown';
      counts[artist] = (counts[artist] ?? 0) + 1;
    }
    
    final sorted = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(count).toList();
  }

  /// Returns a map of date strings to listen time (seconds) for the last 7 days.
  Future<Map<String, int>> getLast7DaysActivity(List<HistoryEntry> history) async {
    final activity = <String, int>{};
    final now = DateTime.now();
    
    for (int i = 0; i < 7; i++) {
      final date = now.subtract(Duration(days: i));
      final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      
      final dayStart = DateTime(date.year, date.month, date.day);
      final dayEnd = dayStart.add(const Duration(days: 1));
      
      final dayTime = history
          .where((e) => e.timestamp.isAfter(dayStart) && e.timestamp.isBefore(dayEnd))
          .fold(0, (sum, entry) => sum + entry.durationSeconds);
          
      activity[dateStr] = dayTime;
    }
    
    return activity;
  }
}
