import 'dart:io';
import 'package:flutter/foundation.dart';
import 'storage_service.dart';

/// Manages the base URL for the Next.js server that handles downloads.
class ServerConfig {
  static String _defaultUrl() {
    if (kIsWeb) return ''; // Not applicable
    if (Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }

  static String _cachedUrl = '';

  /// Returns the current server base URL (no trailing slash).
  static String get baseUrl {
    if (_cachedUrl.isNotEmpty) return _cachedUrl;
    return _defaultUrl();
  }

  /// Loads the saved server URL from StorageService.
  static Future<void> init() async {
    try {
      final config = await StorageService().getConfig();
      final saved = config.serverUrl;
      if (saved != null && saved.trim().isNotEmpty) {
        _cachedUrl = saved.trim().replaceAll(RegExp(r'/+$'), '');
      }
    } catch (e) {
      debugPrint('[ServerConfig] Failed to load saved URL: $e');
    }
  }

  /// Persists a new server URL.
  static Future<void> setBaseUrl(String url) async {
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    _cachedUrl = clean;
    try {
      final config = await StorageService().getConfig();
      await StorageService().saveConfig(config.copyWith(serverUrl: clean));
    } catch (e) {
      debugPrint('[ServerConfig] Failed to save URL: $e');
    }
  }

  /// Resets to the platform default.
  static Future<void> reset() async {
    _cachedUrl = '';
    try {
      final config = await StorageService().getConfig();
      await StorageService().saveConfig(config.copyWith(serverUrl: null));
    } catch (e) {
      debugPrint('[ServerConfig] Failed to reset URL: $e');
    }
  }
}
