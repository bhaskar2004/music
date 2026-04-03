import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/track.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../widgets/track_tile.dart';
import '../widgets/server_settings_dialog.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchCtrl = TextEditingController();
  bool _isSearchOpen = false;
  bool _isSortOpen = false;


  static const _sortLabels = {
    SortOption.recent: 'Recently Added',
    SortOption.title: 'Title A–Z',
    SortOption.artist: 'Artist A–Z',
    SortOption.duration: 'Duration',
  };

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _playAll(BuildContext context, List<Track> tracks) {
    if (tracks.isEmpty) return;
    final audio = context.read<AudioService>();
    audio.playAll(tracks);
  }

  void _shufflePlay(BuildContext context, List<Track> tracks) {
    if (tracks.isEmpty) return;
    final shuffled = [...tracks]..shuffle();
    context.read<AudioService>().playAll(shuffled);
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final tracks = appState.filteredTracks;
    final isInPlaylist = appState.activePlaylistId != null;
    final isAddingSongs = appState.isAddingSongs;
    final isSelection = appState.isSelectionMode;
    final selectedCount = appState.selectedIds.length;
    final activePlaylist = appState.activePlaylist;
    final playlists = appState.playlists;

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            CustomScrollView(
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              slivers: [
                // ── Header ─────────────────────────────────────────────────
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ShaderMask(
                                  shaderCallback: (b) =>
                                      const LinearGradient(colors: [
                                    Color(0xFF06C167),
                                    Color(0xFF00FF85)
                                  ]).createShader(b),
                                  child: Text(
                                    isAddingSongs
                                        ? 'Add Songs'
                                        : activePlaylist?.name ?? 'Library',
                                    style: const TextStyle(
                                        fontSize: 32,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -1.5),
                                  ),
                                ),
                                Text(
                                  '${tracks.length} ${tracks.length == 1 ? 'track' : 'tracks'}',
                                  style: const TextStyle(
                                      color: Color(0xFF888888),
                                      fontSize: 13),
                                ),
                              ],
                            ),

                            // Sort & Search row
                            Row(
                              children: [
                                // Search toggle
                                _IconBtn(
                                  icon: _isSearchOpen
                                      ? Icons.close_rounded
                                      : Icons.search_rounded,
                                  onTap: () {
                                    setState(() {
                                      _isSearchOpen = !_isSearchOpen;
                                      if (!_isSearchOpen) {
                                        _searchCtrl.clear();
                                        appState.setSearchQuery('');
                                      }
                                    });
                                  },
                                ),
                                const SizedBox(width: 8),

                                // Sync button (added)
                                _IconBtn(
                                  icon: Icons.sync_rounded,
                                  onTap: () {
                                    appState.syncWithServer();
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Syncing with server...'), duration: Duration(seconds: 1)),
                                    );
                                  },
                                ),
                                const SizedBox(width: 8),

                                // Settings toggle
                                _IconBtn(
                                  icon: Icons.settings_outlined,
                                  onTap: () => ServerSettingsDialog.show(context),
                                ),
                                const SizedBox(width: 8),

                                // Sort dropdown
                                _SortButton(
                                  label: _sortLabels[appState.sortBy]!,
                                  isOpen: _isSortOpen,
                                  onTap: () =>
                                      setState(() => _isSortOpen = !_isSortOpen),
                                ),
                              ],
                            ),
                          ],
                        ),

                        // Sort options dropdown
                        if (_isSortOpen) ...[
                          const SizedBox(height: 8),
                          _SortDropdown(
                            selected: appState.sortBy,
                            labels: _sortLabels,
                            onSelect: (s) {
                              appState.setSortBy(s);
                              setState(() => _isSortOpen = false);
                            },
                          ),
                        ],

                        // Search input
                        if (_isSearchOpen) ...[
                          const SizedBox(height: 12),
                          _SearchBar(
                            controller: _searchCtrl,
                            onChanged: appState.setSearchQuery,
                          ),
                        ],

                        const SizedBox(height: 16),

                        // Action buttons
                        if (appState.library.isNotEmpty)
                          _ActionBar(
                            isInPlaylist: isInPlaylist,
                            isAddingSongs: isAddingSongs,
                            isSelectionMode: isSelection,
                            playlistName: activePlaylist?.name,
                            hasPlaylists: playlists.isNotEmpty,
                            onPlayAll: () => _playAll(context, tracks),
                            onShuffle: () => _shufflePlay(context, tracks),
                            onAddSongs: appState.startAddingSongs,
                            onSelect: () => appState.setSelectionMode(true),
                            onCancel: appState.cancelAddingSongs,
                          ),
                      ],
                    ),
                  ),
                ),

                // ── Empty state ────────────────────────────────────────────
                if (appState.library.isEmpty)
                  const SliverFillRemaining(child: _EmptyState())
                else if (tracks.isEmpty)
                  SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.search_off_rounded,
                              color: Color(0xFF444444), size: 40),
                          const SizedBox(height: 12),
                          Text(
                            'No tracks match "${appState.searchQuery}"',
                            style: const TextStyle(
                                color: Color(0xFF888888), fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  // ── Grid ─────────────────────────────────────────────────
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                    sliver: SliverGrid(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) => TrackTile(
                          track: tracks[i],
                        ),
                        childCount: tracks.length,
                      ),
                      gridDelegate:
                          const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 180,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 0.72,
                      ),
                    ),
                  ),
              ],
            ),

            // ── Bulk Action Bar ─────────────────────────────────────────────
            if (selectedCount > 0)
              Positioned(
                bottom: 16,
                left: 24,
                right: 24,
                child: _BulkActionBar(
                  count: selectedCount,
                  isAddingSongs: isAddingSongs,
                  isInPlaylist: isInPlaylist,
                  activePlaylistName: activePlaylist?.name ?? '',
                  playlists: appState.playlists
                      .map((p) => MapEntry(p.id, p.name))
                      .toList(),
                  onCancel: appState.cancelAddingSongs,
                  onAddToCurrentPlaylist: () =>
                      appState.bulkAddTracksToPlaylist(appState.activePlaylistId!),
                  onMoveToPlaylist: (id) => appState.bulkAddTracksToPlaylist(id),
                  onRemoveFromPlaylist: () async {
                    for (final trackId in appState.selectedIds) {
                      await appState.toggleTrackInPlaylist(trackId, appState.activePlaylistId!);
                    }
                    appState.setSelectionMode(false);
                  },
                  onAddToQueue: () {
                    final audio = context.read<AudioService>();
                    for (final id in appState.selectedIds) {
                      final t = appState.library
                          .cast<Track?>()
                          .firstWhere((t) => t?.id == id, orElse: () => null);
                      if (t != null) audio.addToQueue(t);
                    }
                    appState.setSelectionMode(false);
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Sub-widgets ──────────────────────────────────────────────────────────────

class _IconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _IconBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: const Color(0xFF1A1A1A),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFF2A2A2A)),
        ),
        child: Icon(icon, size: 18, color: Colors.white70),
      ),
    );
  }
}

