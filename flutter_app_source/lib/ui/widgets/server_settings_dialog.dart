import 'dart:io';
import 'package:flutter/material.dart';
import '../../services/server_config.dart';
import '../../services/server_discovery.dart';

class ServerSettingsDialog extends StatefulWidget {
  const ServerSettingsDialog({super.key});

  static Future<void> show(BuildContext context) async {
    return showDialog(
      context: context,
      builder: (context) => const ServerSettingsDialog(),
    );
  }

  @override
  State<ServerSettingsDialog> createState() => _ServerSettingsDialogState();
}

class _ServerSettingsDialogState extends State<ServerSettingsDialog> {
  final _urlCtrl = TextEditingController();
  bool _isTesting = false;
  bool _isScanning = false;
  String? _statusMessage;
  bool _isSuccess = false;

  @override
  void initState() {
    super.initState();
    _urlCtrl.text = ServerConfig.baseUrl;
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    final url = _urlCtrl.text.trim();
    if (url.isEmpty) {
      setState(() {
        _statusMessage = 'Please enter a URL';
        _isSuccess = false;
      });
      return;
    }

    setState(() {
      _isTesting = true;
      _statusMessage = 'Testing connection…';
    });

    // Check if the URL matches the expected pattern (or just try pinging)
    String cleanUrl = url.replaceAll(RegExp(r'/+$'), '');
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'http://$cleanUrl';
    }

    // Ping the server (using the private _ping method via a public wrapper if available,
    // or just using ServerDiscovery.discover-like logic locally)
    // Here we'll use a local ping check.
    final ok = await _ping(cleanUrl);

    if (mounted) {
      setState(() {
        _isTesting = false;
        if (ok) {
          _statusMessage = '✓ Connected successfully!';
          _isSuccess = true;
          ServerConfig.setBaseUrl(cleanUrl);
        } else {
          _statusMessage = '✗ Failed to connect. Check IP/Port.';
          _isSuccess = false;
        }
      });
    }
  }

  Future<void> _scanNetwork() async {
    setState(() {
      _isScanning = true;
      _statusMessage = 'Scanning local network…';
    });

    final result = await ServerDiscovery.discover();

    if (mounted) {
      setState(() {
        _isScanning = false;
        if (result != null) {
          _urlCtrl.text = result;
          _statusMessage = '✓ Server found!';
          _isSuccess = true;
        } else {
          _statusMessage = '✗ No server found on network.';
          _isSuccess = false;
        }
      });
    }
  }

  // Local helper to ping (similar to ServerDiscovery internal)
  Future<bool> _ping(String url) async {
    try {
      // We can't access ServerDiscovery._ping directly as it's private.
      // But we can trigger a ping via an HTTP request.
      // Since we don't want to add more dependencies, we use HttpClient.
      final client = HttpClient()..connectionTimeout = const Duration(seconds: 3);
      final request = await client.getUrl(Uri.parse('$url/api/ping'));
      final response = await request.close();
      if (response.statusCode == 200) {
        // Just checking status code for simplicity in the UI test,
        // though full discovery checks for the 'wavelength' key.
        return true;
      }
    } catch (_) {}
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF111111),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Server Settings',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 20,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Specify the Next.js server address for downloads.',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.6),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 20),

            // URL Input
            TextField(
              controller: _urlCtrl,
              style: const TextStyle(fontSize: 14),
              decoration: InputDecoration(
                labelText: 'Server URL',
                hintText: 'e.g. http://192.168.1.10:3000',
                filled: true,
                fillColor: const Color(0xFF1A1A1A),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.refresh_rounded, size: 20),
                  onPressed: _isScanning ? null : _scanNetwork,
                  tooltip: 'Scan Network',
                ),
              ),
            ),

            if (_statusMessage != null) ...[
              const SizedBox(height: 12),
              Text(
                _statusMessage!,
                style: TextStyle(
                  color: _isSuccess ? const Color(0xFF06C167) : Colors.redAccent,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Actions
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isTesting ? null : _testConnection,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF06C167),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isTesting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : const Text('Connect',
                            style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
