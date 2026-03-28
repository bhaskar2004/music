class Track {
  final String id;
  final String title;
  final String artist;
  final String album;
  final int duration;
  final String filename;
  final String? coverUrl;
  final String sourceUrl;
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
    required this.format,
  });

  factory Track.fromJson(Map<String, dynamic> json) {
    return Track(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Unknown',
      artist: json['artist'] ?? 'Unknown',
      album: json['album'] ?? 'Unknown',
      duration: json['duration'] ?? 0,
      filename: json['filename'] ?? '',
      coverUrl: json['coverUrl'],
      sourceUrl: json['sourceUrl'] ?? '',
      format: json['format'] ?? 'mp3',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'artist': artist,
        'album': album,
        'duration': duration,
        'filename': filename,
        'coverUrl': coverUrl,
        'sourceUrl': sourceUrl,
        'format': format,
      };
}
