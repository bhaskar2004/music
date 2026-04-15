import 'dart:math' as math;
import 'package:flutter/material.dart';

class NeonVisualizer extends StatefulWidget {
  final Color color;
  final bool isPlaying;
  final double size;

  const NeonVisualizer({
    super.key,
    required this.color,
    required this.isPlaying,
    this.size = 280,
  });

  @override
  State<NeonVisualizer> createState() => _NeonVisualizerState();
}

class _NeonVisualizerState extends State<NeonVisualizer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    if (!widget.isPlaying) {
      _controller.stop();
    }
  }

  @override
  void didUpdateWidget(NeonVisualizer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isPlaying != oldWidget.isPlaying) {
      if (widget.isPlaying) {
        _controller.repeat(reverse: true);
      } else {
        _controller.animateTo(0.2, duration: const Duration(milliseconds: 1500));
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
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return RepaintBoundary(
          child: CustomPaint(
            size: Size(widget.size * 1.5, widget.size * 1.5),
            painter: _NebulaPainter(
              color: widget.color,
              progress: _controller.value,
            ),
          ),
        );
      },
    );
  }
}

class _NebulaPainter extends CustomPainter {
  final Color color;
  final double progress;

  _NebulaPainter({required this.color, required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.width / 4;

    // Layer 1: Outer soft glow
    final outerPaint = Paint()
      ..color = color.withOpacity(0.08 + (progress * 0.05))
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 40 + (progress * 20));
    canvas.drawCircle(center, baseRadius * (1.8 + progress * 0.4), outerPaint);

    // Layer 2: Middle pulse
    final middlePaint = Paint()
      ..color = color.withOpacity(0.12 + (progress * 0.08))
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 20 + (progress * 10));
    canvas.drawCircle(center, baseRadius * (1.4 + progress * 0.2), middlePaint);

    // Layer 3: Inner core
    final innerPaint = Paint()
      ..color = color.withOpacity(0.2 + (progress * 0.1))
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 10);
    canvas.drawCircle(center, baseRadius * (1.1 + progress * 0.1), innerPaint);
  }

  @override
  bool shouldRepaint(covariant _NebulaPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}
