import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_state.dart';
import '../../services/permission_service.dart';
import '../../services/audio_service.dart';
import 'home_screen.dart';
import 'favorites_screen.dart';
import 'queue_view.dart';
import 'downloads_screen.dart';
import 'search_screen.dart';
import '../widgets/now_playing_bar.dart';
import '../widgets/download_bottom_sheet.dart';

class MainWrapper extends StatefulWidget {
  const MainWrapper({super.key});

  @override
  State<MainWrapper> createState() => _MainWrapperState();
}

class _MainWrapperState extends State<MainWrapper> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey();

  static const _accent = Color(0xFF06C167);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initPermissions();
      final audio = context.read<AudioService>();
      audio.playbackError.addListener(() {
        final err = audio.playbackError.value;
        if (err != null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(err),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.only(bottom: 80, left: 16, right: 16),
          ));
        }
      });
    });
  }

  Future<void> _initPermissions() async {
    final granted = await PermissionService.checkPermissions();
    if (granted) return; // Already have permissions
    if (!mounted) return;

    // Show a proper permission dialog
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _PermissionDialog(
        onGranted: () => Navigator.of(ctx).pop(),
      ),
    );
  }

  // Search uses index 4 but ActiveView has no search entry — handled via _showSearch flag
  bool _showSearch = false;

  ActiveView _viewFromIndex(int i) {
    switch (i) {
      case 0:
        return ActiveView.library;
      case 1:
        return ActiveView.favorites;
      case 2:
        return ActiveView.queue;
      case 3:
        return ActiveView.downloads;
      default:
        return ActiveView.library;
    }
  }

  int _indexFromView(ActiveView v) {
    switch (v) {
      case ActiveView.library:
        return 0;
      case ActiveView.favorites:
        return 1;
      case ActiveView.queue:
        return 2;
      case ActiveView.downloads:
        return 3;
    }
  }

  Widget _buildScreen(ActiveView view) {
    switch (view) {
      case ActiveView.library:
        return const HomeScreen();
      case ActiveView.favorites:
        return const FavoritesScreen();
      case ActiveView.queue:
        return const QueueView();
      case ActiveView.downloads:
        return const DownloadsScreen();
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final activeView = appState.activeView;
    final playlists = appState.playlists;
    final pendingCount = appState.pendingDownloadsCount;

    return Scaffold(
      key: _scaffoldKey,
      // ── Playlist Drawer ────────────────────────────────────────────────
      drawer: _PlaylistDrawer(
        appState: appState,
        onClose: () => _scaffoldKey.currentState?.closeDrawer(),
      ),

      body: Stack(
        children: [
          // Main screens (library, favorites, queue, downloads)
          Offstage(
            offstage: _showSearch,
            child: IndexedStack(
              index: _indexFromView(activeView),
              children: ActiveView.values
                  .map((v) => _buildScreen(v))
                  .toList(),
            ),
          ),

          // Search screen overlay
          if (_showSearch) const SearchScreen(),

          // NowPlaying bar sits above the bottom nav
          const Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: NowPlayingBar(),
          ),
        ],
      ),

      // ── Bottom Nav ─────────────────────────────────────────────────────
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            decoration: const BoxDecoration(
              color: Color(0xFF000000),
              border: Border(top: BorderSide(color: Color(0xFF1E1E1E))),
            ),
            child: Row(
              children: [
                // Playlist drawer toggle
                _NavPlaylistBtn(
                  hasPlaylists: playlists.isNotEmpty,
                  hasActivePlaylist: appState.activePlaylistId != null,
                  onTap: () => _scaffoldKey.currentState?.openDrawer(),
                ),

                Expanded(
                  child: BottomNavigationBar(
                    currentIndex:
                        _showSearch ? 4 : _indexFromView(activeView),
                    onTap: (i) {
                      if (i == 4) {
                        setState(() => _showSearch = true);
                      } else {
                        setState(() => _showSearch = false);
                        appState.setActiveView(_viewFromIndex(i));
                      }
                    },
                    backgroundColor: Colors.transparent,
                    elevation: 0,
                    selectedFontSize: 11,
                    unselectedFontSize: 11,
                    items: [
                      const BottomNavigationBarItem(
                        icon: Icon(Icons.library_music_outlined),
                        activeIcon: Icon(Icons.library_music),
                        label: 'Library',
                      ),
                      const BottomNavigationBarItem(
                        icon: Icon(Icons.favorite_border_rounded),
                        activeIcon: Icon(Icons.favorite_rounded),
                        label: 'Favorites',
                      ),
                      const BottomNavigationBarItem(
                        icon: Icon(Icons.queue_music_rounded),
                        activeIcon: Icon(Icons.queue_music),
                        label: 'Queue',
                      ),
                      BottomNavigationBarItem(
                        icon: Badge(
                          isLabelVisible: pendingCount > 0,
                          label: Text('$pendingCount'),
                          backgroundColor: _accent,
                          textColor: Colors.black,
                          child: const Icon(Icons.download_outlined),
                        ),
                        activeIcon: const Icon(Icons.download_rounded),
                        label: 'Downloads',
                      ),
                      const BottomNavigationBarItem(
                        icon: Icon(Icons.search_outlined),
                        activeIcon: Icon(Icons.search_rounded),
                        label: 'Search',
                      ),
                    ],
                  ),
                ),

                // Add from URL quick button
                _NavAddBtn(
                  onTap: () => DownloadBottomSheet.show(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Nav helper widgets ───────────────────────────────────────────────────────

class _NavPlaylistBtn extends StatelessWidget {
  final bool hasPlaylists;
  final bool hasActivePlaylist;
  final VoidCallback onTap;

  const _NavPlaylistBtn(
      {required this.hasPlaylists,
      required this.hasActivePlaylist,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Icon(
          Icons.library_books_rounded,
          size: 24,
          color: hasActivePlaylist
              ? const Color(0xFF06C167)
              : Colors.white38,
        ),
      ),
    );
  }
}

class _NavAddBtn extends StatelessWidget {
  final VoidCallback onTap;
  const _NavAddBtn({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8),
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF06C167), Color(0xFF00FF85)],
          ),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(Icons.add_rounded,
            color: Colors.black, size: 20),
      ),
    );
  }
}

