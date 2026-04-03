class HistoryEntry {
  final String trackId;
  final DateTime timestamp;
  final int durationSeconds;

  HistoryEntry({
    required this.trackId,
    required this.timestamp,
    required this.durationSeconds,
  });

  Map<String, dynamic> toMap() => {
        'trackId': trackId,
        'timestamp': timestamp.toIso8601String(),
        'durationSeconds': durationSeconds,
      };

  factory HistoryEntry.fromMap(Map<String, dynamic> map) {
    return HistoryEntry(
      trackId: map['trackId'] ?? '',
      timestamp: DateTime.parse(map['timestamp'] ?? DateTime.now().toIso8601String()),
      durationSeconds: map['durationSeconds'] ?? 0,
    );
  }
}
