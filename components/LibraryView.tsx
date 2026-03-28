'use client';

import { useMusicStore } from '@/store/musicStore';
import TrackCard from './TrackCard';
import { Plus, Search, Music2 } from 'lucide-react';
import { useState } from 'react';

export default function LibraryView() {
  const { library, setShowDownloadModal } = useMusicStore();
  const [search, setSearch] = useState('');

  const filtered = library.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.artist.toLowerCase().includes(search.toLowerCase()) ||
      t.album.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.5px', marginBottom: 2 }}>
            Library
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {library.length} {library.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>

        {library.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '9px 14px',
              flex: '0 0 240px',
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                flex: 1,
              }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="responsive-padding" style={{ flex: 1, overflow: 'auto' }}>
        {library.length === 0 ? (
          <EmptyState onAdd={() => setShowDownloadModal(true)} />
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: 'var(--text-muted)',
              gap: 8,
            }}
          >
            <Search size={24} color="var(--text-faint)" />
            <p style={{ fontSize: 14 }}>No tracks match &quot;{search}&quot;</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 14,
            }}
          >
            {filtered.map((track, i) => (
              <TrackCard key={track.id} track={track} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
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
        <Music2 size={32} color="var(--text-faint)" />
      </div>
      <div>
        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 6, letterSpacing: '-0.3px' }}>
          Your library is empty
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 280 }}>
          Paste a YouTube, SoundCloud, or Bandcamp URL to download music directly to your library.
        </p>
      </div>
      <button
        onClick={onAdd}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 20px',
          background: 'var(--accent)',
          color: '#000',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          marginTop: 4,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <Plus size={16} />
        Add from URL
      </button>
    </div>
  );
}
