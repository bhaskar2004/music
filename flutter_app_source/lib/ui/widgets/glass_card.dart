import 'dart:ui';
import 'package:flutter/material.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final double blur;
  final double opacity;
  final EdgeInsets padding;
  final Color? borderColor;

  const GlassCard({
    super.key,
    required this.child,
    this.borderRadius = 24.0,
    this.blur = 30.0,
    this.opacity = 0.65,
    this.padding = const EdgeInsets.all(22.0),
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark 
        ? Colors.black.withOpacity(opacity) 
        : Colors.white.withOpacity(opacity);

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: borderColor ?? (isDark 
                  ? Colors.white.withOpacity(0.08) 
                  : Colors.black.withOpacity(0.07)),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}
