  final String? addedAt;
  final String format;

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
      };

  factory Track.fromJson(Map<String, dynamic> json) => Track.fromMap(json);
  Map<String, dynamic> toJson() => toMap();
}
