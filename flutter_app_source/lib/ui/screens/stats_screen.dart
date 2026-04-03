import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/app_state.dart';
import '../../services/stats_service.dart';
import '../../services/storage_service.dart';
import '../../models/track.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({super.key});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  bool _isLoading = true;
  int _todayTime = 0;
  int _totalTime = 0;
  Map<String, int> _activity = {};
  List<MapEntry<String, int>> _topTracks = [];
  List<MapEntry<String, int>> _topArtists = [];

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    final appState = Provider.of<AppState>(context, listen: false);
    final history = await StorageService().getHistory();
    final stats = StatsService();
    final today = await stats.getTodayListenTime(history);
    final total = await stats.getTotalListenTime(history);
    final activity = await stats.getLast7DaysActivity(history);
    final topTracks = await stats.getTopTracks(history);
    final topArtists = await stats.getTopArtists(history, appState.library);

    if (mounted) {
      setState(() {
        _todayTime = today;
        _totalTime = total;
        _activity = activity;
        _topTracks = topTracks;
        _topArtists = topArtists;
        _isLoading = false;
      });
    }
  }

  String _formatDuration(int seconds) {
    if (seconds < 60) return '${seconds}s';
    if (seconds < 3600) return '${(seconds / 60).toStringAsFixed(1)}m';
    return '${(seconds / 3600).toStringAsFixed(1)}h';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: const Text('Statistics', 
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 24)),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSummaryCards(),
                  const SizedBox(height: 32),
                  const Text('Activity', 
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  _buildActivityChart(),
                  const SizedBox(height: 32),
                  _buildTopSection('Top Tracks', _topTracks, isTrack: true),
                  const SizedBox(height: 32),
                  _buildTopSection('Top Artists', _topArtists, isTrack: false),
                  const SizedBox(height: 100), // Space for NowPlayingBar
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    return Row(
      children: [
        _buildStatCard('Today', _formatDuration(_todayTime), Icons.today),
        const SizedBox(width: 16),
        _buildStatCard('Total', _formatDuration(_totalTime), Icons.all_inclusive),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Colors.blueAccent, size: 28),
            const SizedBox(height: 16),
            Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityChart() {
    final days = _activity.keys.toList().reversed.toList();
    final maxTime = _activity.values.fold(1, (max, v) => v > max ? v : max);

    return Container(
      height: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(20),
      ),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxTime.toDouble() * 1.2,
          barTouchData: BarTouchData(enabled: true),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  if (value.toInt() >= days.length) return const Text('');
                  final date = DateTime.parse(days[value.toInt()]);
                  final labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                  return Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(labels[date.weekday - 1], style: const TextStyle(color: Colors.grey, fontSize: 10)),
                  );
                },
              ),
            ),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          barGroups: List.generate(days.length, (i) {
            return BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: _activity[days[i]]!.toDouble(),
                  color: Colors.blueAccent,
                  width: 16,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                )
              ],
            );
          }),
        ),
      ),
    );
  }

  Widget _buildTopSection(String title, List<MapEntry<String, int>> data, {required bool isTrack}) {
    if (data.isEmpty) return const SizedBox.shrink();
    
    final appState = Provider.of<AppState>(context, listen: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        ...data.map((e) {
          String name = e.key;
          String sub = '${e.value} plays';
          String? imageUrl;

          if (isTrack) {
            final track = appState.library.cast<Track?>().firstWhere((t) => t?.id == e.key, orElse: () => null);
            name = track?.title ?? 'Unknown Track';
            sub = '${track?.artist ?? 'Unknown Artist'} • ${e.value} plays';
            imageUrl = track?.coverUrl;
          }

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                if (imageUrl != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(imageUrl, width: 48, height: 48, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(color: Colors.grey[800], width: 48, height: 48),
                    ),
                  )
                else
                  Container(
                    width: 48, height: 48, 
                    decoration: BoxDecoration(color: Colors.blueAccent.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.person, color: Colors.blueAccent),
                  ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16), maxLines: 1, overflow: TextOverflow.ellipsis),
                      Text(sub, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
