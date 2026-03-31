import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'server_config.dart';

/// Automatically discovers the Wavelength server on the local network.
///
/// Strategy (in order):
///   1. Try the previously-saved URL
///   2. Try emulator/simulator defaults (10.0.2.2 / localhost)
///   3. Scan the device's local subnet on port 3000
///
/// The server is identified by `GET /api/ping` returning `{ "service": "wavelength" }`.
class ServerDiscovery {
  static final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 2),
    receiveTimeout: const Duration(seconds: 2),
  ));

  /// Tries to discover the server. Returns the working base URL or null.
  static Future<String?> discover() async {
    debugPrint('[Discovery] Starting server discovery…');

    // ── 1. Try saved URL first ─────────────────────────────────────────────
    final saved = ServerConfig.baseUrl;
    if (saved.isNotEmpty) {
      debugPrint('[Discovery] Trying saved URL: $saved');
      if (await _ping(saved)) {
        debugPrint('[Discovery] ✓ Saved URL works: $saved');
        return saved;
      }
    }

    // ── 2. Try well-known defaults ─────────────────────────────────────────
    final defaults = <String>[
      if (Platform.isAndroid) 'http://10.0.2.2:3000', // Android emulator
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];

    for (final url in defaults) {
      if (url == saved) continue; // Already tried
      debugPrint('[Discovery] Trying default: $url');
      if (await _ping(url)) {
        debugPrint('[Discovery] ✓ Found server at default: $url');
        await ServerConfig.setBaseUrl(url);
        return url;
      }
    }

    // ── 3. Scan local subnet ───────────────────────────────────────────────
    final deviceIp = await _getDeviceIp();
    if (deviceIp != null) {
      debugPrint('[Discovery] Device IP: $deviceIp — scanning subnet…');
      final subnet = deviceIp.substring(0, deviceIp.lastIndexOf('.'));

      // Scan common IPs in parallel (batches of 20 to avoid socket exhaustion)
      for (int batch = 1; batch <= 255; batch += 20) {
        final futures = <Future<String?>>[];
        final end = (batch + 19).clamp(1, 255);

        for (int i = batch; i <= end; i++) {
          final ip = '$subnet.$i';
          final url = 'http://$ip:3000';
          futures.add(_tryPing(url));
        }

        final results = await Future.wait(futures);
        final found = results.firstWhere((r) => r != null, orElse: () => null);
        if (found != null) {
          debugPrint('[Discovery] ✓ Found server via subnet scan: $found');
          await ServerConfig.setBaseUrl(found);
          return found;
        }
      }
    }

    debugPrint('[Discovery] ✗ No server found');
    return null;
  }

  /// Pings a URL and returns true if it's a Wavelength server.
  static Future<bool> _ping(String baseUrl) async {
    try {
      final response = await _dio.get('$baseUrl/api/ping');
      if (response.statusCode == 200 && response.data is Map) {
        return response.data['service'] == 'wavelength';
      }
    } catch (_) {}
    return false;
  }

  /// Tries to ping a URL. Returns the URL if successful, null otherwise.
  static Future<String?> _tryPing(String baseUrl) async {
    final ok = await _ping(baseUrl);
    return ok ? baseUrl : null;
  }

  /// Gets the device's local IP address on the Wi-Fi interface.
  static Future<String?> _getDeviceIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4,
        includeLinkLocal: false,
      );

      for (final iface in interfaces) {
        // Skip loopback and docker/virtual interfaces
        if (iface.name.contains('lo') || iface.name.contains('docker')) {
          continue;
        }
        for (final addr in iface.addresses) {
          if (addr.address.startsWith('192.168.') ||
              addr.address.startsWith('10.') ||
              addr.address.startsWith('172.')) {
            return addr.address;
          }
        }
      }
    } catch (e) {
      debugPrint('[Discovery] Failed to get device IP: $e');
    }
    return null;
  }
}
