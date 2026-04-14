import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'storage_service.dart';

/// Manages the base URL for the Next.js server that handles downloads.
class ServerConfig {
  /// GitHub raw URL where the tunnel script publishes the current URL.
  /// This is fetched on startup so the app auto-discovers the server.
  static const _tunnelDiscoveryUrl =
      'https://api.github.com/repos/bhaskar2004/music/contents/tunnel-url.txt';

  static String _cachedUrl = '';

  /// Returns the current server base URL (no trailing slash).
  static String get baseUrl {
    return _cachedUrl;
  }

  /// Loads the saved server URL from StorageService,
  /// then tries to auto-discover the latest tunnel URL from GitHub.
  static Future<void> init() async {
    // 1. Load saved URL first
    try {
      final config = await StorageService().getConfig();
      final saved = config.serverUrl;
      if (saved != null && saved.trim().isNotEmpty) {
        _cachedUrl = saved.trim().replaceAll(RegExp(r'/+$'), '');
      }
    } catch (e) {
      debugPrint('[ServerConfig] Failed to load saved URL: $e');
    }

    // 2. Try to fetch the latest tunnel URL from GitHub
    await _fetchTunnelUrl();
  }

  /// Fetches the current tunnel URL published to GitHub by start-tunnel.sh.
  /// If successful, saves it so future lookups are instant.
  static Future<void> _fetchTunnelUrl() async {
    try {
      debugPrint('[ServerConfig] Fetching tunnel URL from GitHub...');
      final client = HttpClient()
        ..connectionTimeout = const Duration(seconds: 5);
      final request = await client.getUrl(Uri.parse(_tunnelDiscoveryUrl));
      // Accept JSON from GitHub API
      request.headers.set('Accept', 'application/vnd.github.v3+json');
      request.headers.set('User-Agent', 'WavelengthApp');
      final response = await request.close();

      if (response.statusCode == 200) {
        final body = await response.transform(utf8.decoder).join();
        final json = jsonDecode(body) as Map<String, dynamic>;
        // GitHub API returns file content base64-encoded
        final content = utf8.decode(base64.decode(
          (json['content'] as String).replaceAll('\n', ''),
        ));
        final url = content.trim().replaceAll(RegExp(r'/+$'), '');

        if (url.startsWith('https://') && url.contains('trycloudflare.com')) {
          debugPrint('[ServerConfig] ✓ Got tunnel URL: $url');
          // Only update if it's different from what we have
          if (_cachedUrl != url) {
            _cachedUrl = url;
            await _saveUrl(url);
          }
        }
      } else {
        debugPrint('[ServerConfig] GitHub returned ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[ServerConfig] Could not fetch tunnel URL: $e');
      // Not fatal — we fall back to saved URL or manual entry
    }
  }

  /// Persists a new server URL.
  static Future<void> setBaseUrl(String url) async {
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    _cachedUrl = clean;
    await _saveUrl(clean);
  }

  static Future<void> _saveUrl(String url) async {
    try {
      final config = await StorageService().getConfig();
      await StorageService().saveConfig(config.copyWith(serverUrl: url));
    } catch (e) {
      debugPrint('[ServerConfig] Failed to save URL: $e');
    }
  }

  /// Resets to the platform default (empty — triggers auto-discovery).
  static Future<void> reset() async {
    _cachedUrl = '';
    try {
      final config = await StorageService().getConfig();
      await StorageService().saveConfig(config.copyWith(serverUrl: null));
    } catch (e) {
      debugPrint('[ServerConfig] Failed to reset URL: $e');
    }
  }

  /// Force re-fetches the tunnel URL from GitHub.
  /// Call this from a "Retry" or "Refresh" button.
  static Future<bool> refreshTunnelUrl() async {
    await _fetchTunnelUrl();
    return _cachedUrl.isNotEmpty;
  }
}
