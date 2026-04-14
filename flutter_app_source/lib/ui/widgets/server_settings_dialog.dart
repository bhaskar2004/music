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

  static const _accent = Color(0xFF06C167);

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

    String cleanUrl = url.replaceAll(RegExp(r'/+$'), '');
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'http://$cleanUrl';
    }

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

  Future<bool> _ping(String url) async {
    try {
      final client = HttpClient()..connectionTimeout = const Duration(seconds: 3);
      final request = await client.getUrl(Uri.parse('$url/api/ping'));
      final response = await request.close();
      if (response.statusCode == 200) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
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
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Specify the Next.js server address for downloads.',
              style: TextStyle(
                color: Colors.black.withValues(alpha: 0.5),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 20),

            // URL Input
            TextField(
              controller: _urlCtrl,
              style: const TextStyle(fontSize: 14, color: Colors.black87),
              decoration: InputDecoration(
                labelText: 'Server URL',
                labelStyle: const TextStyle(color: Color(0xFF888888)),
                hintText: 'e.g. http://192.168.1.10:3000',
                hintStyle: const TextStyle(color: Color(0xFFBBBBBB)),
                filled: true,
                fillColor: const Color(0xFFF5F5F5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: _accent),
                ),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.refresh_rounded, size: 20, color: Color(0xFF888888)),
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
                  color: _isSuccess ? _accent : Colors.redAccent,
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
                    style: TextButton.styleFrom(foregroundColor: const Color(0xFF888888)),
                    child: const Text('Close'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isTesting ? null : _testConnection,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _accent,
                      foregroundColor: Colors.white,
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
                              color: Colors.white,
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
