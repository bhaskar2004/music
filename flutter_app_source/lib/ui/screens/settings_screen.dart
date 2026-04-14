import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_state.dart';
import '../../services/server_config.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  static const _accent = Color(0xFF06C167);

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final config = appState.config;

    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 48, 20, 0),
              child: const Text('Settings',
                  style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 32,
                      letterSpacing: -1.5,
                      color: Colors.black)),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionTitle('Appearance'),
                  _buildSettingCard(
                    child: Column(
                      children: [
                        _buildDropdownSetting<ThemeMode>(
                          label: 'Theme Mode',
                          value: config.themeMode,
                          items: [
                            const DropdownMenuItem(value: ThemeMode.system, child: Text('System')),
                            const DropdownMenuItem(value: ThemeMode.light, child: Text('Light')),
                            const DropdownMenuItem(value: ThemeMode.dark, child: Text('Dark')),
                          ],
                          onChanged: (val) => val != null ? appState.setThemeMode(val) : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildSectionTitle('Playback'),
                  _buildSettingCard(
                    child: Column(
                      children: [
                        _buildSliderSetting(
                          label: 'Crossfade Duration',
                          value: config.crossfadeDuration.toDouble(),
                          min: 0,
                          max: 12,
                          divisions: 12,
                          unit: 's',
                          onChanged: (val) => appState.setCrossfadeDuration(val.toInt()),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildSectionTitle('Connectivity'),
                  _buildSettingCard(
                    child: Column(
                      children: [
                        ListTile(
                          title: const Text('Server URL', style: TextStyle(color: Colors.black87)),
                          subtitle: Text(ServerConfig.baseUrl, style: const TextStyle(color: Color(0xFF888888))),
                          trailing: const Icon(Icons.chevron_right, color: Color(0xFFBBBBBB)),
                          onTap: () => _showServerUrlDialog(context, appState),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildSectionTitle('Storage'),
                  _buildSettingCard(
                    child: Column(
                      children: [
                        ListTile(
                          title: const Text('Library Size', style: TextStyle(color: Colors.black87)),
                          subtitle: Text('${appState.library.length} tracks', style: const TextStyle(color: Color(0xFF888888))),
                          trailing: const Text('Calculate size...', style: TextStyle(color: _accent)),
                        ),
                        const Divider(color: Color(0xFFEEEEEE)),
                        ListTile(
                          title: const Text('Downloads', style: TextStyle(color: Colors.black87)),
                          subtitle: Text('${appState.downloads.length} items in history', style: const TextStyle(color: Color(0xFF888888))),
                          trailing: TextButton(
                            onPressed: () {},
                            child: const Text('Clear', style: TextStyle(color: Color(0xFFE53E3E))),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(title, style: const TextStyle(fontSize: 12, color: _accent, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
    );
  }

  Widget _buildSettingCard({required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8F8F8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEEEEEE)),
      ),
      child: child,
    );
  }

  Widget _buildDropdownSetting<T>({
    required String label,
    required T value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    return ListTile(
      title: Text(label, style: const TextStyle(color: Colors.black87)),
      trailing: DropdownButton<T>(
        value: value,
        items: items,
        onChanged: onChanged,
        underline: const SizedBox(),
        dropdownColor: Colors.white,
        style: const TextStyle(color: Colors.black87, fontSize: 14),
      ),
    );
  }

  Widget _buildSliderSetting({
    required String label,
    required double value,
    required double min,
    required double max,
    int? divisions,
    required String unit,
    required ValueChanged<double> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ListTile(
          title: Text(label, style: const TextStyle(color: Colors.black87)),
          trailing: Text('${value.toInt()}$unit', style: const TextStyle(fontWeight: FontWeight.bold, color: _accent)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            onChanged: onChanged,
            activeColor: _accent,
            inactiveColor: const Color(0xFFE0E0E0),
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  void _showServerUrlDialog(BuildContext context, AppState appState) {
    final controller = TextEditingController(text: ServerConfig.baseUrl);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Server URL', style: TextStyle(color: Colors.black)),
        content: TextField(
          controller: controller,
          style: const TextStyle(color: Colors.black87),
          decoration: InputDecoration(
            hintText: 'http://10.0.2.2:3000',
            hintStyle: const TextStyle(color: Color(0xFFBBBBBB)),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _accent),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF888888))),
          ),
          ElevatedButton(
            onPressed: () {
              appState.setServerUrl(controller.text);
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _accent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
