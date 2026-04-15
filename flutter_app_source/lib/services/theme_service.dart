import 'package:flutter/material.dart';
import 'package:palette_generator/palette_generator.dart';
import 'dart:io';

class ThemeService {
  static final ThemeService _instance = ThemeService._internal();
  factory ThemeService() => _instance;
  ThemeService._internal();

  static final Map<String, Color> _accentCache = {};

  /// Extracts the dominant vibrant color from an image URL or local path.
  Future<Color?> extractAccentColor(String? imageUrl) async {
    if (imageUrl == null || imageUrl.isEmpty) return null;
    if (_accentCache.containsKey(imageUrl)) return _accentCache[imageUrl];

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
        maximumColorCount: 16,
      );

      final color = palette.vibrantColor?.color ?? 
                   palette.dominantColor?.color ?? 
                   palette.lightVibrantColor?.color;

      if (color != null) _accentCache[imageUrl] = color;
      return color;
    } catch (e) {
      debugPrint('[ThemeService] Color extraction error: $e');
      return null;
    }
  }
}
