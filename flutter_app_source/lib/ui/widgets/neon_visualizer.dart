import 'dart:math' as math;
import 'package:flutter/material.dart';

class NeonVisualizer extends StatefulWidget {
  final Color color;
  final bool isPlaying;
  final bool isScanning;
  final double size;

  const NeonVisualizer({
    super.key,
    required this.color,
    required this.isPlaying,
    this.isScanning = false,
    this.size = 280,
  });

  @override
  State<NeonVisualizer> createState() => _NeonVisualizerState();
}

class _NeonVisualizerState extends State<NeonVisualizer>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  late AnimationController _scanController;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    );

    if (widget.isScanning) {
      _scanController.repeat();
    }

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
    if (widget.isScanning != oldWidget.isScanning) {
      if (widget.isScanning) {
        _scanController.repeat();
      } else {
        _scanController.stop();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scanController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_controller, _scanController]),
      builder: (context, child) {
        return RepaintBoundary(
          child: CustomPaint(
            size: Size(widget.size * 1.5, widget.size * 1.5),
            painter: _NebulaPainter(
              color: widget.color,
              progress: _controller.value,
              scanProgress: _scanController.value,
              isScanning: widget.isScanning,
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
  final double scanProgress;
  final bool isScanning;

  _NebulaPainter({
    required this.color, 
    required this.progress,
    required this.scanProgress,
    required this.isScanning,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.width / 4;

    // Layer 1: Outer soft glow
    final outerPaint = Paint()
      ..color = color.withValues(alpha: 0.08 + (progress * 0.05))
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 40 + (progress * 20));
    canvas.drawCircle(center, baseRadius * (1.8 + progress * 0.4), outerPaint);

    // Layer 2: Middle pulse
    final middlePaint = Paint()
      ..color = color.withValues(alpha: 0.12 + (progress * 0.08))
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 20 + (progress * 10));
    canvas.drawCircle(center, baseRadius * (1.4 + progress * 0.2), middlePaint);

    // Layer 3: Inner core
    final innerPaint = Paint()
      ..color = color.withValues(alpha: 0.2 + (progress * 0.1))
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);
    canvas.drawCircle(center, baseRadius * (1.1 + progress * 0.1), innerPaint);

    // Layer 4: Radar Sweep (only if scanning)
    if (isScanning) {
      final sweepPaint = Paint()
        ..shader = SweepGradient(
          center: Alignment.center,
          startAngle: 0.0,
          endAngle: math.pi * 2,
          colors: [
            color.withValues(alpha: 0.0),
            color.withValues(alpha: 0.1),
            color.withValues(alpha: 0.5),
            color.withValues(alpha: 0.0),
          ],
          stops: const [0.0, 0.4, 0.5, 0.51],
          transform: GradientRotation(scanProgress * 2 * math.pi),
        ).createShader(Rect.fromCircle(center: center, radius: baseRadius * 2));
      
      canvas.drawCircle(center, baseRadius * 1.8, sweepPaint);

      // Radar rings
      final ringPaint = Paint()
        ..color = color.withValues(alpha: 0.1)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0;
      canvas.drawCircle(center, baseRadius * 0.8, ringPaint);
      canvas.drawCircle(center, baseRadius * 1.2, ringPaint);
      canvas.drawCircle(center, baseRadius * 1.6, ringPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _NebulaPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}
