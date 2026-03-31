class Playlist {
  final String id;
  final String name;
  final String? coverUrl;
  final String createdAt;

  const Playlist({
    required this.id,
    required this.name,
    this.coverUrl,
    required this.createdAt,
  });

  factory Playlist.fromMap(Map<String, dynamic> map) => Playlist(
        id: map['id'] ?? '',
        name: map['name'] ?? 'Untitled',
        coverUrl: map['coverUrl'],
        createdAt: map['createdAt'] ?? DateTime.now().toIso8601String(),
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'coverUrl': coverUrl,
        'createdAt': createdAt,
      };
}
