import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class VinylRecord extends StatefulWidget {
  final String? coverUrl;
  final bool isPlaying;
  final double size;

  const VinylRecord({
    super.key,
    required this.coverUrl,
    required this.isPlaying,
    this.size = 280,
  });

  @override
  State<VinylRecord> createState() => _VinylRecordState();
}

class _VinylRecordState extends State<VinylRecord>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    );

    if (widget.isPlaying) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(VinylRecord oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isPlaying != oldWidget.isPlaying) {
      if (widget.isPlaying) {
        _controller.repeat();
      } else {
        _controller.stop();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.rotate(
            angle: _controller.value * 2 * math.pi,
            child: child,
          );
        },
        child: Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.4),
                blurRadius: 40,
                spreadRadius: 2,
                offset: const Offset(0, 20),
              ),
            ],
            // Vinyl texture with sweep gradient to simulate reflections
            gradient: SweepGradient(
              center: Alignment.center,
              colors: [
                const Color(0xFF111111),
                context.watch<AppState>().currentAccentColor.withOpacity(0.05),
                const Color(0xFF111111),
                const Color(0xFF222222),
                const Color(0xFF111111),
                context.watch<AppState>().currentAccentColor.withOpacity(0.03),
                const Color(0xFF111111),
              ],
              stops: const [0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 1.0],
            ),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Vinyl Grooves effect (circles)
              ...List.generate(5, (index) {
                final double inset = 10.0 + (index * 15.0);
                return Container(
                  margin: EdgeInsets.all(inset),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withOpacity(0.03),
                      width: 0.5,
                    ),
                  ),
                );
              }),

              // Album Art Cutout
              Container(
                width: widget.size * 0.42,
                height: widget.size * 0.42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF2A2A2A),
                  border: Border.all(color: Colors.black.withOpacity(0.8), width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.5),
                      blurRadius: 10,
                      offset: const Offset(0, 0),
                    ),
                  ],
                ),
                child: ClipOval(
                  child: _buildImage(),
                ),
              ),

              // Spindle Hole
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF0A0A0A),
                  border: Border.all(color: Colors.white.withOpacity(0.12), width: 1.5),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImage() {
    if (widget.coverUrl == null) {
      return const Center(child: Icon(Icons.music_note_rounded, color: Colors.white12, size: 40));
    }

    if (!widget.coverUrl!.startsWith('http')) {
      return Image.file(
        File(widget.coverUrl!),
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => const Icon(Icons.music_note_rounded, color: Colors.white12),
      );
    }

    return CachedNetworkImage(
      imageUrl: widget.coverUrl!,
      fit: BoxFit.cover,
      placeholder: (context, url) => Container(color: const Color(0xFF2A2A2A)),
      errorWidget: (context, url, error) => const Icon(Icons.music_note_rounded, color: Colors.white12),
    );
  }
}
