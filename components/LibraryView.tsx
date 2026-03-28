'use client';

import { useMusicStore } from '@/store/musicStore';
import TrackCard from './TrackCard';
import { Plus, Search, Music2, ArrowUpDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Track } from '@/types';

type SortOption = 'recent' | 'title' | 'artist' | 'duration';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'artist', label: 'Artist A–Z' },
  { value: 'duration', label: 'Duration' },
];

function sortTracks(tracks: Track[], sortBy: SortOption): Track[] {
  const sorted = [...tracks];
  switch (sortBy) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'artist':
      return sorted.sort((a, b) => a.artist.localeCompare(b.artist));
    case 'duration':
      return sorted.sort((a, b) => b.duration - a.duration);
    case 'recent':
    default:
      return sorted.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }
}

export default function LibraryView() {
  const { library, setShowDownloadModal } = useMusicStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const filtered = useMemo(() => {
    const searched = library.filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.artist.toLowerCase().includes(search.toLowerCase()) ||
        t.album.toLowerCase().includes(search.toLowerCase())
    );
    return sortTracks(searched, sortBy);
  }, [library, search, sortBy]);

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
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1px', marginBottom: 4, color: 'var(--text)' }}>
            Library
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            {library.length} {library.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>

        {library.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Sort dropdown */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--surface2)',
                border: '1px solid transparent',
                borderRadius: '99px',
                padding: '8px 16px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
            >
              <ArrowUpDown size={13} color="var(--text-muted)" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort tracks"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 12,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  appearance: 'none',
                  paddingRight: 4,
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--surface2)',
                border: '1px solid transparent',
                borderRadius: '99px',
                padding: '10px 16px',
                flex: '0 0 240px',
                transition: 'background 0.2s, border 0.2s',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid color-mix(in srgb, var(--accent) 30%, transparent)'; e.currentTarget.style.background = 'var(--surface)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'var(--surface2)'; }}
            >
              <Search size={16} color="var(--text-muted)" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search library..."
                aria-label="Search tracks"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  flex: 1,
                }}
              />
            </div>
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