class _SortButton extends StatelessWidget {
  final String label;
  final bool isOpen;
  final VoidCallback onTap;
  const _SortButton(
      {required this.label, required this.isOpen, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isOpen ? const Color(0xFF1E1E1E) : const Color(0xFF1A1A1A),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
              color: isOpen
                  ? const Color(0xFF06C167)
                  : const Color(0xFF2A2A2A)),
        ),
        child: Row(
          children: [
            Icon(Icons.swap_vert_rounded,
                size: 15,
                color: isOpen ? const Color(0xFF06C167) : Colors.white54),
            const SizedBox(width: 5),
            Text(label,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color:
                        isOpen ? const Color(0xFF06C167) : Colors.white70)),
            const SizedBox(width: 4),
            Icon(
              isOpen
                  ? Icons.keyboard_arrow_up_rounded
                  : Icons.keyboard_arrow_down_rounded,
              size: 14,
              color: isOpen ? const Color(0xFF06C167) : Colors.white38,
            ),
          ],
        ),
      ),
    );
  }
}

class _SortDropdown extends StatelessWidget {
  final SortOption selected;
  final Map<SortOption, String> labels;
  final void Function(SortOption) onSelect;
  const _SortDropdown(
      {required this.selected, required this.labels, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A1A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF2A2A2A)),
      ),
      child: Column(
        children: SortOption.values.map((opt) {
          final isSelected = selected == opt;
          return GestureDetector(
            onTap: () => onSelect(opt),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    labels[opt]!,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: isSelected
                            ? FontWeight.w700
                            : FontWeight.w500,
                        color: isSelected
                            ? const Color(0xFF06C167)
                            : Colors.white70),
                  ),
                  if (isSelected)
                    const Icon(Icons.check_rounded,
                        size: 16, color: Color(0xFF06C167)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final void Function(String) onChanged;
  const _SearchBar(
      {required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A1A),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: const Color(0xFF2A2A2A)),
      ),
      child: Row(
        children: [
          const Icon(Icons.search_rounded,
              size: 18, color: Color(0xFF888888)),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Search library…',
                hintStyle:
                    TextStyle(color: Color(0xFF444444), fontSize: 14),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionBar extends StatelessWidget {
  final bool isInPlaylist;
  final bool isAddingSongs;
  final bool isSelectionMode;
  final String? playlistName;
  final bool hasPlaylists;
  final VoidCallback onPlayAll;
  final VoidCallback onShuffle;
  final VoidCallback onAddSongs;
  final VoidCallback onSelect;
  final VoidCallback onCancel;

  const _ActionBar({
    required this.isInPlaylist,
    required this.isAddingSongs,
    required this.isSelectionMode,
    required this.playlistName,
    required this.hasPlaylists,
    required this.onPlayAll,
    required this.onShuffle,
    required this.onAddSongs,
    required this.onSelect,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _Pill(
          icon: Icons.play_arrow_rounded,
          label: 'Play All',
          isPrimary: true,
          onTap: onPlayAll,
        ),
        _Pill(
          icon: Icons.shuffle_rounded,
          label: 'Shuffle',
          onTap: onShuffle,
        ),
        if (isInPlaylist && !isAddingSongs)
          _Pill(
            icon: Icons.add_rounded,
            label: 'Add Songs',
            accent: true,
            onTap: onAddSongs,
          ),
        if (!isInPlaylist && !isSelectionMode)
          _Pill(
            icon: Icons.check_box_outlined,
            label: 'Select',
            onTap: onSelect,
          ),
        if (isSelectionMode || isAddingSongs)
          _Pill(
            icon: Icons.close_rounded,
            label: 'Cancel',
            muted: true,
            onTap: onCancel,
          ),
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isPrimary;
  final bool accent;
  final bool muted;
  final VoidCallback onTap;

  const _Pill({
    required this.icon,
    required this.label,
    this.isPrimary = false,
    this.accent = false,
    this.muted = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color bg = const Color(0xFF1E1E1E);
    Color fg = Colors.white70;
    BorderSide border = const BorderSide(color: Color(0xFF2A2A2A));

    if (isPrimary) {
      bg = Colors.white;
      fg = Colors.black;
      border = BorderSide.none;
    } else if (accent) {
      bg = const Color(0xFF06C167).withValues(alpha: 0.1);
      fg = const Color(0xFF06C167);
      border = BorderSide(
          color: const Color(0xFF06C167).withValues(alpha: 0.2));
    } else if (muted) {
      bg = Colors.white.withValues(alpha: 0.05);
      fg = Colors.white38;
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(99),
          border: Border.fromBorderSide(border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: fg),
            const SizedBox(width: 5),
            Text(label,
                style: TextStyle(
                    color: fg,
                    fontWeight: FontWeight.w700,
                    fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _BulkActionBar extends StatelessWidget {
  final int count;
  final bool isAddingSongs;
  final bool isInPlaylist;
  final String activePlaylistName;
  final List<MapEntry<String, String>> playlists;
  final VoidCallback onCancel;
  final VoidCallback onAddToCurrentPlaylist;
  final void Function(String) onMoveToPlaylist;
  final VoidCallback onRemoveFromPlaylist;
  final VoidCallback onAddToQueue;

  const _BulkActionBar({
    required this.count,
    required this.isAddingSongs,
    required this.isInPlaylist,
    required this.activePlaylistName,
    required this.playlists,
    required this.onCancel,
    required this.onAddToCurrentPlaylist,
    required this.onMoveToPlaylist,
    required this.onRemoveFromPlaylist,
    required this.onAddToQueue,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.6),
                  blurRadius: 24,
                  spreadRadius: 4),
            ],
          ),
          child: Row(
            children: [
              Text('$count selected',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 14)),
              Container(
                  width: 1,
                  height: 20,
                  color: Colors.white12,
                  margin: const EdgeInsets.symmetric(horizontal: 14)),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      if (isAddingSongs && isInPlaylist)
                        _BarBtn(
                          icon: Icons.add_rounded,
                          label: 'Add to $activePlaylistName',
                          primary: true,
                          onTap: onAddToCurrentPlaylist,
                        )
                      else ...[
                        _BarBtn(
                          icon: Icons.queue_music_rounded,
                          label: 'Add to Queue',
                          onTap: onAddToQueue,
                        ),
                        if (playlists.isNotEmpty)
                          ...playlists.map(
                            (p) => Padding(
                              padding: const EdgeInsets.only(left: 8),
                              child: _BarBtn(
                                icon: Icons.folder_rounded,
                                label: p.value,
                                onTap: () => onMoveToPlaylist(p.key),
                              ),
                            ),
                          ),
                        if (isInPlaylist && !isAddingSongs)
                          Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: _BarBtn(
                              icon: Icons.folder_off_rounded,
                              label: 'Remove from playlist',
                              danger: true,
                              onTap: onRemoveFromPlaylist,
                            ),
                          ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onCancel,
                child: const Icon(Icons.close_rounded,
                    size: 18, color: Colors.white38),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BarBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool primary;
  final bool danger;
  final VoidCallback onTap;

  const _BarBtn({
    required this.icon,
    required this.label,
    this.primary = false,
    this.danger = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color bg = Colors.transparent;
    Color fg = Colors.white60;
    if (primary) {
      bg = const Color(0xFF06C167);
      fg = Colors.black;
    } else if (danger) {
      fg = const Color(0xFFE53E3E).withValues(alpha: 0.8);
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: fg),
            const SizedBox(width: 5),
            Text(label,
                style: TextStyle(
                    fontSize: 12,
                    color: fg,
                    fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A1A),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFF2A2A2A)),
            ),
            child: const Icon(Icons.library_music_outlined,
                color: Color(0xFF444444), size: 38),
          ),
          const SizedBox(height: 20),
          const Text('Your library is empty',
              style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 20,
                  letterSpacing: -0.3)),
          const SizedBox(height: 8),
          const Text(
            'Paste a YouTube or SoundCloud URL\nto download music directly to your library.',
            style: TextStyle(color: Color(0xFF888888), fontSize: 14),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
