import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/audio_service.dart';
import '../../models/track.dart';
import '../widgets/track_tile.dart';

class QueueView extends StatelessWidget {
  const QueueView({super.key});

  @override
  Widget build(BuildContext context) {
    final audioService = Provider.of<AudioService>(context);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Playback Queue'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ValueListenableBuilder<List<Track>>(
        valueListenable: audioService.queueNotifier,
        builder: (context, queue, child) {
          if (queue.isEmpty) {
            return const Center(child: Text("Queue is empty", style: TextStyle(color: Colors.white54)));
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 20, 20, 10),
                child: Text(
                  'Now Playing',
                  style: TextStyle(color: Color(0xFF06C167), fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.0),
                ),
              ),
              ValueListenableBuilder<Track?>(
                valueListenable: audioService.currentTrack,
                builder: (context, current, _) {
                  if (current == null) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: TrackTile(track: current),
                  );
                },
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 32, 20, 16),
                child: Text(
                  'Next in Queue',
                  style: TextStyle(color: Colors.white54, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.0),
                ),
              ),
              Expanded(
                child: ReorderableListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 40),
                  itemCount: queue.length,
                  itemBuilder: (context, index) {
                    final track = queue[index];
                    return Padding(
                      key: ValueKey(track.id + index.toString()),
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Opacity(
                        opacity: track.id == audioService.currentTrack.value?.id ? 0.3 : 1.0,
                        child: TrackTile(track: track),
                      ),
                    );
                  },
                  onReorder: (oldIndex, newIndex) {
                    audioService.reorderQueue(oldIndex, newIndex);
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
