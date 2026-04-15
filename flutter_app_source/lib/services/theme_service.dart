import 'package:flutter/material.dart';
import 'package:palette_generator/palette_generator.dart';
import 'dart:io';

class ThemeService {
  static final ThemeService _instance = ThemeService._internal();
  factory ThemeService() => _instance;
  ThemeService._internal();

  /// Extracts the dominant vibrant color from an image URL or local path.
  Future<Color?> extractAccentColor(String? imageUrl) async {
    if (imageUrl == null || imageUrl.isEmpty) return null;

    try {
      ImageProvider? provider;
      if (imageUrl.startsWith('http')) {
        provider = NetworkImage(imageUrl);
      } else if (File(imageUrl).existsSync()) {
        provider = FileImage(File(imageUrl));
      }

      if (provider == null) return null;

      final palette = await PaletteGenerator.fromImageProvider(
        provider,
        maximumColorCount: 20,
      );

      return palette.vibrantColor?.color ?? 
             palette.dominantColor?.color ?? 
             palette.lightVibrantColor?.color;
    } catch (e) {
      debugPrint('[ThemeService] Color extraction error: $e');
      return null;
    }
  }
}