// ─── Playlist Drawer ──────────────────────────────────────────────────────────

class _PlaylistDrawer extends StatefulWidget {
  final AppState appState;
  final VoidCallback onClose;

  const _PlaylistDrawer(
      {required this.appState, required this.onClose});

  @override
  State<_PlaylistDrawer> createState() => _PlaylistDrawerState();
}

class _PlaylistDrawerState extends State<_PlaylistDrawer> {
  bool _isCreating = false;
  final _nameCtrl = TextEditingController();

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = widget.appState;
    final playlists = appState.playlists;
    final activeId = appState.activePlaylistId;
    final library = appState.library;

    return Drawer(
      backgroundColor: const Color(0xFF0A0A0A),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Playlists',
                      style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 22,
                          letterSpacing: -0.5)),
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () =>
                            setState(() => _isCreating = !_isCreating),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: const Color(0xFF06C167)
                                .withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: const Color(0xFF06C167)
                                    .withValues(alpha: 0.2)),
                          ),
                          child: const Icon(Icons.add_rounded,
                              color: Color(0xFF06C167), size: 18),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Create new
            if (_isCreating) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _nameCtrl,
                        autofocus: true,
                        style: const TextStyle(
                            color: Colors.white, fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'Playlist name…',
                          hintStyle: const TextStyle(
                              color: Color(0xFF444444)),
                          filled: true,
                          fillColor: const Color(0xFF1A1A1A),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide.none),
                        ),
                        onSubmitted: (name) async {
                          if (name.trim().isEmpty) return;
                          await appState.createPlaylist(name.trim());
                          _nameCtrl.clear();
                          setState(() => _isCreating = false);
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () =>
                          setState(() => _isCreating = false),
                      child: const Icon(Icons.close_rounded,
                          color: Colors.white38),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),

            // All Library item
            _DrawerItem(
              icon: Icons.library_music_outlined,
              label: 'All Library',
              subtitle: '${library.length} tracks',
              isActive: activeId == null &&
                  appState.activeView == ActiveView.library,
              onTap: () {
                appState.setActivePlaylist(null);
                appState.setActiveView(ActiveView.library);
                widget.onClose();
              },
            ),

            if (playlists.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text('MY PLAYLISTS',
                    style: TextStyle(
                        color: Color(0xFF555555),
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0)),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: playlists.length,
                  itemBuilder: (ctx, i) {
                    final p = playlists[i];
                    final isActive = activeId == p.id;
                    final trackCount = library
                        .where((t) => t.playlistId == p.id)
                        .length;
                    return _DrawerItem(
                      icon: Icons.folder_rounded,
                      label: p.name,
                      subtitle: '$trackCount tracks',
                      isActive: isActive,
                      trailing: isActive
                          ? GestureDetector(
                              onTap: () =>
                                  appState.deletePlaylist(p.id),
                              child: const Icon(Icons.delete_outline,
                                  size: 18,
                                  color: Color(0xFFE53E3E)),
                            )
                          : null,
                      onTap: () {
                        appState.setActivePlaylist(p.id);
                        widget.onClose();
                      },
                    );
                  },
                ),
              ),
            ] else
              const Expanded(
                child: Center(
                  child: Text('No playlists yet.\nTap + to create one.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: Color(0xFF555555), fontSize: 13)),
                ),
              ),

            // Bottom add from URL button
            Padding(
              padding: const EdgeInsets.all(16),
              child: GestureDetector(
                onTap: () {
                  widget.onClose();
                  DownloadBottomSheet.show(context);
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [Color(0xFF06C167), Color(0xFF00FF85)]),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_rounded,
                          color: Colors.black, size: 18),
                      SizedBox(width: 8),
                      Text('Add from URL',
                          style: TextStyle(
                              color: Colors.black,
                              fontWeight: FontWeight.w800,
                              fontSize: 14)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final bool isActive;
  final Widget? trailing;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.label,
    this.subtitle,
    required this.isActive,
    this.trailing,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          gradient: isActive
              ? const LinearGradient(
                  colors: [Color(0xFF06C167), Color(0xFF00FF85)])
              : null,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 18,
                color: isActive ? Colors.black : Colors.white54),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          color: isActive ? Colors.black : Colors.white,
                          fontWeight: isActive
                              ? FontWeight.w800
                              : FontWeight.w500,
                          fontSize: 14)),
                  if (subtitle != null)
                    Text(subtitle!,
                        style: TextStyle(
                            color: isActive
                                ? Colors.black54
                                : const Color(0xFF666666),
                            fontSize: 11)),
                ],
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
      ),
    );
  }
}

