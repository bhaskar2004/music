import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_state.dart';
import '../../services/server_config.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final config = appState.config;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CustomScrollView(
        slivers: [
          const SliverAppBar(
            floating: true,
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: Text('Settings', 
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 24)),
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
                          title: const Text('Server URL'),
                          subtitle: Text(ServerConfig.baseUrl),
                          trailing: const Icon(Icons.chevron_right, color: Colors.grey),
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
                          title: const Text('Library Size'),
                          subtitle: Text('${appState.library.length} tracks'),
                          trailing: const Text('Calculate size...', style: TextStyle(color: Colors.blueAccent)),
                        ),
                        const Divider(color: Colors.white10),
                        ListTile(
                          title: const Text('Downloads'),
                          subtitle: Text('${appState.downloads.length} items in history'),
                          trailing: TextButton(
                            onPressed: () {}, // TODO: Clear download history
                            child: const Text('Clear', style: TextStyle(color: Colors.redAccent)),
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
      child: Text(title, style: const TextStyle(fontSize: 14, color: Colors.blueAccent, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
    );
  }

  Widget _buildSettingCard({required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
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
      title: Text(label),
      trailing: DropdownButton<T>(
        value: value,
        items: items,
        onChanged: onChanged,
        underline: const SizedBox(),
        dropdownColor: Colors.grey[900],
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
          title: Text(label),
          trailing: Text('${value.toInt()}$unit', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueAccent)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            onChanged: onChanged,
            activeColor: Colors.blueAccent,
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
        backgroundColor: Colors.grey[900],
        title: const Text('Server URL'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'http://10.0.2.2:3000',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              appState.setServerUrl(controller.text);
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
