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

  Function(Map<String, dynamic>)? onSyncReceived;
  Function(Map<String, dynamic>)? onPartyStateReceived;

  final ValueNotifier<bool> isConnected = ValueNotifier(false);
  final ValueNotifier<int> memberCount = ValueNotifier(0);

  // ── Connection lifecycle ──────────────────────────────────────────────────

  void connect() {
    final url = ServerConfig.baseUrl;
    if (url.isEmpty) {
      debugPrint('[SyncService] No server URL — skipping connect');
      return;
    }

    // Already connected to the right server — nothing to do
    if (_socket != null && _socket!.connected) {
      debugPrint('[SyncService] Already connected, skipping');
      return;
    }

    // Tear down any stale socket before creating a new one
    _destroySocket();

    debugPrint('[SyncService] Connecting to $url');
    _socket = io.io(
      url,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(2000)
          .disableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('[SyncService] ✓ Connected (${_socket?.id})');
      isConnected.value = true;
      // Re-join party after reconnection
      final pid = currentPartyId.value;
      if (pid != null) {
        debugPrint('[SyncService] Re-joining party $pid after connect');
        _socket!.emit('join_party', pid);
      }
    });

    _socket!.onDisconnect((_) {
      debugPrint('[SyncService] ✗ Disconnected');
      isConnected.value = false;
    });

    _socket!.onConnectError((err) {
      debugPrint('[SyncService] Connect error: $err');
      isConnected.value = false;
    });

    // Playback updates from other room members
    _socket!.on('playback_update', (data) {
      if (data == null) return;
      final map = _toStringMap(data);
      if (map != null) onSyncReceived?.call(map);
    });

    // Initial state snapshot sent when joining a room
    _socket!.on('party_state', (data) {
      if (data == null) return;
      final map = _toStringMap(data);
      if (map != null) onPartyStateReceived?.call(map);
    });

    // Member count updates
    _socket!.on('party_members', (data) {
      final map = _toStringMap(data);
      if (map != null) {
        final count = (map['count'] as num?)?.toInt() ?? 0;
        debugPrint('[SyncService] Party members: $count');
        memberCount.value = count;
      }
    });

    _socket!.connect();
  }

  // ── Party management ──────────────────────────────────────────────────────

  void joinParty(String partyId) {
    currentPartyId.value = partyId;
    memberCount.value = 0;

    // Ensure socket is alive before emitting
    if (_socket == null || !_socket!.connected) {
      connect(); // onConnect handler will emit join_party once connected
      return;
    }
    _socket!.emit('join_party', partyId);
  }

  void leaveParty() {
    final pid = currentPartyId.value;
    if (pid != null && _socket != null && _socket!.connected) {
      _socket!.emit('leave_party', pid);
    }
    currentPartyId.value = null;
    memberCount.value = 0;
  }

  // ── Broadcast ─────────────────────────────────────────────────────────────

  void broadcastPlayback({
    required String action,
    required String trackId,
    required int positionMs,
    Map<String, dynamic>? trackJson,
  }) {
    final pid = currentPartyId.value;
    if (_socket == null || !_socket!.connected || pid == null) return;

    _socket!.emit('sync_playback', {
      'partyId': pid,
      'action': action,
      'trackId': trackId,
      'positionMs': positionMs,
      if (trackJson != null) 'track': trackJson,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// Safely converts dynamic socket data to Map<String, dynamic>.
  static Map<String, dynamic>? _toStringMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) {
      try {
        return Map<String, dynamic>.from(data);
      } catch (_) {}
    }
    return null;
  }

  void _destroySocket() {
    if (_socket == null) return;
    try {
      _socket!.clearListeners();
      _socket!.disconnect();
      _socket!.dispose();
    } catch (e) {
      debugPrint('[SyncService] Error destroying socket: $e');
    }
    _socket = null;
    isConnected.value = false;
  }

  /// Generate a clean 6-char uppercase alphanumeric room code.
  /// Avoids ambiguous characters (0/O, 1/I).
  static String generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final rng = Random.secure();
    return List.generate(6, (_) => chars[rng.nextInt(chars.length)]).join();
  }

  Future<void> copyPartyId() async {
    final id = currentPartyId.value;
    if (id != null) {
      await Clipboard.setData(ClipboardData(text: id));
    }
  }

  void dispose() {
    _destroySocket();
  }
}