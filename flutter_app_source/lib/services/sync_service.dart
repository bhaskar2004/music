import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'server_config.dart';

class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  io.Socket? _socket;
  String? currentPartyId;

  // Listeners for incoming sync events
  Function(Map<String, dynamic>)? onSyncReceived;

  ValueNotifier<bool> isConnected = ValueNotifier(false);

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
      if (currentPartyId != null) {
        _socket!.emit('join_party', currentPartyId);
      }
    });

    _socket!.onDisconnect((_) {
      debugPrint('[SyncService] ✗ Disconnected');
      isConnected.value = false;
    });

    _socket!.on('playback_update', (data) {
      debugPrint('[SyncService] Received sync event: $data');
      if (onSyncReceived != null) {
        onSyncReceived!(data as Map<String, dynamic>);
      }
    });

    _socket!.connect();
  }

  void joinParty(String partyId) {
    if (_socket == null || !_socket!.connected) connect();
    currentPartyId = partyId;
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join_party', partyId);
    }
  }

  void leaveParty() {
    if (currentPartyId != null && _socket != null && _socket!.connected) {
      _socket!.emit('leave_party', currentPartyId);
    }
    currentPartyId = null;
  }

  void broadcastPlayback({
    required String action, // 'play', 'pause', 'seek', 'change_track'
    required String trackId,
    required int positionMs,
  }) {
    if (_socket == null || !_socket!.connected || currentPartyId == null) return;

    _socket!.emit('sync_playback', {
      'partyId': currentPartyId,
      'action': action,
      'trackId': trackId,
      'positionMs': positionMs,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
  }

  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
