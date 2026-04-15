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
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    final current = SyncService().currentPartyId.value;
    if (current != null) {
      _partyIdCtrl.text = current;
    }
    // Listen for member count changes
    SyncService().memberCount.addListener(_onMemberCountChanged);
  }

  void _onMemberCountChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _partyIdCtrl.dispose();
    SyncService().memberCount.removeListener(_onMemberCountChanged);
    super.dispose();
  }

  void _join() {
    final pid = _partyIdCtrl.text.trim().toUpperCase();
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

  void _createAndJoin() {
    final code = SyncService.generateRoomCode();
    _partyIdCtrl.text = code;
    SyncService().joinParty(code);
    setState(() {}); // Refresh UI
  }

  Future<void> _copyCode() async {
    await SyncService().copyPartyId();
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final current = SyncService().currentPartyId.value;
    final members = SyncService().memberCount.value;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF06C167).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.groups_rounded, color: Color(0xFF06C167), size: 20),
          ),
          const SizedBox(width: 12),
          const Text('Listen Together',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (current != null) ...[
            // ─── In a party ──────────────────────────────────────────
            const Text(
              'Share this code with friends to sync playback.',
              style: TextStyle(color: Colors.black54, fontSize: 14),
            ),
            const SizedBox(height: 20),

            // Party Code
            Container(
              padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF06C167).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFF06C167).withValues(alpha: 0.3),
                  style: BorderStyle.solid,
                ),
              ),
              child: Column(
                children: [
                  Text(
                    current,
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF06C167),
                      letterSpacing: 6,
                    ),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: _copyCode,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(color: const Color(0xFFE8E8E8)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _copied ? Icons.check_circle_rounded : Icons.copy_rounded,
                            size: 16,
                            color: _copied ? const Color(0xFF06C167) : Colors.black54,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _copied ? 'Copied!' : 'Copy Code',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: _copied ? const Color(0xFF06C167) : Colors.black87,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Member count
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: members > 0 ? const Color(0xFF22C55E) : const Color(0xFFBBBBBB),
                      boxShadow: members > 0
                          ? [BoxShadow(color: const Color(0xFF22C55E).withValues(alpha: 0.4), blurRadius: 6)]
                          : null,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    members > 0
                        ? '$members ${members == 1 ? 'listener' : 'listeners'} connected'
                        : 'Connecting...',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            // ─── Not in a party ──────────────────────────────────────
            const Text(
              'Create or join a listening party to sync playback with friends.',
              style: TextStyle(color: Colors.black54, fontSize: 14),
            ),
            const SizedBox(height: 20),

            // Host button
            GestureDetector(
              onTap: _createAndJoin,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF06C167),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF06C167).withValues(alpha: 0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Center(
                  child: Text(
                    'Host New Party',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Divider
            Row(
              children: [
                const Expanded(child: Divider(color: Color(0xFFE8E8E8))),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    'OR JOIN',
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
                const Expanded(child: Divider(color: Color(0xFFE8E8E8))),
              ],
            ),
            const SizedBox(height: 20),

            // Join code input
            TextField(
              controller: _partyIdCtrl,
              textCapitalization: TextCapitalization.characters,
              textAlign: TextAlign.center,
              maxLength: 6,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                letterSpacing: 4,
              ),
              decoration: InputDecoration(
                labelText: 'Party Code',
                labelStyle: const TextStyle(color: Colors.black54),
                counterText: '',
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF06C167), width: 2),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE8E8E8)),
                ),
              ),
            ),
          ],
        ],
      ),
      actions: [
        if (current != null)
          TextButton(
            onPressed: _leave,
            child: const Text('Leave', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
          ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close', style: TextStyle(color: Colors.black54)),
        ),
        if (current == null)
          ElevatedButton(
            onPressed: _join,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF06C167),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('Join', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
      ],
    );
  }
}
