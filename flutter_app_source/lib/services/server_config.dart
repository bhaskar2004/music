import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Manages the base URL for the Next.js server that handles downloads.
///
/// Defaults:
///   Android emulator  → http://10.0.2.2:3000  (maps to host machine)
///   iOS simulator     → http://localhost:3000
///   Physical device   → must be configured via settings
class ServerConfig {
  static const _prefsKey = 'wavelength_server_url';

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

  /// Loads the saved server URL from SharedPreferences.
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefsKey);
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
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, clean);
    } catch (e) {
      debugPrint('[ServerConfig] Failed to save URL: $e');
    }
  }

  /// Resets to the platform default.
  static Future<void> reset() async {
    _cachedUrl = '';
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefsKey);
    } catch (e) {
      debugPrint('[ServerConfig] Failed to reset URL: $e');
    }
  }
}