// ─── Permission Dialog ────────────────────────────────────────────────────────

class _PermissionDialog extends StatefulWidget {
  final VoidCallback onGranted;
  const _PermissionDialog({required this.onGranted});

  @override
  State<_PermissionDialog> createState() => _PermissionDialogState();
}

class _PermissionDialogState extends State<_PermissionDialog> {
  bool _requesting = false;

  Future<void> _requestPermissions() async {
    setState(() => _requesting = true);
    final granted = await PermissionService.requestStoragePermissions();
    setState(() => _requesting = false);

    if (granted) {
      widget.onGranted();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Permission denied. Tap "Open Settings" to grant manually.'),
          backgroundColor: Color(0xFFE53935),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF111111),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF06C167), Color(0xFF00FF85)],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.folder_rounded,
                  color: Colors.black, size: 32),
            ),
            const SizedBox(height: 20),

            // Title
            const Text(
              'Storage Permission',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 20,
                letterSpacing: -0.5,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),

            // Description
            Text(
              'Wavelength needs storage access to save downloaded songs to your device so you can listen offline.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.6),
                fontSize: 14,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),

            // Grant button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _requesting ? null : _requestPermissions,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF06C167),
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: _requesting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.black),
                      )
                    : const Text('Grant Access',
                        style: TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 15)),
              ),
            ),
            const SizedBox(height: 10),

            // Open Settings button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: TextButton(
                onPressed: () => PermissionService.openAppInfo(),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white54,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: Color(0xFF2A2A2A)),
                  ),
                ),
                child: const Text('Open Settings',
                    style: TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14)),
              ),
            ),
            const SizedBox(height: 10),

            // Skip button (allow using without download)
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(
                'Skip for now',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.3),
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
