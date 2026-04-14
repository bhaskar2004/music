import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_state.dart';
import '../../services/audio_service.dart';
import '../widgets/track_tile.dart';

class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final favorites = appState.favoriteTracks;
    final audio = context.read<AudioService>();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Favorites',
                            style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -1.5,
                                color: Colors.black)),
                        Text(
                          '${favorites.length} ${favorites.length == 1 ? 'track' : 'tracks'}',
                          style: const TextStyle(
                              color: Color(0xFF888888), fontSize: 13),
                        ),
                      ],
                    ),
                    if (favorites.isNotEmpty)
                      Row(
                        children: [
                          _Btn(
                            icon: Icons.play_arrow_rounded,
                            label: 'Play All',
                            primary: true,
                            onTap: () => audio.playAll(favorites),
                          ),
                          const SizedBox(width: 8),
                          _Btn(
                            icon: Icons.shuffle_rounded,
                            label: 'Shuffle',
                            onTap: () {
                              final s = [...favorites]..shuffle();
                              audio.playAll(s);
                            },
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),

            if (favorites.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F5F5),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: const Color(0xFFE8E8E8)),
                        ),
                        child: const Icon(Icons.favorite_border_rounded,
                            color: Color(0xFFCCCCCC), size: 34),
                      ),
                      const SizedBox(height: 18),
                      const Text('No favorites yet',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 20,
                              color: Colors.black)),
                      const SizedBox(height: 8),
                      const Text(
                        'Tap the heart on any track to save it here.',
                        style: TextStyle(
                            color: Color(0xFF888888), fontSize: 14),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                sliver: SliverGrid(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => TrackTile(
                      track: favorites[i],
                    ),
                    childCount: favorites.length,
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
      ),
    );
  }
}

class _Btn extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool primary;
  final VoidCallback onTap;

  const _Btn(
      {required this.icon,
      required this.label,
      this.primary = false,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: primary ? Colors.black : const Color(0xFFF2F2F2),
          borderRadius: BorderRadius.circular(99),
          border: primary
              ? null
              : Border.all(color: const Color(0xFFE8E8E8)),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 14, color: primary ? Colors.white : const Color(0xFF606060)),
            const SizedBox(width: 5),
            Text(label,
                style: TextStyle(
                    color: primary ? Colors.white : const Color(0xFF606060),
                    fontWeight: FontWeight.w700,
                    fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
