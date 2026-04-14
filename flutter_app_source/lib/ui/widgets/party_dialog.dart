import 'package:flutter/material.dart';
import '../../services/sync_service.dart';

class PartyDialog extends StatefulWidget {
  const PartyDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (ctx) => const PartyDialog(),
    );
  }

  @override
  State<PartyDialog> createState() => _PartyDialogState();
}

class _PartyDialogState extends State<PartyDialog> {
  final TextEditingController _partyIdCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    final current = SyncService().currentPartyId.value;
    if (current != null) {
      _partyIdCtrl.text = current;
    }
  }

  @override
  void dispose() {
    _partyIdCtrl.dispose();
    super.dispose();
  }

  void _join() {
    final pid = _partyIdCtrl.text.trim();
    if (pid.isNotEmpty) {
      SyncService().joinParty(pid);
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Joined Party: $pid'),
          backgroundColor: const Color(0xFF06C167),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _leave() {
    SyncService().leaveParty();
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Left Party'),
        backgroundColor: Colors.black87,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _createRandom() {
    final randomId = DateTime.now().millisecondsSinceEpoch.toString().substring(7);
    _partyIdCtrl.text = 'ROOM-$randomId';
  }

  @override
  Widget build(BuildContext context) {
    final current = SyncService().currentPartyId.value;
    
    return AlertDialog(
      title: const Text('Listen Together', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Create or join a listening party to sync playback with friends.',
            style: TextStyle(color: Colors.black54, fontSize: 14)),
          const SizedBox(height: 20),
          TextField(
            controller: _partyIdCtrl,
            decoration: InputDecoration(
              labelText: 'Party ID',
              labelStyle: const TextStyle(color: Colors.black54),
              focusedBorder: const OutlineInputBorder(
                borderSide: BorderSide(color: Color(0xFF06C167), width: 2),
              ),
              enabledBorder: const OutlineInputBorder(
                borderSide: BorderSide(color: Color(0xFFE8E8E8)),
              ),
              suffixIcon: IconButton(
                icon: const Icon(Icons.casino_rounded, color: Colors.black54),
                onPressed: _createRandom,
                tooltip: 'Generate Random ID',
              ),
            ),
          ),
          if (current != null) ...[
            const SizedBox(height: 16),
            Text('Currently in party: $current',
              style: const TextStyle(color: Color(0xFF06C167), fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ],
      ),
      actions: [
        if (current != null)
          TextButton(
            onPressed: _leave,
            child: const Text('Leave', style: TextStyle(color: Colors.red)),
          ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: Colors.black54)),
        ),
        ElevatedButton(
          onPressed: _join,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF06C167),
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: Text(current != null ? 'Switch' : 'Join'),
        ),
      ],
    );
  }
}
