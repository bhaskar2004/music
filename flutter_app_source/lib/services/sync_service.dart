import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'server_config.dart';

class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  io.Socket? _socket;
  final ValueNotifier<String?> currentPartyId = ValueNotifier<String?>(null);

  // Listeners for incoming sync events
  Function(Map<String, dynamic>)? onSyncReceived;

  // Called when initial room state is received on join
  Function(Map<String, dynamic>)? onPartyStateReceived;

  ValueNotifier<bool> isConnected = ValueNotifier(false);
  ValueNotifier<int> memberCount = ValueNotifier(0);

  void connect() {
    if (_socket != null && _socket!.connected) return;

    final url = ServerConfig.baseUrl;
    if (url.isEmpty) return;

    debugPrint('[SyncService] Connecting to WebSocket at $url');
    _socket = io.io(url, io.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .build()
    );

    _socket!.onConnect((_) {
      debugPrint('[SyncService] ✓ Connected to server');
      isConnected.value = true;
      if (currentPartyId.value != null) {
        _socket!.emit('join_party', currentPartyId.value);
      }
    });

    _socket!.onDisconnect((_) {
      debugPrint('[SyncService] ✗ Disconnected');
      isConnected.value = false;
    });

    // ─── Playback updates from other users ─────────────────────────────
    _socket!.on('playback_update', (data) {
      debugPrint('[SyncService] Received sync event: $data');
      if (onSyncReceived != null) {
        onSyncReceived!(data as Map<String, dynamic>);
      }
    });

    // ─── Initial state sync on join ────────────────────────────────────
    _socket!.on('party_state', (data) {
      debugPrint('[SyncService] Received party state on join: $data');
      if (onPartyStateReceived != null) {
        onPartyStateReceived!(data as Map<String, dynamic>);
      }
    });

    // ─── Member count updates ──────────────────────────────────────────
    _socket!.on('party_members', (data) {
      if (data is Map<String, dynamic>) {
        final count = data['count'] as int? ?? 0;
        debugPrint('[SyncService] Party members: $count');
        memberCount.value = count;
      }
    });

    _socket!.connect();
  }

  void joinParty(String partyId) {
    if (_socket == null || !_socket!.connected) connect();
    currentPartyId.value = partyId;
    memberCount.value = 0; // Reset until we get the real count
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join_party', partyId);
    }
  }

  void leaveParty() {
    if (currentPartyId.value != null && _socket != null && _socket!.connected) {
      _socket!.emit('leave_party', currentPartyId.value);
    }
    currentPartyId.value = null;
    memberCount.value = 0;
  }

  void broadcastPlayback({
    required String action, // 'play', 'pause', 'seek', 'change_track'
    required String trackId,
    required int positionMs,
    Map<String, dynamic>? trackJson,
  }) {
    if (_socket == null || !_socket!.connected || currentPartyId.value == null) return;

    _socket!.emit('sync_playback', {
      'partyId': currentPartyId.value,
      'action': action,
      'trackId': trackId,
      'positionMs': positionMs,
      if (trackJson != null) 'track': trackJson,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
  }

  /// Generate a clean 6-char uppercase alphanumeric room code.
  /// Avoids ambiguous characters (0/O, 1/I).
  static String generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final rng = Random.secure();
    return List.generate(6, (_) => chars[rng.nextInt(chars.length)]).join();
  }

  /// Copy the current party ID to clipboard.
  Future<void> copyPartyId() async {
    final id = currentPartyId.value;
    if (id != null) {
      await Clipboard.setData(ClipboardData(text: id));
    }
  }

  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
