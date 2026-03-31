class Track {
  final String id;
  final String title;
  final String artist;
  final String album;
  final int duration;
  final String filename;
  final String? coverUrl;
  final String sourceUrl;
  final String? addedAt;
  final String format;
  final bool isFavorite;
  final String? playlistId; // maps to folders in web version

  Track({
    required this.id,
    required this.title,
    required this.artist,
    required this.album,
    required this.duration,
    required this.filename,
    this.coverUrl,
    required this.sourceUrl,
    this.addedAt,
    required this.format,
    this.isFavorite = false,
    this.playlistId,
  });

  factory Track.fromMap(Map<String, dynamic> map) {
    return Track(
      id: map['id'] ?? '',
      title: map['title'] ?? 'Unknown',
      artist: map['artist'] ?? 'Unknown',
      album: map['album'] ?? 'Unknown',
      duration: map['duration'] ?? 0,
      filename: map['filename'] ?? '',
      coverUrl: map['coverUrl'],
      sourceUrl: map['sourceUrl'] ?? '',
      addedAt: map['addedAt'],
      format: map['format'] ?? 'mp3',
      isFavorite: (map['isFavorite'] ?? 0) == 1,
      playlistId: map['playlistId'],
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'title': title,
        'artist': artist,
        'album': album,
        'duration': duration,
        'filename': filename,
        'coverUrl': coverUrl,
        'sourceUrl': sourceUrl,
        'addedAt': addedAt ?? DateTime.now().toIso8601String(),
        'format': format,
        'isFavorite': isFavorite ? 1 : 0,
        'playlistId': playlistId,
      };

  Track copyWith({
    String? id,
    String? title,
    String? artist,
    String? album,
    int? duration,
    String? filename,
    String? coverUrl,
    String? sourceUrl,
    String? addedAt,
    String? format,
    bool? isFavorite,
    String? playlistId,
    bool clearPlaylistId = false,
  }) {
    return Track(
      id: id ?? this.id,
      title: title ?? this.title,
      artist: artist ?? this.artist,
      album: album ?? this.album,
      duration: duration ?? this.duration,
      filename: filename ?? this.filename,
      coverUrl: coverUrl ?? this.coverUrl,
      sourceUrl: sourceUrl ?? this.sourceUrl,
      addedAt: addedAt ?? this.addedAt,
      format: format ?? this.format,
      isFavorite: isFavorite ?? this.isFavorite,
      playlistId: clearPlaylistId ? null : (playlistId ?? this.playlistId),
    );
  }

  factory Track.fromJson(Map<String, dynamic> json) => Track.fromMap(json);
  Map<String, dynamic> toJson() => toMap();
}
