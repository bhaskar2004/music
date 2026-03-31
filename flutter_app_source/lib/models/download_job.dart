import 'track.dart';

enum DownloadStatus { pending, fetchingMeta, downloading, done, error }

class DownloadJob {
  final String id;
  final String url;
  DownloadStatus status;
  double progress; // 0.0 – 1.0
  String? title;
  String? artist;
  String? coverUrl;
  String? error;
  String? playlistId;
  Track? completedTrack;
  final DateTime startedAt;

  DownloadJob({
    required this.id,
    required this.url,
    this.status = DownloadStatus.pending,
    this.progress = 0,
    this.title,
    this.artist,
    this.coverUrl,
    this.error,
    this.playlistId,
    this.completedTrack,
    required this.startedAt,
  });

  bool get isActive =>
      status == DownloadStatus.pending ||
      status == DownloadStatus.fetchingMeta ||
      status == DownloadStatus.downloading;
}
