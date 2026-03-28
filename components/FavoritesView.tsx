'use client';

import { useMusicStore } from '@/store/musicStore';
import TrackCard from './TrackCard';
import { Heart, Music2 } from 'lucide-react';

export default function FavoritesView() {
  const { library, favorites } = useMusicStore();

  const favoriteTracks = library.filter((t) => favorites.includes(t.id));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        className="responsive-padding"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
          paddingBottom: 0,
        }}
      >
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1px', marginBottom: 4, color: 'var(--text)' }}>
            Favorites
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            {favoriteTracks.length} {favoriteTracks.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="responsive-padding" style={{ flex: 1, overflow: 'auto' }}>
        {favoriteTracks.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60vh',
              gap: 16,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <Heart size={32} color="var(--text-faint)" />
            </div>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 6, letterSpacing: '-0.3px' }}>
                No favorites yet
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 280 }}>
                Click the heart icon on any track to add it to your favorites.
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 14,
            }}
          >
            {favoriteTracks.map((track, i) => (
              <TrackCard key={track.id} track={track} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
